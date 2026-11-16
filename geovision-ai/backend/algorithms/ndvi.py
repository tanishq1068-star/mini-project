import io
import base64
import numpy as np
from PIL import Image

def compute_vegetation_index(container):
    """
    Computes true NDVI if NIR is present: (NIR - RED) / (NIR + RED)
    If RGB only, computes VARI (Visible Atmospherically Resistant Index): (G - R) / (G + R - B + eps)
    and clearly marks it as an approximation.
    """
    eps = 1e-6
    if container.has_nir:
        nir = container.nir
        red = container.red
        denom = nir + red
        denom = np.where(denom == 0, eps, denom)
        veg_index = (nir - red) / denom
        veg_index = np.clip(veg_index, -1.0, 1.0)
        index_type = "NDVI"
        index_name = "Normalized Difference Vegetation Index (NDVI)"
        is_true_ndvi = True
        explanation = "Calculated using Sentinel-2 multispectral Bands (B8 Near-Infrared and B4 Red). Sensitive to cellular chlorophyll scattering."
    else:
        # VARI: Visible Atmospherically Resistant Index for standard RGB
        # VARI = (Green - Red) / (Green + Red - Blue)
        g = container.green
        r = container.red
        b = container.blue
        denom = g + r - b
        denom = np.where(np.abs(denom) < eps, eps, denom)
        veg_index = (g - r) / denom
        veg_index = np.clip(veg_index, -1.0, 1.0)
        index_type = "VARI (RGB Approx)"
        index_name = "Visible Atmospherically Resistant Index (VARI - RGB Approximation)"
        is_true_ndvi = False
        explanation = (
            "NOTICE: True NDVI requires a dedicated Near-Infrared (NIR) sensor band. "
            "Because standard RGB imagery was provided, GeoVision AI used the Visible "
            "Atmospherically Resistant Index (VARI = (G - R)/(G + R - B)). "
            "While effective for visible green canopy estimation, it does not measure cellular "
            "mesophyll backscatter and may be sensitive to atmospheric haze and soil albedo."
        )

    return veg_index, index_type, index_name, is_true_ndvi, explanation


def classify_vegetation(veg_index, is_true_ndvi=True):
    """
    Classifies vegetation pixels into:
    - Dense Vegetation (class 3)
    - Moderate Vegetation (class 2)
    - Low Vegetation (class 1)
    - Bare Land / Non-Vegetation (class 0)
    """
    # Threshold adjustments for VARI vs NDVI
    if is_true_ndvi:
        dense_thresh = 0.50
        mod_thresh = 0.25
        low_thresh = 0.10
    else:
        dense_thresh = 0.30
        mod_thresh = 0.12
        low_thresh = 0.02

    classes = np.zeros(veg_index.shape, dtype=np.uint8)
    classes[veg_index >= low_thresh] = 1   # Low vegetation
    classes[veg_index >= mod_thresh] = 2  # Moderate vegetation
    classes[veg_index >= dense_thresh] = 3 # Dense vegetation

    return classes


def analyze_deforestation(container_before, container_after, pixel_resolution_meters=10.0):
    """
    Performs deforestation analysis between two multi-temporal satellite captures.
    Generates change map and statistics.
    """
    # 1. Compute indices
    v_before, type_before, name_before, is_true_ndvi, expl_before = compute_vegetation_index(container_before)
    v_after, _, _, _, _ = compute_vegetation_index(container_after)

    # Resize if shapes don't match
    if v_before.shape != v_after.shape:
        h, w = v_before.shape
        pil_va = Image.fromarray(v_after).resize((w, h), Image.Resampling.BILINEAR)
        v_after = np.array(pil_va)

    # 2. Classify
    class_before = classify_vegetation(v_before, is_true_ndvi)
    class_after = classify_vegetation(v_after, is_true_ndvi)

    # Binary vegetation masks (any vegetation: classes 1, 2, 3)
    veg_mask_before = class_before >= 1
    veg_mask_after = class_after >= 1

    # Dense/Moderate canopy
    canopy_before = class_before >= 2
    canopy_after = class_after >= 2

    # Change classification:
    # Loss: Was vegetation before, now bare land / non-vegetation, or significant drop (canopy before -> low/bare after)
    veg_loss = (veg_mask_before & (~veg_mask_after)) | (canopy_before & (class_after <= 1))
    
    # Moderate vegetation change: still vegetation, but downgraded (e.g. dense to moderate)
    moderate_change = (class_before > class_after) & (~veg_loss) & veg_mask_after

    # Stable vegetation: persistent dense or moderate vegetation
    stable_veg = (veg_mask_before & veg_mask_after) & (~moderate_change)

    # Non-vegetated: neither before nor after
    non_veg = (~veg_mask_before) & (~veg_mask_after)

    # 3. Generate visual change map
    # Visualization requirement:
    # - Green: Vegetation
    # - Red: Vegetation loss
    # - Yellow: Moderate vegetation change
    # - Dark grey: Non-vegetated areas
    h, w = v_before.shape
    change_map_rgb = np.zeros((h, w, 3), dtype=np.uint8)

    # Dark grey background for non-vegetated (rgb 40, 45, 52)
    change_map_rgb[non_veg] = [45, 52, 60]

    # Green for stable vegetation (rgb 34, 197, 94)
    change_map_rgb[stable_veg] = [34, 197, 94]

    # Yellow for moderate change (rgb 234, 179, 8)
    change_map_rgb[moderate_change] = [234, 179, 8]

    # Red for vegetation loss / deforestation (rgb 239, 68, 68)
    change_map_rgb[veg_loss] = [239, 68, 68]

    # Vegetation regrowth (cyan: rgb 6, 182, 212)
    regrowth = (~veg_mask_before) & veg_mask_after
    change_map_rgb[regrowth] = [6, 182, 212]

    # Encode change map as base64
    pil_map = Image.fromarray(change_map_rgb)
    buf = io.BytesIO()
    pil_map.save(buf, format="PNG")
    change_map_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

    # Also generate NDVI before and after color heatmaps
    def make_ndvi_heatmap(v_arr):
        # Normalize -0.2 to 0.8 range into colormap
        norm = np.clip((v_arr + 0.2) / 1.0, 0, 1)
        # Low is brown/tan (180, 150, 100), mid is yellow (220, 220, 60), high is deep forest green (20, 130, 30)
        rgb = np.zeros((v_arr.shape[0], v_arr.shape[1], 3), dtype=np.uint8)
        for i in range(v_arr.shape[0]):
            r = (1.0 - norm[i]) * 180 + norm[i] * 20
            g = (1.0 - norm[i]) * 150 + norm[i] * 180
            b = (1.0 - norm[i]) * 100 + norm[i] * 30
            rgb[i, :, 0] = np.clip(r, 0, 255)
            rgb[i, :, 1] = np.clip(g, 0, 255)
            rgb[i, :, 2] = np.clip(b, 0, 255)
        b_buf = io.BytesIO()
        Image.fromarray(rgb).save(b_buf, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(b_buf.getvalue()).decode()}"

    ndvi_before_b64 = make_ndvi_heatmap(v_before)
    ndvi_after_b64 = make_ndvi_heatmap(v_after)

    # 4. Metrics & Statistical Area calculations
    # 1 pixel = (pixel_resolution_meters)^2 square meters
    # 1 hectare = 10,000 m^2
    pixel_area_ha = (pixel_resolution_meters ** 2) / 10000.0
    total_pixels = h * w
    total_area_ha = round(total_pixels * pixel_area_ha, 2)

    veg_pixels_before = int(np.sum(veg_mask_before))
    veg_pixels_after = int(np.sum(veg_mask_after))
    loss_pixels = int(np.sum(veg_loss))
    mod_pixels = int(np.sum(moderate_change))
    regrowth_pixels = int(np.sum(regrowth))

    area_before_ha = round(veg_pixels_before * pixel_area_ha, 2)
    area_after_ha = round(veg_pixels_after * pixel_area_ha, 2)
    loss_area_ha = round(loss_pixels * pixel_area_ha, 2)
    regrowth_area_ha = round(regrowth_pixels * pixel_area_ha, 2)
    net_change_ha = round(area_after_ha - area_before_ha, 2)

    pct_change = round(((area_after_ha - area_before_ha) / max(area_before_ha, 0.001)) * 100.0, 2)
    loss_percentage_of_forest = round((loss_area_ha / max(area_before_ha, 0.001)) * 100.0, 2)

    # Class breakdown before & after
    def get_breakdown(classes):
        return {
            "dense_ha": round(int(np.sum(classes == 3)) * pixel_area_ha, 2),
            "moderate_ha": round(int(np.sum(classes == 2)) * pixel_area_ha, 2),
            "low_ha": round(int(np.sum(classes == 1)) * pixel_area_ha, 2),
            "bare_ha": round(int(np.sum(classes == 0)) * pixel_area_ha, 2),
        }

    return {
        "index_type": type_before,
        "index_name": name_before,
        "is_true_ndvi": is_true_ndvi,
        "scientific_note": expl_before,
        "total_area_ha": total_area_ha,
        "vegetation_area_before_ha": area_before_ha,
        "vegetation_area_after_ha": area_after_ha,
        "total_vegetation_loss_ha": loss_area_ha,
        "vegetation_regrowth_ha": regrowth_area_ha,
        "net_change_ha": net_change_ha,
        "percentage_vegetation_change": pct_change,
        "loss_percentage_of_initial": loss_percentage_of_forest,
        "change_map_image": change_map_b64,
        "ndvi_before_map": ndvi_before_b64,
        "ndvi_after_map": ndvi_after_b64,
        "breakdown_before": get_breakdown(class_before),
        "breakdown_after": get_breakdown(class_after),
        "pixel_metrics": {
            "loss_pixels": loss_pixels,
            "moderate_change_pixels": mod_pixels,
            "stable_vegetation_pixels": int(np.sum(stable_veg)),
            "regrowth_pixels": regrowth_pixels,
            "non_vegetated_pixels": int(np.sum(non_veg))
        }
    }
