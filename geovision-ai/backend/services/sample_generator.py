import os
import numpy as np
from PIL import Image

try:
    import tifffile
    HAS_TIFFFILE = True
except ImportError:
    HAS_TIFFFILE = False


def generate_demonstration_datasets(base_dir="sample_data"):
    """
    Generates realistic multi-temporal satellite demonstration datasets
    with both 4-band GeoTIFFs and true-color PNGs.
    Clearly labeled as demonstration data.
    """
    forest_dir = os.path.join(base_dir, "forest")
    water_dir = os.path.join(base_dir, "water")
    os.makedirs(forest_dir, exist_ok=True)
    os.makedirs(water_dir, exist_ok=True)

    np.random.seed(42)
    H, W = 512, 512

    # =========================================================================
    # SCENARIO 1: Deforestation & Forest Loss (Western Ghats / Rainforest Zone)
    # Date 1: 2021-06-15 (Pristine Forest Reserve)
    # Date 2: 2024-07-20 (Agricultural Expansion & Timber Extraction)
    # =========================================================================

    # Base coordinates: latitude 12.1500 N, longitude 75.7800 E (Brahmagiri/Coorg region)
    x, y = np.meshgrid(np.linspace(0, 1, W), np.linspace(0, 1, H))

    # Topography & vegetation density texture
    noise1 = np.sin(x * 12.0) * np.cos(y * 12.0) * 0.15
    noise2 = np.sin(x * 35.0 + y * 25.0) * 0.08
    topo = noise1 + noise2 + 0.5  # 0.2 to 0.8

    # River winding through center
    river_path = 0.45 + 0.12 * np.sin(y * 6.0) + 0.04 * np.cos(y * 14.0)
    river_dist = np.abs(x - river_path)
    river_mask = river_dist < 0.025

    # 1. Date 1 (2021) - Dense Forest
    # Forest spectral profile: Low Red (0.05-0.10), Moderate Green (0.16-0.22), Low Blue (0.04-0.08), High NIR (0.70-0.90)
    red_f1 = np.clip(0.06 + topo * 0.04 + np.random.normal(0, 0.015, (H, W)), 0.02, 0.20)
    green_f1 = np.clip(0.18 + topo * 0.08 + np.random.normal(0, 0.02, (H, W)), 0.08, 0.35)
    blue_f1 = np.clip(0.05 + topo * 0.03 + np.random.normal(0, 0.01, (H, W)), 0.02, 0.15)
    nir_f1 = np.clip(0.72 + topo * 0.18 + np.random.normal(0, 0.03, (H, W)), 0.45, 0.98)

    # Apply river
    red_f1[river_mask] = 0.03
    green_f1[river_mask] = 0.08
    blue_f1[river_mask] = 0.18
    nir_f1[river_mask] = 0.02

    # 2. Date 2 (2024) - Deforestation Patches & Access Corridors
    red_f2 = red_f1.copy()
    green_f2 = green_f1.copy()
    blue_f2 = blue_f1.copy()
    nir_f2 = nir_f1.copy()

    # Clearings: Deforestation zones in NW and SE quadrants
    clear1 = ((x - 0.28)**2 / 0.03 + (y - 0.35)**2 / 0.02) < 1.0
    clear2 = ((x - 0.72)**2 / 0.04 + (y - 0.65)**2 / 0.035) < 1.0
    clear3 = ((x - 0.78)**2 / 0.018 + (y - 0.25)**2 / 0.015) < 1.0

    # Logging access roads
    road1 = (np.abs(x - 0.28 - (y - 0.35) * 0.4) < 0.008) & (y > 0.1) & (y < 0.7)
    road2 = (np.abs(y - 0.65 - (x - 0.72) * 0.3) < 0.008) & (x > 0.4) & (x < 0.95)

    deforested_mask = (clear1 | clear2 | clear3 | road1 | road2) & (~river_mask)

    # Deforested soil spectral profile: High Red (0.35-0.45), Moderate Green (0.22-0.28), Moderate Blue (0.15-0.20), Moderate NIR (0.25-0.35)
    soil_noise = np.random.normal(0, 0.02, (H, W))
    red_f2[deforested_mask] = np.clip(0.40 + soil_noise[deforested_mask], 0.25, 0.55)
    green_f2[deforested_mask] = np.clip(0.25 + soil_noise[deforested_mask] * 0.7, 0.15, 0.38)
    blue_f2[deforested_mask] = np.clip(0.18 + soil_noise[deforested_mask] * 0.5, 0.10, 0.30)
    nir_f2[deforested_mask] = np.clip(0.26 + soil_noise[deforested_mask] * 0.6, 0.18, 0.40)

    # Save Forest Scenario Images
    save_multi_temporal_pair(
        os.path.join(forest_dir, "forest_2021_t1"),
        red_f1, green_f1, blue_f1, nir_f1
    )
    save_multi_temporal_pair(
        os.path.join(forest_dir, "forest_2024_t2"),
        red_f2, green_f2, blue_f2, nir_f2
    )

    # =========================================================================
    # SCENARIO 2: Water Resource Depletion & Shrinkage (Lake Reservoir)
    # Date 1: 2020-03-10 (High Storage / Full Reservoir Capacity)
    # Date 2: 2024-04-18 (Severe Drought / Significant Lake Shrinkage)
    # =========================================================================

    # Central lake basin
    dx = (x - 0.50) / 0.38
    dy = (y - 0.48) / 0.32
    lake_dist = np.sqrt(dx**2 + dy**2) + 0.08 * np.sin(x * 15.0) * np.cos(y * 15.0)

    # Date 1: Large full lake (boundary at dist < 0.95)
    lake_mask_t1 = lake_dist < 0.95

    # Surrounding arid/semi-arid terrain spectral profile
    # Sand/dry soil: Red 0.38, Green 0.32, Blue 0.22, NIR 0.36
    red_w1 = np.clip(0.35 + topo * 0.08 + np.random.normal(0, 0.02, (H, W)), 0.20, 0.55)
    green_w1 = np.clip(0.30 + topo * 0.06 + np.random.normal(0, 0.02, (H, W)), 0.18, 0.45)
    blue_w1 = np.clip(0.20 + topo * 0.04 + np.random.normal(0, 0.015, (H, W)), 0.12, 0.35)
    nir_w1 = np.clip(0.38 + topo * 0.09 + np.random.normal(0, 0.025, (H, W)), 0.22, 0.58)

    # Water spectral profile: High Blue (0.28), Moderate Green (0.14), Low Red (0.04), Near-Zero NIR (0.01-0.03)
    water_noise = np.random.normal(0, 0.008, (H, W))
    red_w1[lake_mask_t1] = np.clip(0.04 + water_noise[lake_mask_t1], 0.01, 0.08)
    green_w1[lake_mask_t1] = np.clip(0.12 + water_noise[lake_mask_t1] * 1.2, 0.06, 0.20)
    blue_w1[lake_mask_t1] = np.clip(0.28 + water_noise[lake_mask_t1] * 1.5, 0.15, 0.42)
    nir_w1[lake_mask_t1] = np.clip(0.02 + water_noise[lake_mask_t1] * 0.5, 0.005, 0.05)

    # Date 2: Lake retreat / desiccation (shrunken boundary at dist < 0.58)
    lake_mask_t2 = lake_dist < 0.58
    exposed_bed = lake_mask_t1 & (~lake_mask_t2)

    red_w2 = red_w1.copy()
    green_w2 = green_w1.copy()
    blue_w2 = blue_w1.copy()
    nir_w2 = nir_w1.copy()

    # Exposed saline lakebed / dry silt: Very bright, high albedo
    bed_noise = np.random.normal(0, 0.02, (H, W))
    red_w2[exposed_bed] = np.clip(0.46 + bed_noise[exposed_bed], 0.32, 0.65)
    green_w2[exposed_bed] = np.clip(0.42 + bed_noise[exposed_bed] * 0.9, 0.28, 0.60)
    blue_w2[exposed_bed] = np.clip(0.32 + bed_noise[exposed_bed] * 0.8, 0.20, 0.48)
    nir_w2[exposed_bed] = np.clip(0.48 + bed_noise[exposed_bed] * 0.9, 0.30, 0.68)

    # Remaining water in Date 2 is more turbid / shallower
    red_w2[lake_mask_t2] = np.clip(0.06 + water_noise[lake_mask_t2], 0.02, 0.11)
    green_w2[lake_mask_t2] = np.clip(0.14 + water_noise[lake_mask_t2] * 1.2, 0.08, 0.24)
    blue_w2[lake_mask_t2] = np.clip(0.24 + water_noise[lake_mask_t2] * 1.5, 0.12, 0.38)
    nir_w2[lake_mask_t2] = np.clip(0.03 + water_noise[lake_mask_t2] * 0.5, 0.008, 0.07)

    # Save Water Scenario Images
    save_multi_temporal_pair(
        os.path.join(water_dir, "water_2020_t1"),
        red_w1, green_w1, blue_w1, nir_w1
    )
    save_multi_temporal_pair(
        os.path.join(water_dir, "water_2024_t2"),
        red_w2, green_w2, blue_w2, nir_w2
    )


def save_multi_temporal_pair(base_name, r, g, b, nir):
    """Saves both a true-color PNG and a 4-band multispectral GeoTIFF."""
    # 1. True Color PNG
    rgb_arr = np.stack([
        np.clip(r * 255.0, 0, 255).astype(np.uint8),
        np.clip(g * 255.0, 0, 255).astype(np.uint8),
        np.clip(b * 255.0, 0, 255).astype(np.uint8)
    ], axis=-1)
    Image.fromarray(rgb_arr).save(f"{base_name}.png")

    # 2. 4-Band Multispectral GeoTIFF (Red, Green, Blue, NIR)
    if HAS_TIFFFILE:
        # Scale to 16-bit unsigned integer (Sentinel-2 scale: 0 - 10000 reflectance)
        b4_red = np.clip(r * 10000.0, 0, 10000).astype(np.uint16)
        b3_green = np.clip(g * 10000.0, 0, 10000).astype(np.uint16)
        b2_blue = np.clip(b * 10000.0, 0, 10000).astype(np.uint16)
        b8_nir = np.clip(nir * 10000.0, 0, 10000).astype(np.uint16)

        multi_band = np.stack([b4_red, b3_green, b2_blue, b8_nir], axis=-1)
        tifffile.imwrite(f"{base_name}.tif", multi_band, photometric='rgb')
