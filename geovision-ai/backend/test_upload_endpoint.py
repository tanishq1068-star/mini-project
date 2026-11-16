import os
import sys
import tempfile
import asyncio

# Ensure MPL writable directory
os.environ["MPLCONFIGDIR"] = os.path.abspath(os.path.join(os.path.dirname(__file__), ".mpl_cache"))

from starlette.datastructures import UploadFile
from routes.api import upload_images

async def run_upload_test():
    print("[TEST] Testing /upload-images API endpoint...")
    p1 = os.path.join("sample_data", "water", "water_2020_t1.tif")
    p2 = os.path.join("sample_data", "water", "water_2024_t2.tif")

    with open(p1, "rb") as f1_disk, open(p2, "rb") as f2_disk:
        # Create temp spool files as FastAPI does
        t1 = tempfile.SpooledTemporaryFile()
        t1.write(f1_disk.read())
        t1.seek(0)

        t2 = tempfile.SpooledTemporaryFile()
        t2.write(f2_disk.read())
        t2.seek(0)

        up1 = UploadFile(filename="water_2020_t1.tif", file=t1)
        up2 = UploadFile(filename="water_2024_t2.tif", file=t2)

        res = await upload_images(
            earlier_image=up1,
            later_image=up2,
            date_earlier="2020-03-10",
            date_later="2024-04-18",
            region_name="Lake Basin Custom Upload",
            sensor="Sentinel-2 MSI"
        )

        print(f"✓ Upload and processing succeeded!")
        print(f"  Session ID: {res.get('id')}")
        print(f"  Region: {res.get('region_name')}")
        print(f"  Water decreased ha: {res.get('water', {}).get('water_area_decreased_ha')}")
        print(f"  Change %: {res.get('change_detection', {}).get('statistics', {}).get('change_percentage')}%")
        assert res.get("id") is not None
        assert "earlier_image" in res
        assert "later_image" in res
        print("✓ All upload endpoint assertions passed!")

if __name__ == "__main__":
    asyncio.run(run_upload_test())
