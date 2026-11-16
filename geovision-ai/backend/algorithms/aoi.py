import cv2
import numpy as np
import io
import base64
from PIL import Image

def analyze_custom_aoi(container_t1, container_t2, polygon_coords, pixel_resolution_meters: float = 10.0):
    """
    Performs multi-spectral change detection strictly constrained within a user-drawn
    Area of Interest (AOI) polygon.
    polygon_coords: list of [lat, lon] points defining the closed polygon.
    """
    if not polygon_coords or len(polygon_coords) < 3:
        raise ValueError("A valid AOI polygon requires at least 3 [lat, lon] vertices.")

    h, w = container_t1.height, container_t1.width
    bounds = container_t1.metadata.get("bounds", [12.15, 75.78, 12.38, 76.05])
    lat_min, lon_min, lat_max, lon_max = bounds

    # 1. Transform geographical coordinates [lat, lon] -> Image pixel coordinates [x, y]
    # lat_max is y=0, lat_min is y=h
    # lon_min is x=0, lon_max is x=w
    pts_grid = []
    for pt in polygon_coords:
        lat_val = pt[0] if isinstance(pt, (list, tuple)) else pt.get("lat")
        lon_val = pt[1] if isinstance(pt, (list, tuple)) else pt.get("lon", pt.get("lng"))
        
        # Clamp to bounds
        px = int(np.clip(((lon_val - lon_min) / max(lon_max - lon_min, 1e-6)) * w, 0, w - 1))
        py = int(np.clip(((lat_max - lat_val) / max(lat_max - lat_min, 1e-6)) * h, 0, h - 1))
        pts_grid.append([px, py])

    pts_np = np.array(pts_grid, dtype=np.int32).reshape((-1, 1, 2))

    # 2. Rasterize Polygon Mask
    aoi_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(aoi_mask, [pts_np], 1)

    aoi_pixel_count = int(np.sum(aoi_mask == 1))
    if aoi_pixel_count == 0:
        raise ValueError("Selected AOI polygon falls outside the current satellite imagery boundary.")

    pixel_area_ha = (pixel_resolution_meters ** 2) / 10000.0
    total_aoi_area_ha = round(aoi_pixel_count * pixel_area_ha, 2)

    # 3. Multi-Spectral Calculations Inside AOI
    nir1 = container_t1.nir if container_t1.has_nir else container_t1.green
    red1 = container_t1.red
    green1 = container_t1.green

    nir2 = container_t2.nir if container_t2.has_nir else container_t2.green
    red2 = container_t2.red
    green2 = container_t2.green

    eps = 1e-6
    # NDVI
    ndvi1 = (nir1 - red1) / (nir1 + red1 + eps)
    ndvi2 = (nir2 - red2) / (nir2 + red2 + eps)
    delta_ndvi = ndvi2 - ndvi1

    # NDWI
    ndwi1 = (green1 - nir1) / (green1 + nir1 + eps)
    ndwi2 = (green2 - nir2) / (green2 + nir2 + eps)
    delta_ndwi = ndwi2 - ndwi1

    # Extract masked values
    aoi_bool = (aoi_mask == 1)
    ndvi1_aoi = ndvi1[aoi_bool]
    ndvi2_aoi = ndvi2[aoi_bool]
    ndwi1_aoi = ndwi1[aoi_bool]
    ndwi2_aoi = ndwi2[aoi_bool]
    delta_ndvi_aoi = delta_ndvi[aoi_bool]

    # Forest Extent (NDVI >= 0.40)
    forest_t1_px = int(np.sum((ndvi1 >= 0.40) & aoi_bool))
    forest_t2_px = int(np.sum((ndvi2 >= 0.40) & aoi_bool))
    forest_t1_ha = round(forest_t1_px * pixel_area_ha, 2)
    forest_t2_ha = round(forest_t2_px * pixel_area_ha, 2)
    forest_loss_ha = max(0.0, round(forest_t1_ha - forest_t2_ha, 2))
    forest_loss_pct = round((forest_loss_ha / max(forest_t1_ha, 0.01)) * 100.0, 2) if forest_t1_ha > 0 else 0.0

    # Water Extent (NDWI >= 0.05)
    water_t1_px = int(np.sum((ndwi1 >= 0.05) & aoi_bool))
    water_t2_px = int(np.sum((ndwi2 >= 0.05) & aoi_bool))
    water_t1_ha = round(water_t1_px * pixel_area_ha, 2)
    water_t2_ha = round(water_t2_px * pixel_area_ha, 2)
    water_loss_ha = max(0.0, round(water_t1_ha - water_t2_ha, 2))
    water_loss_pct = round((water_loss_ha / max(water_t1_ha, 0.01)) * 100.0, 2) if water_t1_ha > 0 else 0.0

    # 4. Generate Visual Preview for AOI
    # Dims of bounding rect
    rx, ry, rw, rh = cv2.boundingRect(pts_np)
    # Highlight polygon overlay on true color
    r_disp = np.clip(container_t2.red * 255.0, 0, 255).astype(np.uint8)
    g_disp = np.clip(container_t2.green * 255.0, 0, 255).astype(np.uint8)
    b_disp = np.clip(container_t2.blue * 255.0, 0, 255).astype(np.uint8)
    rgb_full = np.stack([r_disp, g_disp, b_disp], axis=-1)

    # Darken outside AOI
    rgb_masked = (rgb_full * 0.3).astype(np.uint8)
    rgb_masked[aoi_bool] = rgb_full[aoi_bool]
    cv2.polylines(rgb_masked, [pts_np], True, (16, 185, 129), 2) # Emerald border

    # Crop to polygon bounds with small padding
    pad = 10
    crop_x1 = max(0, rx - pad)
    crop_y1 = max(0, ry - pad)
    crop_x2 = min(w, rx + rw + pad)
    crop_y2 = min(h, ry + rh + pad)
    crop_img = rgb_masked[crop_y1:crop_y2, crop_x1:crop_x2]

    pil_crop = Image.fromarray(crop_img)
    pil_crop.thumbnail((500, 500), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    pil_crop.save(buf, format="JPEG", quality=85)
    aoi_preview_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"

    return {
        "status": "success",
        "aoi_metrics": {
            "total_aoi_area_ha": total_aoi_area_ha,
            "aoi_pixels": aoi_pixel_count,
            "vertices_count": len(polygon_coords),
            "polygon_bounds": [
                min(p[0] if isinstance(p, (list, tuple)) else p.get("lat") for p in polygon_coords),
                min(p[1] if isinstance(p, (list, tuple)) else p.get("lon", p.get("lng")) for p in polygon_coords),
                max(p[0] if isinstance(p, (list, tuple)) else p.get("lat") for p in polygon_coords),
                max(p[1] if isinstance(p, (list, tuple)) else p.get("lon", p.get("lng")) for p in polygon_coords),
            ]
        },
        "vegetation_analysis": {
            "forest_t1_ha": forest_t1_ha,
            "forest_t2_ha": forest_t2_ha,
            "forest_loss_ha": forest_loss_ha,
            "forest_loss_percentage": forest_loss_pct,
            "mean_ndvi_t1": round(float(np.mean(ndvi1_aoi)), 4),
            "mean_ndvi_t2": round(float(np.mean(ndvi2_aoi)), 4),
            "mean_delta_ndvi": round(float(np.mean(delta_ndvi_aoi)), 4)
        },
        "water_analysis": {
            "water_t1_ha": water_t1_ha,
            "water_t2_ha": water_t2_ha,
            "water_loss_ha": water_loss_ha,
            "water_loss_percentage": water_loss_pct,
            "mean_ndwi_t1": round(float(np.mean(ndwi1_aoi)), 4),
            "mean_ndwi_t2": round(float(np.mean(ndwi2_aoi)), 4)
        },
        "preview_image": aoi_preview_b64
    }
