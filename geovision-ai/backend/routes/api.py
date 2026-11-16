import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from services.analysis_service import AnalysisService
from services.chatbot_service import SatelliteChatbotService

router = APIRouter()

# Initialize service with resilient path resolution across monorepo & Render root directories
def _resolve_dir(candidates, fallback):
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    os.makedirs(fallback, exist_ok=True)
    return os.path.abspath(fallback)

_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_repo_dir = os.path.abspath(os.path.join(_backend_dir, ".."))

_sample_candidates = [
    os.path.join(_backend_dir, "sample_data"),
    os.path.join(_repo_dir, "sample_data"),
    os.path.join(os.getcwd(), "sample_data"),
]
_reports_candidates = [
    os.path.join(_backend_dir, "reports"),
    os.path.join(_repo_dir, "reports"),
    os.path.join(os.getcwd(), "reports"),
]

sample_dir_resolved = _resolve_dir(_sample_candidates, os.path.join(_backend_dir, "sample_data"))
reports_dir_resolved = _resolve_dir(_reports_candidates, os.path.join(_backend_dir, "reports"))

analysis_service = AnalysisService(
    sample_dir=sample_dir_resolved,
    reports_dir=reports_dir_resolved
)

chatbot_service = SatelliteChatbotService(
    reports_dir=reports_dir_resolved
)


# Request Models
class SentinelSearchRequest(BaseModel):
    lat: float
    lon: float
    start_date: str
    end_date: str
    max_cloud_cover: Optional[float] = 20.0


class SentinelProcessRequest(BaseModel):
    scene1_id: str
    scene2_id: str
    date1: str
    date2: str
    region_name: Optional[str] = "Selected Sentinel-2 Region"
    bounds: Optional[List[float]] = None
    cloud_cover1: Optional[float] = 2.0
    cloud_cover2: Optional[float] = 3.5


class CloudMaskingRequest(BaseModel):
    target_image: Optional[str] = "later" # "earlier" or "later"
    cloud_threshold: Optional[float] = 0.38
    shadow_threshold: Optional[float] = 0.12


class MultiYearRequest(BaseModel):
    region_id: str
    selected_years: Optional[List[int]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class LULCClassifyRequest(BaseModel):
    region_id: Optional[str] = None
    algorithm: Optional[str] = "dt_msi" # "dt_msi" or "random_forest"
    date1: Optional[str] = None
    date2: Optional[str] = None


class AccuracyRequest(BaseModel):
    sample_points_per_class: Optional[int] = 50


class CustomValidationRequest(BaseModel):
    points: List[Dict[str, Any]]


class AlertAcknowledgeRequest(BaseModel):
    alert_id: str
    status: str = "Acknowledged" # "Acknowledged" or "Resolved"
    user_name: Optional[str] = "GIS Analyst"
    notes: Optional[str] = None


class AlertThresholdsRequest(BaseModel):
    thresholds: Dict[str, float]


class AOIRequest(BaseModel):
    polygon: List[Any] # list of [lat, lon] coordinates


class HistorySaveRequest(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None


class HistoryCompareRequest(BaseModel):
    id1: str
    id2: str


class ChatbotQueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    session_data: Optional[Dict[str, Any]] = None
    chat_history: Optional[List[Dict[str, str]]] = None


class ChatbotReportRequest(BaseModel):
    session_id: str


# Existing & Enhanced Endpoints
@router.get("/samples")
def get_available_samples():
    """Lists available pre-packaged demonstration datasets."""
    return {
        "samples": [
            {
                "id": "forest",
                "title": "Western Ghats Eco-Corridor (Forest Cover Loss)",
                "description": "Tropical moist canopy showing agricultural encroachment, logging corridors, and timber extraction between 2021 and 2024.",
                "dates": ["2021-06-15", "2024-07-20"],
                "sensor": "Sentinel-2 MSI (4-Band Multispectral NIR)",
                "coordinates": [12.1500, 75.7800],
                "type": "Deforestation"
            },
            {
                "id": "water",
                "title": "Bakhtegan-Tashk Salt Lake Basin (Water Depletion)",
                "description": "Major terminal lake and wetland system experiencing dramatic surface water retreat, exposed dry lakebed, and saline crust between 2020 and 2024.",
                "dates": ["2020-03-10", "2024-04-18"],
                "sensor": "Sentinel-2 MSI (4-Band Multispectral NIR)",
                "coordinates": [29.3500, 53.4000],
                "type": "Water Resources"
            }
        ]
    }


@router.post("/load-sample/{scenario}")
def load_sample_scenario(scenario: str):
    """Loads a sample scenario and runs instant analysis."""
    if scenario not in ["forest", "water"]:
        raise HTTPException(status_code=400, detail="Unknown scenario. Choose 'forest' or 'water'.")
    try:
        summary = analysis_service.load_sample(scenario)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sample: {str(e)}")


@router.post("/sentinel/search")
def search_sentinel_imagery(req: SentinelSearchRequest):
    """Searches for Sentinel-2 MSI Level-2A imagery."""
    try:
        results = analysis_service.sentinel_explorer.search_scenes(
            lat=req.lat,
            lon=req.lon,
            start_date=req.start_date,
            end_date=req.end_date,
            max_cloud_cover=req.max_cloud_cover or 20.0
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sentinel-2 search failed: {str(e)}")


@router.post("/sentinel/process-scenes")
def process_sentinel_scenes(req: SentinelProcessRequest):
    """Processes two Sentinel-2 scenes into change detection pipeline."""
    try:
        summary = analysis_service.load_sentinel_scenes(
            scene1_id=req.scene1_id,
            scene2_id=req.scene2_id,
            date1=req.date1,
            date2=req.date2,
            region_name=req.region_name,
            bounds=req.bounds,
            cloud_cover1=req.cloud_cover1 or 2.0,
            cloud_cover2=req.cloud_cover2 or 3.5
        )
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sentinel processing error: {str(e)}")


# =========================================================================
# FEATURE 1: CLOUD DETECTION AND MASKING ENDPOINTS
# =========================================================================
@router.post("/cloud-masking/analyze")
def analyze_cloud_masking(req: CloudMaskingRequest = CloudMaskingRequest()):
    """
    Detects cloud-covered pixels, cirrus, and cloud shadows.
    Computes cloud coverage percentage, generates cloud masks, and calculates
    cloud-masked NDVI and NDWI metrics.
    """
    try:
        result = analysis_service.run_cloud_masking_analysis(
            target=req.target_image or "later",
            cloud_thresh=req.cloud_threshold or 0.38,
            shadow_thresh=req.shadow_threshold or 0.12
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloud masking analysis failed: {str(e)}")


# =========================================================================
# FEATURE 2: MULTI-YEAR CHANGE ANALYSIS ENDPOINTS
# =========================================================================
@router.get("/multi-year/regions")
def get_multi_year_regions():
    """Lists available geographical regions with multi-year satellite observation series."""
    try:
        return analysis_service.multi_year.get_available_regions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/multi-year/analyze")
def analyze_multi_year_timeline(req: MultiYearRequest):
    """
    Performs multi-year environmental analysis over 3, 5, or 10-year timelines.
    Calculates annual forest and water coverage, rate of change, and long-term trends.
    """
    try:
        result = analysis_service.multi_year.analyze_region_timeline(
            region_id=req.region_id,
            selected_years=req.selected_years,
            start_date=req.start_date,
            end_date=req.end_date
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-year analysis failed: {str(e)}")


@router.get("/multi-year/history")
def get_multi_year_history(region_id: Optional[str] = "western_ghats"):
    """Returns multi-year historical logs and timeline for the target region."""
    try:
        return analysis_service.multi_year.analyze_region_timeline(region_id=region_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch multi-year history: {str(e)}")


# =========================================================================
# FEATURE 3: ACCURACY ASSESSMENT ENDPOINTS
# =========================================================================
@router.post("/accuracy/evaluate")
def evaluate_classification_accuracy(req: AccuracyRequest = AccuracyRequest()):
    """
    Evaluates remote sensing classification accuracy using stratified random sampling.
    Computes Confusion Matrix, Overall Accuracy, Producer Accuracy, User Accuracy, F1 Score, and Cohen's Kappa.
    """
    try:
        result = analysis_service.run_accuracy_assessment(
            n_points_per_class=req.sample_points_per_class or 50
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Accuracy evaluation failed: {str(e)}")


@router.post("/accuracy/upload-validation")
def evaluate_custom_validation(req: CustomValidationRequest):
    """Calculates accuracy metrics from uploaded reference validation labels."""
    try:
        result = analysis_service.evaluate_custom_validation_points(req.points)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation evaluation failed: {str(e)}")


# =========================================================================
# FEATURE 4: LAND USE AND LAND COVER (LULC) ENDPOINTS
# =========================================================================
@router.post("/lulc/classify")
def classify_lulc(req: Optional[LULCClassifyRequest] = None):
    """
    Executes 5-Class Land Use and Land Cover (LULC) Classification:
    Forest, Water, Vegetation, Urban Areas, Barren Land.
    Generates category-wise areas, distributions, and Land Cover Transition Matrix.
    """
    try:
        alg = req.algorithm if req and req.algorithm else "dt_msi"
        reg = req.region_id if req and req.region_id else None
        result = analysis_service.run_lulc_classification(algorithm=alg, region_id=reg)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LULC classification failed: {str(e)}")


@router.get("/lulc/results")
def get_lulc_results():
    """Retrieves current or cached 5-Class LULC classification results."""
    try:
        if not analysis_service.current_session.get("lulc"):
            analysis_service.run_lulc_classification()
        return analysis_service.current_session.get("lulc", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch LULC results: {str(e)}")


# =========================================================================
# FEATURE 5: ENVIRONMENTAL ALERT SYSTEM ENDPOINTS
# =========================================================================
@router.get("/alerts")
def get_environmental_alerts():
    """Retrieves all detected environmental alerts, status, and configurable thresholds."""
    try:
        return analysis_service.alert_service.get_alerts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/acknowledge")
def acknowledge_alert(req: AlertAcknowledgeRequest):
    """Allows users to acknowledge or resolve an environmental alert."""
    try:
        updated = analysis_service.alert_service.update_alert_status(
            alert_id=req.alert_id,
            new_status=req.status,
            user_name=req.user_name or "GIS Analyst",
            notes=req.notes
        )
        if not updated:
            raise HTTPException(status_code=404, detail=f"Alert with ID {req.alert_id} not found.")
        return {"status": "success", "alert": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/thresholds")
def update_alert_thresholds(req: AlertThresholdsRequest):
    """Updates configurable alert triggers for forest and water loss."""
    try:
        res = analysis_service.alert_service.update_thresholds(req.thresholds)
        return {"status": "success", "thresholds": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================================
# FEATURE 1: CUSTOM AREA OF INTEREST (AOI) ENDPOINT
# =========================================================================
@router.post("/aoi/analyze")
def analyze_custom_aoi_polygon(req: AOIRequest):
    """
    Performs multi-spectral NDVI/NDWI and change detection strictly within
    a user-drawn Area of Interest (AOI) polygon on the interactive map.
    """
    try:
        res = analysis_service.analyze_aoi(req.polygon)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"AOI Analysis failed: {str(e)}")


# =========================================================================
# FEATURE 2 & 3: HOTSPOT DETECTION ENDPOINTS
# =========================================================================
@router.get("/hotspots/deforestation")
def get_deforestation_hotspots():
    """Returns contiguous spatial clusters of high-loss deforestation hotspots."""
    try:
        return analysis_service.get_deforestation_hotspots()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hotspots/water")
def get_water_depletion_hotspots():
    """Returns contiguous spatial clusters of reservoir and lake depletion hotspots."""
    try:
        return analysis_service.get_water_hotspots()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================================
# FEATURE 5: ANALYSIS HISTORY & COMPARISON ENDPOINTS
# =========================================================================
@router.get("/history")
def get_analysis_history():
    """Retrieves all saved multi-temporal analysis sessions from SQLite and JSON."""
    try:
        records = analysis_service.list_history()
        return {
            "records": records,
            "history": records,
            "total_records": len(records)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history/save")
def save_analysis_history(req: HistorySaveRequest):
    """Explicitly saves current active session into persistent SQLite & JSON storage."""
    try:
        record = analysis_service.save_history_record(req.name, req.notes)
        return {"status": "success", "record": record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history/load/{record_id}")
def load_analysis_history(record_id: str):
    """Restores a previous historical analysis session into active memory."""
    try:
        summary = analysis_service.load_history_record(record_id)
        return {"status": "success", "session": summary}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/history/{record_id}")
def delete_analysis_history(record_id: str):
    """Deletes a saved analysis session record."""
    try:
        deleted = analysis_service.delete_history_record(record_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Record not found")
        return {"status": "success", "message": f"Record {record_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history/compare")
def compare_analysis_sessions(req: HistoryCompareRequest):
    """Compares two historical analysis sessions and calculates trajectory differences."""
    try:
        res = analysis_service.compare_history_records(req.id1, req.id2)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _safe_read_upload(upload_file: UploadFile) -> bytes:
    """Reads uploaded file bytes synchronously from underlying file pointer without threadpool deadlocks."""
    if hasattr(upload_file, "file") and upload_file.file is not None:
        try:
            upload_file.file.seek(0)
        except Exception:
            pass
        data = upload_file.file.read()
        if isinstance(data, (bytes, bytearray)):
            return bytes(data)
    return b""


# Core & Image Upload Endpoints
@router.post("/upload-images")
def upload_images(
    earlier_image: UploadFile = File(...),
    later_image: UploadFile = File(...),
    date_earlier: str = Form(...),
    date_later: str = Form(...),
    region_name: str = Form("Selected Region"),
    sensor: Optional[str] = Form(None)
):
    allowed_exts = [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".geotiff"]
    ext1 = os.path.splitext(earlier_image.filename)[1].lower()
    ext2 = os.path.splitext(later_image.filename)[1].lower()

    if ext1 not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Earlier image format '{ext1}' is unsupported.")
    if ext2 not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Later image format '{ext2}' is unsupported.")

    try:
        content1 = _safe_read_upload(earlier_image)
        content2 = _safe_read_upload(later_image)

        summary = analysis_service.set_custom_images(
            file1_bytes=content1,
            file1_name=earlier_image.filename,
            file2_bytes=content2,
            file2_name=later_image.filename,
            date1=date_earlier,
            date2=date_later,
            region_name=region_name,
            sensor=sensor
        )
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/analyze/deforestation")
def analyze_deforestation_endpoint():
    try:
        result = analysis_service.run_deforestation_only()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/water")
def analyze_water_endpoint():
    try:
        result = analysis_service.run_water_only()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/change-detection")
def analyze_change_detection_endpoint():
    try:
        result = analysis_service.run_change_detection_only()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results")
def get_current_results():
    return analysis_service.get_summary()


@router.post("/generate-report")
def generate_report():
    try:
        report_path, filename = analysis_service.create_pdf_report()
        return {
            "status": "success",
            "message": "Report generated successfully",
            "filename": filename,
            "download_url": f"/api/download-report/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")


@router.get("/download-report/{filename}")
def download_report(filename: str):
    file_path = os.path.join(analysis_service.reports_dir, filename)
    if not os.path.exists(file_path):
        file_path = os.path.join(chatbot_service.reports_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Requested report not found.")
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# =========================================================================
# AI SATELLITE IMAGE ANALYSIS CHATBOT ENDPOINTS
# =========================================================================
@router.post("/chatbot/analyze-single")
def chatbot_analyze_single_image(
    image: UploadFile = File(...),
    region_name: Optional[str] = Form(None)
):
    """
    Analyzes a single uploaded satellite image for the AI Assistant.
    Validates file formats (PNG, JPG, JPEG, TIFF, GeoTIFF).
    Computes vegetation index (NDVI / VARI), 5-class LULC, suspicious clearing clusters,
    and visual overlays.
    """
    allowed_exts = [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".geotiff"]
    ext = os.path.splitext(image.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Please upload PNG, JPG, JPEG, TIFF, or GeoTIFF."
        )

    try:
        content = _safe_read_upload(image)
        result = chatbot_service.analyze_single_image(
            file_bytes=content,
            filename=image.filename,
            region_name=region_name
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Single satellite image analysis failed: {str(e)}")


@router.post("/chatbot/analyze-dual")
def chatbot_analyze_dual_images(
    image_a: UploadFile = File(...),
    image_b: UploadFile = File(...),
    date_a: Optional[str] = Form("Baseline"),
    date_b: Optional[str] = Form("Recent"),
    region_name: Optional[str] = Form(None)
):
    """
    Compares two multi-temporal satellite images for the AI Assistant.
    Aligns both observations, computes verified vegetation loss and water shifts,
    and outputs comparison slider visualizations and difference heatmaps.
    """
    allowed_exts = [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".geotiff"]
    ext_a = os.path.splitext(image_a.filename)[1].lower()
    ext_b = os.path.splitext(image_b.filename)[1].lower()

    if ext_a not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Image A format '{ext_a}' is unsupported.")
    if ext_b not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Image B format '{ext_b}' is unsupported.")

    try:
        content_a = _safe_read_upload(image_a)
        content_b = _safe_read_upload(image_b)

        result = chatbot_service.analyze_dual_images(
            file_a_bytes=content_a,
            file_a_name=image_a.filename,
            file_b_bytes=content_b,
            file_b_name=image_b.filename,
            date_a=date_a,
            date_b=date_b,
            region_name=region_name
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-temporal dual image analysis failed: {str(e)}")


@router.post("/chatbot/chat")
def chatbot_chat_query(req: ChatbotQueryRequest):
    """
    Answers natural language questions strictly grounded in the uploaded satellite image analysis.
    """
    try:
        session = req.session_data
        if not session and req.session_id:
            session = chatbot_service.active_sessions.get(req.session_id)

        response = chatbot_service.answer_query(
            user_query=req.query,
            session_data=session,
            chat_history=req.chat_history
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot reasoning error: {str(e)}")


@router.post("/chatbot/generate-report")
def chatbot_generate_report(req: ChatbotReportRequest):
    """
    Generates a downloadable PDF assessment report for the active AI Assistant session.
    """
    try:
        report_path, filename = chatbot_service.generate_pdf_report(req.session_id)
        return {
            "status": "success",
            "message": "AI Assistant Assessment Report created successfully.",
            "filename": filename,
            "download_url": f"/api/download-report/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI Assistant report: {str(e)}")


@router.post("/chatbot/sample/{scenario}")
def chatbot_load_sample_scenario(scenario: str):
    """
    Loads pre-packaged demonstration satellite data into the AI Assistant for one-click testing.
    Scenarios: 'forest' (Deforestation study) or 'water' (Water depletion study).
    """
    if scenario not in ["forest", "water"]:
        raise HTTPException(status_code=400, detail="Choose either 'forest' or 'water'.")

    try:
        if scenario == "water":
            p1 = os.path.join(sample_dir_resolved, "water", "water_2020_t1.tif")
            p2 = os.path.join(sample_dir_resolved, "water", "water_2024_t2.tif")
            d1, d2 = "2020-03-10", "2024-04-18"
            rname = "Bakhtegan-Tashk Salt Lake Basin"
        else:
            p1 = os.path.join(sample_dir_resolved, "forest", "forest_2021_t1.tif")
            p2 = os.path.join(sample_dir_resolved, "forest", "forest_2024_t2.tif")
            d1, d2 = "2021-06-15", "2024-07-20"
            rname = "Western Ghats Tropical Moist Biosphere"

        with open(p1, "rb") as f1, open(p2, "rb") as f2:
            b1 = f1.read()
            b2 = f2.read()

        result = chatbot_service.analyze_dual_images(
            file_a_bytes=b1,
            file_a_name=os.path.basename(p1),
            file_b_bytes=b2,
            file_b_name=os.path.basename(p2),
            date_a=d1,
            date_b=d2,
            region_name=rname
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sample {scenario}: {str(e)}")
