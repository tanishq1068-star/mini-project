import sys
import os

# Configure Matplotlib cache
os.environ["MPLCONFIGDIR"] = os.path.abspath(os.path.join(os.path.dirname(__file__), ".mpl_cache"))
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routes.api import (
    classify_lulc,
    get_lulc_results,
    get_multi_year_regions,
    analyze_multi_year_timeline,
    get_multi_year_history,
    LULCClassifyRequest,
    MultiYearRequest
)

def test_lulc_and_multiyear():
    print("=" * 60)
    print("TESTING LULC & MULTI-YEAR APIS AND SERVICES")
    print("=" * 60)

    # 1. Test get_lulc_results
    print("\n[TEST 1] Testing get_lulc_results()...")
    data = get_lulc_results()
    print("✓ get_lulc_results() succeeded.")
    print(f"  Classification System: {data.get('classification_system')}")
    print(f"  Classes count: {len(data.get('classes', []))}")
    assert len(data.get("classes", [])) == 5, "Expected 5 classes"
    print(f"  Total Area: {data.get('total_area_ha')} ha")
    print(f"  True-color image present: {bool(data.get('true_color_t2'))}")
    print(f"  Classified map present: {bool(data.get('lulc_map_t2'))}")

    # 2. Test classify_lulc with DT-MSI
    print("\n[TEST 2] Testing classify_lulc(DT-MSI)...")
    req = LULCClassifyRequest(algorithm="dt_msi")
    data = classify_lulc(req)
    print("✓ classify_lulc (DT-MSI) succeeded.")
    print(f"  Algorithm: {data.get('algorithm_name')}")
    assert data.get("algorithm") == "dt_msi"

    # 3. Test classify_lulc with Random Forest
    print("\n[TEST 3] Testing classify_lulc (Random Forest)...")
    req_rf = LULCClassifyRequest(algorithm="random_forest")
    data = classify_lulc(req_rf)
    print("✓ classify_lulc (Random Forest) succeeded.")
    print(f"  Algorithm: {data.get('algorithm_name')}")
    print(f"  Demonstration mode: {data.get('is_demonstration_mode')}")
    assert data.get("is_demonstration_mode") is True

    # 4. Test get_multi_year_regions
    print("\n[TEST 4] Testing get_multi_year_regions()...")
    data = get_multi_year_regions()
    regions = data.get("regions", [])
    print(f"✓ Found {len(regions)} multi-year regions:")
    for r in regions:
        print(f"  - {r['region_id']}: {r['name']} ({len(r['available_years'])} observations)")
    assert len(regions) >= 4, "Expected at least 4 biomes"

    # 5. Test analyze_multi_year_timeline with subset of years
    print("\n[TEST 5] Testing analyze_multi_year_timeline (Subset of years)...")
    req_my = MultiYearRequest(region_id="western_ghats", selected_years=[2016, 2020, 2024])
    data = analyze_multi_year_timeline(req_my)
    print("✓ analyze_multi_year_timeline succeeded:")
    print(f"  Region: {data.get('region_name')}")
    print(f"  Selected years returned: {data.get('selected_years')}")
    assert data.get("selected_years") == [2016, 2020, 2024]
    timeline = data.get("timeline", [])
    assert len(timeline) == 3
    print(f"  Timeline observations: {len(timeline)}")
    print(f"  Thumbnail present on first obs: {bool(timeline[0].get('image_preview'))}")
    assert timeline[0].get("image_preview") is not None

    # 6. Test get_multi_year_history
    print("\n[TEST 6] Testing get_multi_year_history()...")
    data = get_multi_year_history(region_id="bakhtegan_lake")
    print("✓ get_multi_year_history succeeded:")
    print(f"  Region: {data.get('region_name')}")
    print(f"  Cumulative water change: {data.get('cumulative_summary', {}).get('total_water_change_ha')} ha")

    print("\n" + "=" * 60)
    print("ALL LULC & MULTI-YEAR TESTS PASSED SUCCESSFULLY (100%)!")
    print("=" * 60)

if __name__ == "__main__":
    test_lulc_and_multiyear()
