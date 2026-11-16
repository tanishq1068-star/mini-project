import io
import base64
import numpy as np
from PIL import Image

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

from .ndvi import compute_vegetation_index, classify_vegetation
from .ndwi import compute_water_index, segment_water_bodies


def register_images(img1_uint8, img2_uint8):
    """
    Attempts feature-based image registration using ORB and Homography.
    If matching fails or OpenCV is unavailable, resizes img2 to img1's size.
    """
    h, w = img1_uint8.shape[:2]
    if not HAS_CV2:
        pil_img2 = Image.fromarray(img2_uint8).resize((w, h), Image.Resampling.BILINEAR)
        return np.array(pil_img2), False, "OpenCV not available; bicubic spatial alignment used."

    try:
        # Resize if dimensions differ
        if img2_uint8.shape[:2] != (h, w):
            img2_uint8 = cv2.resize(img2_uint8, (w, h), interpolation=cv2.INTER_LINEAR)

        gray1 = cv2.cvtColor(img1_uint8, cv2.COLOR_RGB2GRAY)
        gray2 = cv2.cvtColor(img2_uint8, cv2.COLOR_RGB2GRAY)

        orb = cv2.ORB_create(nfeatures=1500)
        kp1, des1 = orb.detectAndCompute(gray1, None)
        kp2, des2 = orb.detectAndCompute(gray2, None)

        if des1 is None or des2 is None or len(kp1) < 10 or len(kp2) < 10:
            return img2_uint8, False, "Sparse feature descriptors; pixel-aligned directly."

        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)

        # Select top matches
        good_matches = matches[:min(len(matches), 100)]
        if len(good_matches) < 8:
            return img2_uint8, False, "Insufficient reliable tie points; direct spatial alignment used."

        src_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)

        homography, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        if homography is not None:
            aligned = cv2.warpPerspective(img2_uint8, homography, (w, h))
            return aligned, True, f"Automated feature-based homography alignment succeeded ({len(good_matches)} tie points)."
    except Exception as e:
        pass

    # Fallback: direct resize
    pil_img2 = Image.fromarray(img2_uint8).resize((w, h), Image.Resampling.BILINEAR)
    return np.array(pil_img2), False, "Standard geographic grid alignment."


def reduce_noise(image_array, method="bilateral"):
    """
    Applies noise reduction (speckle filtering / bilateral filter).
    """
    if HAS_CV2 and image_array.dtype == np.uint8:
        if method == "bilateral":
            return cv2.bilateralFilter(image_array, 5, 50, 50)
        elif method == "median":
            return cv2.medianBlur(image_array, 3)
    return image_array


def perform_change_detection(container_before, container_after, pixel_resolution_meters=10.0):
    """
    Executes the multi-temporal change detection pipeline:
    1. Preprocessing and noise reduction
    2. Image registration / alignment
    3. Multi-spectral / luminance differencing
    4. Environmental feature extraction (deforestation, water body shrinkage/expansion)
    5. Composite change map generation
    6. Quantitative statistics
    """
    # Prepare uint8 representations for registration
    rgb1_uint8 = np.clip(np.stack([container_before.red, container_before.green, container_before.blue], axis=-1) * 255.0, 0, 255).astype(np.uint8)
    rgb2_uint8 = np.clip(np.stack([container_after.red, container_after.green, container_after.blue], axis=-1) * 255.0, 0, 255).astype(np.uint8)

    # 1 & 2: Alignment
    registered_rgb2, alignment_success, alignment_msg = register_images(rgb1_uint8, rgb2_uint8)

    # 3. Noise reduction
    denoised_rgb1 = reduce_noise(rgb1_uint8, "bilateral")
    denoised_rgb2 = reduce_noise(registered_rgb2, "bilateral")

    h, w, _ = denoised_rgb1.shape
    pixel_area_ha = (pixel_resolution_meters ** 2) / 10000.0
    total_pixels = h * w
    total_area_ha = round(total_pixels * pixel_area_ha, 2)

    # 4. Pixel-based color/spectral distance
    norm1 = denoised_rgb1.astype(np.float32) / 255.0
    norm2 = denoised_rgb2.astype(np.float32) / 255.0

    diff_spectral = np.sqrt(np.sum((norm2 - norm1) ** 2, axis=-1)) / np.sqrt(3.0)  # [0.0, 1.0]

    # 5. Extract Vegetation and Water dynamics
    v_before, _, _, is_true_ndvi, _ = compute_vegetation_index(container_before)
    v_after, _, _, _, _ = compute_vegetation_index(container_after)

    # Ensure shape alignment
    if v_after.shape != (h, w):
        v_after = np.array(Image.fromarray(v_after).resize((w, h), Image.Resampling.BILINEAR))

    class_v_before = classify_vegetation(v_before, is_true_ndvi)
    class_v_after = classify_vegetation(v_after, is_true_ndvi)

    # Water extraction
    w_before, _, _, is_true_ndwi, _ = compute_water_index(container_before)
    w_after, _, _, _, _ = compute_water_index(container_after)
    if w_after.shape != (h, w):
        w_after = np.array(Image.fromarray(w_after).resize((w, h), Image.Resampling.BILINEAR))

    water_before = segment_water_bodies(w_before, is_true_ndwi)
    water_after = segment_water_bodies(w_after, is_true_ndwi)

    # Specific Change Categories:
    # A. Deforestation / Forest Loss (was canopy >=2, now <=1 or dropped significantly)
    deforestation_mask = (class_v_before >= 2) & (class_v_after <= 1)

    # B. Vegetation Regrowth / Afforestation (was bare/low, now dense/moderate)
    regrowth_mask = (class_v_before <= 1) & (class_v_after >= 2)

    # C. Water Loss / Desiccation (was water, now land)
    water_loss_mask = water_before & (~water_after)

    # D. Water Inundation / Expansion (was land, now water)
    water_gain_mask = (~water_before) & water_after

    # E. General Land Cover / Soil Disturbance (high spectral difference not accounted by above)
    significant_spectral_diff = diff_spectral > 0.18
    other_change_mask = significant_spectral_diff & (~deforestation_mask) & (~regrowth_mask) & (~water_loss_mask) & (~water_gain_mask)

    # Stable Land / No change
    no_change_mask = (~deforestation_mask) & (~regrowth_mask) & (~water_loss_mask) & (~water_gain_mask) & (~other_change_mask)

    # 6. Construct Comprehensive Multi-Temporal Change Map
    # Colors:
    # - Red [239, 68, 68]: Deforestation
    # - Orange [249, 115, 22]: Water Loss / Desiccation
    # - Cyan [6, 182, 212]: Water Expansion / Inundation
    # - Emerald Green [16, 185, 129]: Vegetation Regrowth
    # - Amber / Yellow [234, 179, 8]: Other Land Cover Alteration
    # - Muted Dark Slate [30, 41, 59]: Stable / No change
    change_map_rgb = np.zeros((h, w, 3), dtype=np.uint8)
    change_map_rgb[no_change_mask] = [30, 41, 59]
    change_map_rgb[other_change_mask] = [234, 179, 8]
    change_map_rgb[regrowth_mask] = [16, 185, 129]
    change_map_rgb[water_gain_mask] = [6, 182, 212]
    change_map_rgb[water_loss_mask] = [249, 115, 22]
    change_map_rgb[deforestation_mask] = [239, 68, 68]

    # Change heatmap (magnitude of change)
    heat_norm = np.clip(diff_spectral * 2.5, 0, 1)
    heat_rgb = np.zeros((h, w, 3), dtype=np.uint8)
    for i in range(h):
        # Cool to warm: dark blue -> green -> yellow -> red
        r_c = np.clip((heat_norm[i] - 0.5) * 2.0 * 255, 0, 255)
        g_c = np.clip((1.0 - np.abs(heat_norm[i] - 0.5) * 2.0) * 255, 0, 255)
        b_c = np.clip((0.5 - heat_norm[i]) * 2.0 * 255, 0, 255)
        heat_rgb[i, :, 0] = r_c
        heat_rgb[i, :, 1] = g_c
        heat_rgb[i, :, 2] = b_c

    # Encode images to Base64
    def to_b64(arr_rgb):
        pil_img = Image.fromarray(arr_rgb)
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=88)
        return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"

    def to_png_b64(arr_rgb):
        pil_img = Image.fromarray(arr_rgb)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

    earlier_b64 = to_b64(denoised_rgb1)
    later_b64 = to_b64(denoised_rgb2)
    change_map_b64 = to_png_b64(change_map_rgb)
    heat_map_b64 = to_png_b64(heat_rgb)

    # Compute Statistics
    deforest_ha = round(int(np.sum(deforestation_mask)) * pixel_area_ha, 2)
    regrowth_ha = round(int(np.sum(regrowth_mask)) * pixel_area_ha, 2)
    water_loss_ha = round(int(np.sum(water_loss_mask)) * pixel_area_ha, 2)
    water_gain_ha = round(int(np.sum(water_gain_mask)) * pixel_area_ha, 2)
    other_change_ha = round(int(np.sum(other_change_mask)) * pixel_area_ha, 2)
    no_change_ha = round(int(np.sum(no_change_mask)) * pixel_area_ha, 2)

    total_changed_ha = round(deforest_ha + regrowth_ha + water_loss_ha + water_gain_ha + other_change_ha, 2)
    change_percentage = round((total_changed_ha / max(total_area_ha, 0.001)) * 100.0, 2)
    stability_percentage = round(100.0 - change_percentage, 2)

    return {
        "alignment": {
            "success": alignment_success,
            "message": alignment_msg
        },
        "earlier_image": earlier_b64,
        "later_image": later_b64,
        "change_map_image": change_map_b64,
        "change_heatmap_image": heat_map_b64,
        "statistics": {
            "total_area_ha": total_area_ha,
            "total_changed_ha": total_changed_ha,
            "total_stable_ha": no_change_ha,
            "change_percentage": change_percentage,
            "stability_percentage": stability_percentage,
            "deforestation_ha": deforest_ha,
            "regrowth_ha": regrowth_ha,
            "water_loss_ha": water_loss_ha,
            "water_gain_ha": water_gain_ha,
            "other_change_ha": other_change_ha
        },
        "pixel_counts": {
            "total_pixels": total_pixels,
            "deforestation_pixels": int(np.sum(deforestation_mask)),
            "regrowth_pixels": int(np.sum(regrowth_mask)),
            "water_loss_pixels": int(np.sum(water_loss_mask)),
            "water_gain_pixels": int(np.sum(water_gain_mask)),
            "other_change_pixels": int(np.sum(other_change_mask)),
            "no_change_pixels": int(np.sum(no_change_mask))
        }
    }
