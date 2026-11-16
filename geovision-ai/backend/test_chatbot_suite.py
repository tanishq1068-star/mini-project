import os
import sys

# Ensure MPLCONFIGDIR is set BEFORE any other imports to use pre-built fontlist cache
os.environ["MPLCONFIGDIR"] = os.path.abspath(os.path.join(os.path.dirname(__file__), ".mpl_cache"))

import io
from starlette.datastructures import UploadFile
from routes.api import (
    chatbot_analyze_single_image,
    chatbot_analyze_dual_images,
    chatbot_chat_query,
    chatbot_generate_report,
    chatbot_load_sample_scenario,
    ChatbotQueryRequest,
    ChatbotReportRequest
)

def run_suite():
    print("=" * 60)
    print("GEOVISION AI - CHATBOT SUITE VERIFICATION")
    print("=" * 60)

    # 1. Test Single Image Upload with PNG
    print("\n[TEST 1] Single Image Upload (PNG)...")
    with open("sample_data/forest/forest_2021_t1.png", "rb") as f:
        png_bytes = f.read()
    up_png = UploadFile(file=io.BytesIO(png_bytes), filename="forest_sample.png")
    res_single_png = chatbot_analyze_single_image(image=up_png, region_name="Western Ghats Test")
    print(f"  [OK] Session: {res_single_png['session_id']}")
    print(f"  [OK] Forest %: {res_single_png['metrics']['forest_percentage']}%")
    print(f"  [OK] Confidence: {res_single_png['confidence_score']}%")
    print(f"  [OK] Visuals: {list(res_single_png['visualizations'].keys())}")
    assert "original_preview" in res_single_png["visualizations"]
    assert "processed_overlay" in res_single_png["visualizations"]

    # 2. Test Single Image Upload with GeoTIFF
    print("\n[TEST 2] Single Image Upload (GeoTIFF)...")
    with open("sample_data/forest/forest_2021_t1.tif", "rb") as f:
        tif_bytes = f.read()
    up_tif = UploadFile(file=io.BytesIO(tif_bytes), filename="forest_sample.tif")
    res_single_tif = chatbot_analyze_single_image(image=up_tif, region_name="Western Ghats Sentinel-2")
    print(f"  [OK] Session: {res_single_tif['session_id']}")
    print(f"  [OK] True NDVI computed: {res_single_tif['is_true_ndvi']}")
    print(f"  [OK] Forest %: {res_single_tif['metrics']['forest_percentage']}%")
    assert res_single_tif["is_true_ndvi"] is True

    # 3. Test Dual Image Comparison
    print("\n[TEST 3] Dual Image Comparison (Historical vs Recent GeoTIFF)...")
    with open("sample_data/forest/forest_2024_t2.tif", "rb") as f:
        tif_bytes_t2 = f.read()
    up_a = UploadFile(file=io.BytesIO(tif_bytes), filename="forest_2021.tif")
    up_b = UploadFile(file=io.BytesIO(tif_bytes_t2), filename="forest_2024.tif")
    res_dual = chatbot_analyze_dual_images(
        image_a=up_a, image_b=up_b,
        date_a="2021-06-15", date_b="2024-07-20",
        region_name="Western Ghats Eco-Corridor"
    )
    print(f"  [OK] Session: {res_dual['session_id']}")
    print(f"  [OK] Vegetation loss: {res_dual['metrics']['vegetation_loss_ha']} ha ({res_dual['metrics']['vegetation_loss_percentage']}%)")
    print(f"  [OK] Hotspots count: {res_dual['metrics']['hotspots_count']}")
    assert res_dual["metrics"]["vegetation_loss_ha"] > 100.0

    # 4. Test Conversational Q&A on Deforestation
    print("\n[TEST 4] Conversational Q&A (Deforestation Query)...")
    q1 = ChatbotQueryRequest(
        query="Does this comparison show deforestation?",
        session_data=res_dual
    )
    ans1 = chatbot_chat_query(q1)
    print(f"  [OK] Engine: {ans1['mode']}")
    print(f"  [OK] Answer preview: {ans1['answer'][:80]}...")
    assert "loss" in ans1["answer"].lower()

    # 5. Test Conversational Q&A on Water Bodies
    print("\n[TEST 5] Conversational Q&A (Water Query on Single Image)...")
    q2 = ChatbotQueryRequest(
        query="Are there any water bodies visible?",
        session_data=res_single_tif
    )
    ans2 = chatbot_chat_query(q2)
    print(f"  [OK] Answer preview: {ans2['answer'][:80]}...")

    # 6. Test One-Click Demonstration Sample Loader
    print("\n[TEST 6] One-Click Demo Sample Endpoint (/chatbot/sample/forest)...")
    sample_res = chatbot_load_sample_scenario("forest")
    print(f"  [OK] Demo Session: {sample_res['session_id']}")
    print(f"  [OK] Net forest shift: {sample_res['metrics']['forest_net_change_percentage']}%")

    # 7. Test PDF Report Generation
    print("\n[TEST 7] PDF Report Generation...")
    r1 = ChatbotReportRequest(session_id=res_dual["session_id"])
    rep = chatbot_generate_report(r1)
    print(f"  [OK] Report URL: {rep['download_url']}")
    assert os.path.exists(os.path.join("reports", rep["filename"]))

    print("\n" + "=" * 60)
    print("ALL 7 CHATBOT BACKEND SUITE TESTS PASSED (100%)!")
    print("=" * 60)

if __name__ == "__main__":
    run_suite()
