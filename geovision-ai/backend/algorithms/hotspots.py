import cv2
import numpy as np
import io
import base64
from PIL import Image

def detect_deforestation_hotspots(container_t1, container_t2, ndvi_res, pixel_resolution_meters: float = 10.0, min_cluster_pixels: int = 15):
    """
    Detects contiguous deforestation hotspots using multi-spectral NDVI differencing
    and OpenCV connected component spatial clustering.
    Ranks hotspots by severity (HIGH, MEDIUM, LOW) based on spatial extent (ha)
    and mean canopy loss (Delta NDVI).
    """
    nir1 = container_t1.nir if container_t1.has_nir else container_t1.green
    red1 = container_t1.red
    nir2 = container_t2.nir if container_t2.has_nir else container_t2.green
    red2 = container_t2.red

    eps = 1e-6
    ndvi1 = (nir1 - red1) / (nir1 + red1 + eps)
    ndvi2 = (nir2 - red2) / (nir2 + red2 + eps)
    delta_ndvi = ndvi2 - ndvi1

    h, w = ndvi1.shape
    pixel_area_ha = (pixel_resolution_meters ** 2) / 10000.0 # 0.01 ha per 10m pixel

    # 1. Deforestation mask: was vegetation/canopy in T1 (NDVI >= 0.35) and dropped significantly
    deforest_mask = ((ndvi1 >= 0.35) & (delta_ndvi <= -0.15)).astype(np.uint8)

    # Clean small noise
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    deforest_mask = cv2.morphologyEx(deforest_mask, cv2.MORPH_OPEN, kernel)

    # 2. Connected Component Spatial Clustering
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(deforest_mask, connectivity=8)

    # Bounds: [lat_min, lon_min, lat_max, lon_max]
    bounds = container_t2.metadata.get("bounds", [12.15, 75.78, 12.38, 76.05])
    lat_min, lon_min, lat_max, lon_max = bounds

    hotspots = []
    # label 0 is background
    for lbl in range(1, num_labels):
        area_pixels = stats[lbl, cv2.CC_STAT_AREA]
        if area_pixels < min_cluster_pixels:
            continue

        area_ha = round(area_pixels * pixel_area_ha, 2)
        cx, cy = centroids[lbl]

        # Convert image grid (cy, cx) to geographic (lat, lon)
        # cy = 0 is lat_max, cy = h is lat_min
        lat_val = round(lat_max - (cy / h) * (lat_max - lat_min), 4)
        lon_val = round(lon_min + (cx / w) * (lon_max - lon_min), 4)

        cluster_mask = (labels == lbl)
        cluster_delta = delta_ndvi[cluster_mask]
        mean_delta = round(float(np.mean(cluster_delta)), 4)
        mean_t1_ndvi = round(float(np.mean(ndvi1[cluster_mask])), 4)
        mean_t2_ndvi = round(float(np.mean(ndvi2[cluster_mask])), 4)

        # Severity categorization
        if area_ha >= 35.0 or mean_delta <= -0.35:
            severity = "HIGH"
            color_hex = "#ef4444" # red
        elif area_ha >= 12.0 or mean_delta <= -0.22:
            severity = "MEDIUM"
            color_hex = "#f97316" # orange
        else:
            severity = "LOW"
            color_hex = "#eab308" # yellow

        hotspots.append({
            "id": f"DEF-HS-{len(hotspots) + 1:02d}",
            "severity": severity,
            "color": color_hex,
            "area_ha": area_ha,
            "pixel_count": int(area_pixels),
            "coordinates": [lat_val, lon_val],
            "bbox_grid": [
                int(stats[lbl, cv2.CC_STAT_LEFT]),
                int(stats[lbl, cv2.CC_STAT_TOP]),
                int(stats[lbl, cv2.CC_STAT_WIDTH]),
                int(stats[lbl, cv2.CC_STAT_HEIGHT])
            ],
            "mean_delta_ndvi": mean_delta,
            "mean_t1_ndvi": mean_t1_ndvi,
            "mean_t2_ndvi": mean_t2_ndvi,
            "canopy_loss_percentage": round(abs(mean_delta / max(mean_t1_ndvi, 0.01)) * 100.0, 1),
            "threat_description": (
                "Severe illegal canopy clearance or intensive logging event" if severity == "HIGH" else
                "Moderate forest thinning or logging track expansion" if severity == "MEDIUM" else
                "Low-density canopy degradation or seasonal drying"
            )
        })

    # Sort descending by area and severity
    severity_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    hotspots.sort(key=lambda x: (severity_order[x["severity"]], x["area_ha"]), reverse=True)

    # 3. Generate Hotspot Heatmap Overlay Image
    overlay_rgb = np.zeros((h, w, 4), dtype=np.uint8) # RGBA
    for hs in hotspots:
        lbl_idx = int(hs["id"].split("-")[-1])
        # Find label
        color = [239, 68, 68, 180] if hs["severity"] == "HIGH" else [249, 115, 22, 170] if hs["severity"] == "MEDIUM" else [234, 179, 8, 160]
        # Draw on overlay
        pts = cv2.findContours((labels == lbl_idx).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
        for c in pts:
            cv2.drawContours(overlay_rgb, [c], -1, color, -1)
            cv2.drawContours(overlay_rgb, [c], -1, [255, 255, 255, 255], 1)

    pil_overlay = Image.fromarray(overlay_rgb, mode="RGBA")
    buf = io.BytesIO()
    pil_overlay.save(buf, format="PNG")
    overlay_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

    total_hotspot_ha = round(sum(h["area_ha"] for h in hotspots), 2)
    high_count = sum(1 for h in hotspots if h["severity"] == "HIGH")
    med_count = sum(1 for h in hotspots if h["severity"] == "MEDIUM")
    low_count = sum(1 for h in hotspots if h["severity"] == "LOW")

    return {
        "total_hotspots_detected": len(hotspots),
        "total_hotspot_area_ha": total_hotspot_ha,
        "severity_summary": {
            "high": high_count,
            "medium": med_count,
            "low": low_count
        },
        "hotspots": hotspots,
        "heatmap_overlay": overlay_b64
    }


def detect_water_depletion_hotspots(container_t1, container_t2, water_res, pixel_resolution_meters: float = 10.0, min_cluster_pixels: int = 15):
    """
    Detects contiguous water body desiccation and reservoir shoreline retreat hotspots
    using NDWI multi-temporal differencing and spatial connected component clustering.
    """
    green1, nir1 = container_t1.green, (container_t1.nir if container_t1.has_nir else container_t1.green)
    green2, nir2 = container_t2.green, (container_t2.nir if container_t2.has_nir else container_t2.green)

    eps = 1e-6
    ndwi1 = (green1 - nir1) / (green1 + nir1 + eps)
    ndwi2 = (green2 - nir2) / (green2 + nir2 + eps)
    delta_ndwi = ndwi2 - ndwi1

    h, w = ndwi1.shape
    pixel_area_ha = (pixel_resolution_meters ** 2) / 10000.0

    # 1. Water depletion mask: was water in T1 (NDWI >= 0.0) and desiccated in T2 (NDWI < 0.0 or severe drop)
    water_loss_mask = ((ndwi1 >= 0.0) & ((ndwi2 < -0.05) | (delta_ndwi <= -0.22))).astype(np.uint8)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    water_loss_mask = cv2.morphologyEx(water_loss_mask, cv2.MORPH_OPEN, kernel)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(water_loss_mask, connectivity=8)

    bounds = container_t2.metadata.get("bounds", [29.35, 53.40, 29.58, 53.75])
    lat_min, lon_min, lat_max, lon_max = bounds

    hotspots = []
    for lbl in range(1, num_labels):
        area_pixels = stats[lbl, cv2.CC_STAT_AREA]
        if area_pixels < min_cluster_pixels:
            continue

        area_ha = round(area_pixels * pixel_area_ha, 2)
        cx, cy = centroids[lbl]

        lat_val = round(lat_max - (cy / h) * (lat_max - lat_min), 4)
        lon_val = round(lon_min + (cx / w) * (lon_max - lon_min), 4)

        cluster_mask = (labels == lbl)
        cluster_delta = delta_ndwi[cluster_mask]
        mean_delta = round(float(np.mean(cluster_delta)), 4)
        mean_t1_ndwi = round(float(np.mean(ndwi1[cluster_mask])), 4)
        mean_t2_ndwi = round(float(np.mean(ndwi2[cluster_mask])), 4)

        if area_ha >= 30.0 or mean_delta <= -0.35:
            severity = "HIGH"
            color_hex = "#dc2626" # crimson red
        elif area_ha >= 10.0 or mean_delta <= -0.20:
            severity = "MEDIUM"
            color_hex = "#ea580c" # orange
        else:
            severity = "LOW"
            color_hex = "#0284c7" # light ocean blue

        hotspots.append({
            "id": f"WTR-HS-{len(hotspots) + 1:02d}",
            "severity": severity,
            "color": color_hex,
            "area_ha": area_ha,
            "pixel_count": int(area_pixels),
            "coordinates": [lat_val, lon_val],
            "bbox_grid": [
                int(stats[lbl, cv2.CC_STAT_LEFT]),
                int(stats[lbl, cv2.CC_STAT_TOP]),
                int(stats[lbl, cv2.CC_STAT_WIDTH]),
                int(stats[lbl, cv2.CC_STAT_HEIGHT])
            ],
            "mean_delta_ndwi": mean_delta,
            "mean_t1_ndwi": mean_t1_ndwi,
            "mean_t2_ndwi": mean_t2_ndwi,
            "depletion_percentage": round(abs(mean_delta / max(mean_t1_ndwi, 0.01)) * 100.0, 1) if mean_t1_ndwi > 0 else 75.0,
            "threat_description": (
                "Severe reservoir shrinkage / exposed dry lakebed" if severity == "HIGH" else
                "Substantial shoreline retraction or littoral wetland loss" if severity == "MEDIUM" else
                "Minor seasonal water boundary contraction"
            )
        })

    severity_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    hotspots.sort(key=lambda x: (severity_order[x["severity"]], x["area_ha"]), reverse=True)

    overlay_rgb = np.zeros((h, w, 4), dtype=np.uint8)
    for hs in hotspots:
        lbl_idx = int(hs["id"].split("-")[-1])
        color = [220, 38, 38, 180] if hs["severity"] == "HIGH" else [234, 88, 12, 170] if hs["severity"] == "MEDIUM" else [2, 132, 199, 160]
        pts = cv2.findContours((labels == lbl_idx).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
        for c in pts:
            cv2.drawContours(overlay_rgb, [c], -1, color, -1)
            cv2.drawContours(overlay_rgb, [c], -1, [255, 255, 255, 255], 1)

    pil_overlay = Image.fromarray(overlay_rgb, mode="RGBA")
    buf = io.BytesIO()
    pil_overlay.save(buf, format="PNG")
    overlay_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

    total_depletion_ha = round(sum(h["area_ha"] for h in hotspots), 2)

    return {
        "total_depletion_hotspots": len(hotspots),
        "total_depletion_area_ha": total_depletion_ha,
        "severity_summary": {
            "high": sum(1 for h in hotspots if h["severity"] == "HIGH"),
            "medium": sum(1 for h in hotspots if h["severity"] == "MEDIUM"),
            "low": sum(1 for h in hotspots if h["severity"] == "LOW")
        },
        "hotspots": hotspots,
        "heatmap_overlay": overlay_b64
    }
