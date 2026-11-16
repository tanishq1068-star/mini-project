import io
import base64
import numpy as np
from PIL import Image

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False


def detect_clouds_and_shadows(container, cloud_thresh: float = 0.38, shadow_thresh: float = 0.12):
    """
    Performs multi-spectral / RGB cloud and cloud shadow detection for Sentinel-2 imagery.
    Classifies pixels into:
      - Class 0: Clear Land / Water (Valid Observation)
      - Class 1: Opaque Cloud (Dense Cloud)
      - Class 2: Semi-transparent Cirrus / Cloud Edge
      - Class 3: Cloud Shadow

    Excludes masked pixels from valid surface calculations.
    """
    red = container.red
    green = container.green
    blue = container.blue
    nir = container.nir if container.has_nir else (red * 0.3 + green * 0.5 + blue * 0.2)
    h, w = red.shape

    # 1. Brightness / Albedo Metric
    visible_brightness = (red + green + blue) / 3.0

    # 2. Whiteness Index: clouds reflect all visible wavelengths almost equally
    eps = 1e-6
    mean_vis = visible_brightness + eps
    whiteness = (np.abs(red - mean_vis) + np.abs(green - mean_vis) + np.abs(blue - mean_vis)) / mean_vis

    # 3. Cloud Detection Rules
    # Dense clouds: High visible brightness + high whiteness (low deviation across RGB) + high NIR
    dense_cloud_mask = (visible_brightness >= cloud_thresh) & (whiteness < 0.28) & (nir > 0.25)

    # Cirrus / thin cloud: Moderate brightness + whiteness
    cirrus_mask = (visible_brightness >= (cloud_thresh * 0.75)) & (visible_brightness < cloud_thresh) & (whiteness < 0.22) & (~dense_cloud_mask)

    # 4. Cloud Shadow Detection Rules
    # Cloud shadows have very low reflectance across visible and especially NIR
    # Exclude open deep water from shadow mask by requiring higher blue-to-NIR ratio or non-water context
    is_dark = (visible_brightness < shadow_thresh) & (nir < (shadow_thresh * 0.95))
    # Water typically has higher Blue compared to Red; shadows over land have similar or lower blue
    shadow_candidate = is_dark & ((blue - red) < 0.08)

    # If OpenCV is available, apply morphological cleanup and spatial dilation
    if HAS_CV2:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        dense_clean = cv2.morphologyEx(dense_cloud_mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
        dense_clean = cv2.dilate(dense_clean, kernel, iterations=1)
        dense_cloud_mask = dense_clean.astype(bool)

        cirrus_clean = cv2.morphologyEx(cirrus_mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
        cirrus_mask = cirrus_clean.astype(bool) & (~dense_cloud_mask)

        shadow_clean = cv2.morphologyEx(shadow_candidate.astype(np.uint8), cv2.MORPH_OPEN, kernel)
        shadow_mask = shadow_clean.astype(bool) & (~dense_cloud_mask) & (~cirrus_mask)
    else:
        shadow_mask = shadow_candidate & (~dense_cloud_mask) & (~cirrus_mask)

    # Composite Mask
    # 0 = Clear, 1 = Dense Cloud, 2 = Cirrus, 3 = Cloud Shadow
    classification = np.zeros((h, w), dtype=np.uint8)
    classification[cirrus_mask] = 2
    classification[dense_cloud_mask] = 1
    classification[shadow_mask] = 3

    # Binary validity mask: True if pixel is clear (not cloud, not shadow)
    valid_clear_mask = (classification == 0)

    # 5. Calculate Metrics
    total_pixels = h * w
    cloud_pixels = int(np.sum(dense_cloud_mask) + np.sum(cirrus_mask))
    dense_cloud_pixels = int(np.sum(dense_cloud_mask))
    cirrus_pixels = int(np.sum(cirrus_mask))
    shadow_pixels = int(np.sum(shadow_mask))
    clear_pixels = int(np.sum(valid_clear_mask))

    cloud_coverage_pct = round((cloud_pixels / total_pixels) * 100.0, 2)
    shadow_coverage_pct = round((shadow_pixels / total_pixels) * 100.0, 2)
    clear_coverage_pct = round((clear_pixels / total_pixels) * 100.0, 2)

    # Pixel resolution (10m standard = 0.01 ha per pixel)
    pixel_area_ha = 0.01
    total_area_ha = round(total_pixels * pixel_area_ha, 2)
    valid_clear_area_ha = round(clear_pixels * pixel_area_ha, 2)
    cloud_area_ha = round(cloud_pixels * pixel_area_ha, 2)
    shadow_area_ha = round(shadow_pixels * pixel_area_ha, 2)

    # 6. Generate Cloud Classification Mask Image
    # Colors:
    # - Clear surface: Muted slate / natural background [30, 41, 59]
    # - Dense Cloud: Pure white [255, 255, 255]
    # - Cirrus Cloud: Light Cyan [147, 197, 253]
    # - Cloud Shadow: Dark Brownish Black [69, 26, 3]
    mask_rgb = np.zeros((h, w, 3), dtype=np.uint8)
    mask_rgb[valid_clear_mask] = [30, 41, 59]
    mask_rgb[cirrus_mask] = [147, 197, 253]
    mask_rgb[dense_cloud_mask] = [255, 255, 255]
    mask_rgb[shadow_mask] = [69, 26, 3]

    # 7. Generate Cloud-Masked Composite Image
    # Replaces cloud/shadow pixels with darkened / semi-transparent overlay
    rgb_uint8 = np.clip(np.stack([red, green, blue], axis=-1) * 255.0, 0, 255).astype(np.uint8)
    masked_composite_rgb = rgb_uint8.copy()
    
    # Shade cloud pixels with cyan-grey tint and shadow pixels with dark overlay
    masked_composite_rgb[dense_cloud_mask] = [20, 30, 40]
    masked_composite_rgb[cirrus_mask] = (masked_composite_rgb[cirrus_mask] * 0.4 + np.array([10, 40, 60]) * 0.6).astype(np.uint8)
    masked_composite_rgb[shadow_mask] = [15, 20, 25]

    def to_b64(arr_rgb):
        pil_img = Image.fromarray(arr_rgb)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

    original_b64 = to_b64(rgb_uint8)
    cloud_mask_b64 = to_b64(mask_rgb)
    masked_composite_b64 = to_b64(masked_composite_rgb)

    # 8. Compute Cloud-Masked NDVI and NDWI
    # Exclude masked pixels from calculations so clouds don't artificially skew canopy or water
    denom_ndvi = nir + red
    denom_ndvi = np.where(denom_ndvi == 0, eps, denom_ndvi)
    ndvi_raw = (nir - red) / denom_ndvi

    denom_ndwi = green + nir
    denom_ndwi = np.where(denom_ndwi == 0, eps, denom_ndwi)
    ndwi_raw = (green - nir) / denom_ndwi

    # Valid clear masked values only
    valid_ndvi = ndvi_raw[valid_clear_mask]
    valid_ndwi = ndwi_raw[valid_clear_mask]

    mean_ndvi_raw = float(np.mean(ndvi_raw)) if total_pixels > 0 else 0.0
    mean_ndvi_masked = float(np.mean(valid_ndvi)) if len(valid_ndvi) > 0 else 0.0

    mean_ndwi_raw = float(np.mean(ndwi_raw)) if total_pixels > 0 else 0.0
    mean_ndwi_masked = float(np.mean(valid_ndwi)) if len(valid_ndwi) > 0 else 0.0

    return {
        "cloud_coverage_percentage": cloud_coverage_pct,
        "shadow_coverage_percentage": shadow_coverage_pct,
        "clear_surface_percentage": clear_coverage_pct,
        "pixel_metrics": {
            "total_pixels": total_pixels,
            "clear_pixels": clear_pixels,
            "dense_cloud_pixels": dense_cloud_pixels,
            "cirrus_pixels": cirrus_pixels,
            "shadow_pixels": shadow_pixels
        },
        "area_metrics": {
            "total_area_ha": total_area_ha,
            "clear_area_ha": valid_clear_area_ha,
            "cloud_area_ha": cloud_area_ha,
            "shadow_area_ha": shadow_area_ha
        },
        "spectral_impact": {
            "mean_ndvi_unmasked": round(mean_ndvi_raw, 4),
            "mean_ndvi_cloud_masked": round(mean_ndvi_masked, 4),
            "mean_ndwi_unmasked": round(mean_ndwi_raw, 4),
            "mean_ndwi_cloud_masked": round(mean_ndwi_masked, 4),
            "ndvi_correction_delta": round(mean_ndvi_masked - mean_ndvi_raw, 4)
        },
        "images": {
            "original_image": original_b64,
            "cloud_mask_image": cloud_mask_b64,
            "masked_composite_image": masked_composite_b64
        },
        "valid_mask": valid_clear_mask
    }
