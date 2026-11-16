import sys
import os
import json

# Ensure MPL cache dir is set before importing matplotlib
os.environ["MPLCONFIGDIR"] = os.path.abspath("geovision-ai/backend/.mpl_cache")
sys.path.insert(0, os.path.abspath("geovision-ai/backend"))

from routes.api import (
    analysis_service,
    analyze_cloud_masking,
    get_multi_year_regions,
    analyze_multi_year_timeline,
    evaluate_classification_accuracy,
    evaluate_custom_validation,
    classify_lulc,
    get_environmental_alerts,
    acknowledge_alert,
    update_alert_thresholds,
    CloudMaskingRequest,
    MultiYearRequest,
    AccuracyRequest,
    CustomValidationRequest,
    AlertAcknowledgeRequest,
    AlertThresholdsRequest
)

def test_all():
    print("==================================================")
    print("GEOVISION AI - COMPREHENSIVE E2E VERIFICATION TEST")
    print("==================================================")

    # 1. Results check
    summary = analysis_service.get_summary()
    assert summary is not None, "Summary should not be None"
    print(f"[PASS] 1. Session Active: '{summary.get('scenario')}', Region '{summary.get('region_name')}'")

    # 2. Feature 1: Cloud Detection and Masking
    c_req = CloudMaskingRequest(target_image="later", cloud_threshold=0.38, shadow_threshold=0.12)
    cdata = analyze_cloud_masking(c_req)
    assert "cloud_coverage_percentage" in cdata
    print(f"[PASS] 2. Cloud Masking: Cloud {cdata['cloud_coverage_percentage']}%, Shadow {cdata['shadow_coverage_percentage']}%, Clear Surface {cdata['clear_surface_percentage']}%")
    print(f"       NDVI Unmasked vs Masked: {cdata['spectral_impact']['mean_ndvi_unmasked']} -> {cdata['spectral_impact']['mean_ndvi_cloud_masked']} (Delta: {cdata['spectral_impact']['ndvi_correction_delta']})")

    # 3. Feature 2: Multi-Year Analysis
    regions_res = get_multi_year_regions()
    regions = regions_res.get("regions", [])
    assert len(regions) >= 4, f"Expected at least 4 regions, got {len(regions)}"
    print(f"[PASS] 3a. Multi-Year Regions: {len(regions)} regions available")

    my_req = MultiYearRequest(region_id="western_ghats", selected_years=[2014, 2016, 2020, 2024])
    my_data = analyze_multi_year_timeline(my_req)
    assert len(my_data["timeline"]) == 4
    print(f"[PASS] 3b. Multi-Year Timeline: {my_data['span_analyzed']['total_years']}-Year Span across {len(my_data['timeline'])} epochs")
    print(f"       Forest Velocity: {my_data['cumulative_summary']['annual_forest_loss_velocity_ha_yr']} ha/yr, 10-Yr Span Available: {my_data['intervals']['ten_year']['available']}")

    # 4. Feature 3: Accuracy Assessment
    acc_req = AccuracyRequest(sample_points_per_class=30)
    acc_data = evaluate_classification_accuracy(acc_req)
    assert acc_data["overall_accuracy"] > 0
    print(f"[PASS] 4a. Accuracy Assessment: Overall Accuracy: {acc_data['overall_accuracy']}%, Cohen's Kappa: {acc_data['cohens_kappa']}")

    custom_pts = [
        {"id": 1, "reference_class": 1, "predicted_class": 1, "x": 10, "y": 10},
        {"id": 2, "reference_class": 1, "predicted_class": 1, "x": 20, "y": 20},
        {"id": 3, "reference_class": 2, "predicted_class": 2, "x": 30, "y": 30},
        {"id": 4, "reference_class": 3, "predicted_class": 3, "x": 40, "y": 40},
        {"id": 5, "reference_class": 4, "predicted_class": 4, "x": 50, "y": 50},
        {"id": 6, "reference_class": 5, "predicted_class": 5, "x": 60, "y": 60},
    ]
    cv_req = CustomValidationRequest(points=custom_pts)
    cv_data = evaluate_custom_validation(cv_req)
    assert cv_data["overall_accuracy"] == 100.0
    print(f"[PASS] 4b. Custom Validation Points: 100.0% OA verified")

    # 5. Feature 4: LULC Classification
    lulc_data = classify_lulc()
    assert len(lulc_data["classes"]) == 5
    assert len(lulc_data["transition_matrix"]) == 5
    print(f"[PASS] 5. LULC Classification: 5 Classes: {[c['name'] for c in lulc_data['classes']]}")
    print(f"       Total Area: {lulc_data['total_area_ha']} ha, Transition Matrix: 5x5 cross-tabulation computed")

    # 6. Feature 5: Environmental Alerts
    alerts_data = get_environmental_alerts()
    assert alerts_data["summary"]["total_alerts"] >= 2
    print(f"[PASS] 6a. Environmental Alerts: {alerts_data['summary']['total_alerts']} alerts ({alerts_data['summary']['critical_count']} CRITICAL)")

    first_alert = alerts_data["alerts"][0]
    ack_req = AlertAcknowledgeRequest(
        alert_id=first_alert["id"],
        status="Acknowledged",
        user_name="Senior Remote Sensing Engineer",
        notes="Verified ground radar imagery."
    )
    ack_res = acknowledge_alert(ack_req)
    assert ack_res["status"] == "success"
    print(f"[PASS] 6b. Alert Acknowledged: ID {first_alert['id']} updated to 'Acknowledged'")

    thresh_req = AlertThresholdsRequest(thresholds={"forest_loss_warning_pct": 6.5, "water_loss_critical_pct": 19.5})
    thresh_res = update_alert_thresholds(thresh_req)
    assert thresh_res["status"] == "success"
    print(f"[PASS] 6c. Alert Thresholds: Configured dynamically: {thresh_res['thresholds']['forest_loss_warning_pct']}% forest warning")

    print("\n==================================================")
    print("ALL 5 ADVANCED BACKEND MODULES FULLY OPERATIONAL!")
    print("==================================================")

if __name__ == "__main__":
    test_all()
