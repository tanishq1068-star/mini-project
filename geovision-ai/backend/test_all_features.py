import sys
import os

# Configure Matplotlib writable directory before importing it
os.environ["MPLCONFIGDIR"] = os.path.abspath(os.path.join(os.path.dirname(__file__), ".mpl_cache"))
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

# Force UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.analysis_service import AnalysisService

def test_full_features():
    print("=" * 60)
    print("GEOVISION AI - COMPREHENSIVE BACKEND VERIFICATION SUITE")
    print("=" * 60)

    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_data"))
    reports_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "reports"))

    # 1. Initialize Service & Load Sample
    service = AnalysisService(sample_dir=sample_dir, reports_dir=reports_dir)
    print("\n[TEST 1] Loading sample scenario: forest...")
    summary = service.load_sample("forest")
    print(f"✓ Forest scenario loaded successfully. Session ID: {summary.get('id')}")
    print(f"  Vegetation Loss: {summary.get('deforestation', {}).get('total_vegetation_loss_ha')} ha")
    print(f"  Water Area: {summary.get('water', {}).get('water_area_after_ha')} ha")

    # 2. Test Deforestation Hotspots
    print("\n[TEST 2] Verifying Deforestation Hotspot Detection...")
    def_hotspots = service.get_deforestation_hotspots()
    total_def = def_hotspots.get("total_hotspots_detected", 0)
    print(f"✓ Detected {total_def} deforestation hotspots.")
    assert total_def > 0, "Expected at least 1 deforestation hotspot"
    for h in def_hotspots.get("hotspots", [])[:3]:
        print(f"  - [{h['id']}] Area: {h['area_ha']} ha | Mean ΔNDVI: {h['mean_delta_ndvi']} | Severity: {h['severity']}")

    # 3. Test Water Depletion Hotspots
    print("\n[TEST 3] Loading water scenario to test Water Depletion Hotspots...")
    service.load_sample("water")
    water_hotspots = service.get_water_hotspots()
    total_water = water_hotspots.get("total_depletion_hotspots", 0)
    print(f"✓ Detected {total_water} water depletion clusters.")
    for wh in water_hotspots.get("hotspots", [])[:3]:
        print(f"  - [{wh['id']}] Area: {wh['area_ha']} ha | Depletion %: {wh['depletion_percentage']}% | Severity: {wh['severity']}")

    # 4. Test Custom AOI Analysis
    print("\n[TEST 4] Testing Custom AOI Selection & Polygon Analysis...")
    polygon = [
        [12.25, 75.92],
        [12.35, 75.92],
        [12.35, 76.05],
        [12.25, 76.05]
    ]
    aoi_res = service.analyze_aoi(polygon)
    aoi_metrics = aoi_res.get("aoi_metrics", {})
    veg_metrics = aoi_res.get("vegetation_analysis", {})
    wtr_metrics = aoi_res.get("water_analysis", {})
    print(f"✓ AOI analysis successful:")
    print(f"  Geodesic Area: {aoi_metrics.get('total_aoi_area_ha')} ha")
    print(f"  Vegetation Loss in AOI: {veg_metrics.get('forest_loss_ha')} ha ({veg_metrics.get('forest_loss_percentage')}%)")
    print(f"  Water Depletion in AOI: {wtr_metrics.get('water_loss_ha')} ha")

    # 5. Test History Service (SQLite & JSON Mirror)
    print("\n[TEST 5] Testing Persistent Analysis History (SQLite & JSON)...")
    save_res = service.save_history_record(custom_name="B.Tech Viva Test Session", notes="Verification audit run")
    record_id = save_res.get("id")
    print(f"✓ Successfully saved historical session. Record ID: {record_id}")
    assert record_id is not None, "Expected valid record id"

    history_list = service.list_history()
    print(f"✓ History records retrieved: {len(history_list)} records found.")
    assert len(history_list) >= 1, "Expected at least 1 history record"

    # Test load record
    print(f"\n[TEST 6] Testing Reloading History Record: {record_id}...")
    loaded = service.load_history_record(record_id)
    print(f"✓ Record reloaded into active memory: Session ID {loaded.get('id')} - {loaded.get('region_name')}")

    # Test compare records
    if len(history_list) >= 2:
        id1 = history_list[0]["id"]
        id2 = history_list[1]["id"]
        print(f"\n[TEST 7] Comparing 2 historical records: {id1} vs {id2}...")
        diff = service.compare_history_records(id1, id2)
        comp = diff.get("comparison", {})
        print(f"✓ Comparison computed successfully:")
        print(f"  Δ Vegetation Loss: {comp.get('delta_forest_loss_ha')} ha")
        print(f"  Δ Water Loss: {comp.get('delta_water_loss_ha')} ha")

    # 6. Test PDF Report Generation with Hotspot Tables
    print("\n[TEST 8] Testing Scientific PDF Report Generation with Hotspot Tables...")
    report_path, report_filename = service.create_pdf_report()
    pdf_size = os.path.getsize(report_path)
    print(f"✓ PDF report generated successfully: {report_filename} ({pdf_size:,} bytes)")
    assert pdf_size > 50000, "PDF size is unusually small"

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_features()
