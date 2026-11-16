import io
import base64
import numpy as np
from PIL import Image

def compute_water_index(container):
    """
    Computes McFeeters NDWI if NIR is present: (GREEN - NIR) / (GREEN + NIR).
    If RGB only, computes Modified Normalized Difference Blue-Red / Green-Red Water Index
    and clearly labels it as an approximate estimate.
    """
    eps = 1e-6
    if container.has_nir:
        green = container.green
        nir = container.nir
        denom = green + nir
        denom = np.where(denom == 0, eps, denom)
        water_index = (green - nir) / denom
        water_index = np.clip(water_index, -1.0, 1.0)
        index_type = "NDWI"
        index_name = "Normalized Difference Water Index (McFeeters NDWI)"
        is_true_ndwi = True
        explanation = (
            "Calculated using Sentinel-2 Band 3 (Green) and Band 8 (Near-Infrared). "
            "NDWI maximizes reflectance of open water surfaces while suppressing terrestrial vegetation and bare soil features."
        )
    else:
        # RGB Water Approximation
        # Water bodies absorb Red and reflect Blue and Green.
        # We use a combined index: ((Green + Blue)/2 - Red) / ((Green + Blue)/2 + Red)
        # coupled with darkness mask to avoid false positives on bright white/sand objects.
        g = container.green
        b = container.blue
        r = container.red
        gb_mean = (g + b) / 2.0
        denom = gb_mean + r
        denom = np.where(denom == 0, eps, denom)
        water_index = (gb_mean - r) / denom
        water_index = np.clip(water_index, -1.0, 1.0)

        # Suppress bright urban roofs / cloud edges that may have high blue/green
        brightness = (r + g + b) / 3.0
        water_index = np.where(brightness > 0.70, -0.5, water_index)

        index_type = "NDWI (RGB Approx)"
        index_name = "Visible Normalized Water Index (RGB Approximation)"
        is_true_ndwi = False
        explanation = (
            "NOTICE: True NDWI requires multispectral Near-Infrared (NIR) data where water absorption "
            "is near 100%. Because standard RGB photography was uploaded, GeoVision AI used "
            "spectral difference between cyan-blue reflection and red absorption with brightness thresholding. "
            "Turbid water, sediment-laden rivers, or deep terrain shadows may affect accuracy."
        )

    return water_index, index_type, index_name, is_true_ndwi, explanation


def segment_water_bodies(water_index, is_true_ndwi=True):
    """
    Segments open water bodies.
    For true NDWI: threshold >= 0.0 (water typically > 0, land < 0).
    For RGB approx: threshold >= 0.12.
    """
    thresh = 0.05 if is_true_ndwi else 0.12
    return water_index >= thresh


def analyze_water_resources(container_before, container_after, pixel_resolution_meters=10.0):
    """
    Analyzes multi-temporal water resource changes (lakes, reservoirs, rivers, wetlands).
    Generates color-coded change map and quantitative metrics.
    """
    w_before, type_before, name_before, is_true_ndwi, expl_before = compute_water_index(container_before)
    w_after, _, _, _, _ = compute_water_index(container_after)

    # Harmonize shapes if necessary
    if w_before.shape != w_after.shape:
        h, w = w_before.shape
        pil_wa = Image.fromarray(w_after).resize((w, h), Image.Resampling.BILINEAR)
        w_after = np.array(pil_wa)

    water_mask_before = segment_water_bodies(w_before, is_true_ndwi)
    water_mask_after = segment_water_bodies(w_after, is_true_ndwi)

    # Change classifications:
    # 1. Stable water (both dates)
    stable_water = water_mask_before & water_mask_after

    # 2. Reduced water coverage / desiccation / shoreline retreat
    water_lost = water_mask_before & (~water_mask_after)

    # 3. Newly detected water / expansion / inundation
    water_gained = (~water_mask_before) & water_mask_after

    # 4. Non-water regions
    non_water = (~water_mask_before) & (~water_mask_after)

    # Visualization requirement:
    # - Blue: Water bodies (stable)
    # - Red: Reduced water coverage
    # - Cyan: Newly detected water areas
    # - Grey: Non-water regions
    h, w = w_before.shape
    change_map_rgb = np.zeros((h, w, 3), dtype=np.uint8)

    # Grey for non-water (rgb 50, 56, 66)
    change_map_rgb[non_water] = [50, 56, 66]

    # Blue for persistent water bodies (rgb 37, 99, 235)
    change_map_rgb[stable_water] = [37, 99, 235]

    # Red for reduced water coverage (rgb 239, 68, 68)
    change_map_rgb[water_lost] = [239, 68, 68]

    # Cyan for newly detected water (rgb 6, 182, 212)
    change_map_rgb[water_gained] = [6, 182, 212]

    # Encode change map as base64
    pil_map = Image.fromarray(change_map_rgb)
    buf = io.BytesIO()
    pil_map.save(buf, format="PNG")
    change_map_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

    # Also make NDWI color map
    def make_ndwi_heatmap(w_arr):
        norm = np.clip((w_arr + 0.5) / 1.0, 0, 1)
        # Land is sand/ochre (160, 140, 100), water is vibrant azure (0, 140, 255)
        rgb = np.zeros((w_arr.shape[0], w_arr.shape[1], 3), dtype=np.uint8)
        for i in range(w_arr.shape[0]):
            r = (1.0 - norm[i]) * 160 + norm[i] * 10
            g = (1.0 - norm[i]) * 140 + norm[i] * 120
            b = (1.0 - norm[i]) * 100 + norm[i] * 240
            rgb[i, :, 0] = np.clip(r, 0, 255)
            rgb[i, :, 1] = np.clip(g, 0, 255)
            rgb[i, :, 2] = np.clip(b, 0, 255)
        b_buf = io.BytesIO()
        Image.fromarray(rgb).save(b_buf, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(b_buf.getvalue()).decode()}"

    ndwi_before_b64 = make_ndwi_heatmap(w_before)
    ndwi_after_b64 = make_ndwi_heatmap(w_after)

    # Quantitative Metrics
    pixel_area_ha = (pixel_resolution_meters ** 2) / 10000.0
    total_area_ha = round((h * w) * pixel_area_ha, 2)

    water_before_pixels = int(np.sum(water_mask_before))
    water_after_pixels = int(np.sum(water_mask_after))
    lost_pixels = int(np.sum(water_lost))
    gained_pixels = int(np.sum(water_gained))
    stable_pixels = int(np.sum(stable_water))

    area_before_ha = round(water_before_pixels * pixel_area_ha, 2)
    area_after_ha = round(water_after_pixels * pixel_area_ha, 2)
    lost_area_ha = round(lost_pixels * pixel_area_ha, 2)
    gained_area_ha = round(gained_pixels * pixel_area_ha, 2)
    net_change_ha = round(area_after_ha - area_before_ha, 2)

    pct_change = round(((area_after_ha - area_before_ha) / max(area_before_ha, 0.001)) * 100.0, 2)

    return {
        "index_type": type_before,
        "index_name": name_before,
        "is_true_ndwi": is_true_ndwi,
        "scientific_note": expl_before,
        "total_area_ha": total_area_ha,
        "water_area_before_ha": area_before_ha,
        "water_area_after_ha": area_after_ha,
        "water_area_increased_ha": gained_area_ha,
        "water_area_decreased_ha": lost_area_ha,
        "net_water_change_ha": net_change_ha,
        "percentage_water_change": pct_change,
        "change_map_image": change_map_b64,
        "ndwi_before_map": ndwi_before_b64,
        "ndwi_after_map": ndwi_after_b64,
        "pixel_metrics": {
            "stable_water_pixels": stable_pixels,
            "lost_water_pixels": lost_pixels,
            "gained_water_pixels": gained_pixels,
            "non_water_pixels": int(np.sum(non_water))
        }
    }
