import os
import io
import base64
import numpy as np
from PIL import Image

try:
    import tifffile
    HAS_TIFFFILE = True
except ImportError:
    HAS_TIFFFILE = False

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False


class SatelliteImageContainer:
    """
    Standard container representing a multi-spectral or RGB satellite image.
    Stores normalized band data [0.0 - 1.0] and geo-metadata.
    """
    def __init__(self, red, green, blue, nir=None, metadata=None):
        self.red = red.astype(np.float32)
        self.green = green.astype(np.float32)
        self.blue = blue.astype(np.float32)
        self.nir = nir.astype(np.float32) if nir is not None else None
        self.metadata = metadata or {}
        self.height, self.width = red.shape
        self.has_nir = self.nir is not None

    def get_rgb_preview(self, as_base64=True, max_size=1024):
        """Generates an enhanced RGB visualization in uint8 format or base64 data URI."""
        r = np.clip(self.red * 255.0, 0, 255).astype(np.uint8)
        g = np.clip(self.green * 255.0, 0, 255).astype(np.uint8)
        b = np.clip(self.blue * 255.0, 0, 255).astype(np.uint8)
        rgb = np.stack([r, g, b], axis=-1)

        pil_img = Image.fromarray(rgb)
        if max(pil_img.size) > max_size:
            pil_img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        if as_base64:
            buffered = io.BytesIO()
            pil_img.save(buffered, format="JPEG", quality=88)
            img_str = base64.b64encode(buffered.getvalue()).decode()
            return f"data:image/jpeg;base64,{img_str}"
        return np.array(pil_img)


def read_satellite_image(file_path_or_bytes, filename="image.tif") -> SatelliteImageContainer:
    """
    Reads an uploaded file or disk path. Supports GeoTIFF, multi-band TIFF, PNG, JPG.
    Extracts Red, Green, Blue, and optionally NIR bands.
    """
    ext = os.path.splitext(filename)[1].lower()
    is_bytes = isinstance(file_path_or_bytes, (bytes, bytearray))

    metadata = {
        "filename": filename,
        "format": ext.replace(".", "").upper(),
        "is_multispectral": False,
        "sensor": "Unknown / Standard RGB",
        "bounds": [13.0827, 80.2707, 13.1200, 80.3100]  # Default lat/lon fallback
    }

    # Attempt reading with tifffile if TIFF/GeoTIFF
    if ext in [".tif", ".tiff", ".geotiff"]:
        try:
            if HAS_TIFFFILE:
                if is_bytes:
                    raw_arr = tifffile.imread(io.BytesIO(file_path_or_bytes))
                else:
                    raw_arr = tifffile.imread(file_path_or_bytes)
                
                # Check array shape: (Bands, H, W) or (H, W, Bands) or (H, W)
                if raw_arr.ndim == 3:
                    if raw_arr.shape[0] in [3, 4, 8, 12, 13] and raw_arr.shape[0] < raw_arr.shape[1]:
                        # Shape is (C, H, W)
                        raw_arr = np.transpose(raw_arr, (1, 2, 0))
                
                if raw_arr.ndim == 2:
                    # Grayscale
                    val = raw_arr.astype(np.float32) / (raw_arr.max() or 1.0)
                    return SatelliteImageContainer(val, val, val, None, metadata)
                
                channels = raw_arr.shape[2]
                norm_arr = raw_arr.astype(np.float32)
                # Normalize reflectance: Sentinel-2 uint16 is often 0-10000, 8-bit is 0-255
                max_val = norm_arr.max()
                if max_val > 255.0:
                    norm_arr = norm_arr / 10000.0  # Sentinel L2A BOA reflectance scale
                else:
                    norm_arr = norm_arr / 255.0
                norm_arr = np.clip(norm_arr, 0.0, 1.0)

                if channels >= 4:
                    # Assume order: Red, Green, Blue, NIR (or Sentinel B4, B3, B2, B8)
                    r = norm_arr[:, :, 0]
                    g = norm_arr[:, :, 1]
                    b = norm_arr[:, :, 2]
                    nir = norm_arr[:, :, 3]
                    metadata["is_multispectral"] = True
                    metadata["sensor"] = "Sentinel-2 Multispectral (RGB + NIR Band 8)"
                    return SatelliteImageContainer(r, g, b, nir, metadata)
                else:
                    r = norm_arr[:, :, 0]
                    g = norm_arr[:, :, 1]
                    b = norm_arr[:, :, 2] if channels >= 3 else norm_arr[:, :, 0]
                    metadata["sensor"] = "GeoTIFF (RGB True Color)"
                    return SatelliteImageContainer(r, g, b, None, metadata)
        except Exception as e:
            # Fall back to PIL if tifffile fails
            pass

    # Read standard image via PIL
    if is_bytes:
        pil_img = Image.open(io.BytesIO(file_path_or_bytes)).convert("RGB")
    else:
        pil_img = Image.open(file_path_or_bytes).convert("RGB")

    arr = np.array(pil_img, dtype=np.float32) / 255.0
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # For standard RGB, check if there's custom metadata attached
    metadata["sensor"] = "Standard RGB Satellite Imagery (3 Bands)"
    return SatelliteImageContainer(r, g, b, None, metadata)
