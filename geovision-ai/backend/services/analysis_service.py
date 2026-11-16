import os
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from algorithms.geotiff_handler import read_satellite_image, SatelliteImageContainer
from algorithms.ndvi import analyze_deforestation
from algorithms.ndwi import analyze_water_resources
from algorithms.differencing import perform_change_detection
from algorithms.cloud_masking import detect_clouds_and_shadows
from algorithms.lulc import perform_lulc_analysis, classify_lulc_single
from algorithms.accuracy import generate_stratified_validation_points, compute_confusion_matrix_metrics
from algorithms.hotspots import detect_deforestation_hotspots, detect_water_depletion_hotspots
from algorithms.aoi import analyze_custom_aoi
from services.pdf_report_service import generate_pdf_report
from services.sentinel_service import SentinelDataExplorerService
from services.multi_year_service import MultiYearAnalysisService
from services.alert_service import EnvironmentalAlertService
from services.history_service import HistoryService


class AnalysisService:
    def __init__(self, sample_dir: str = "sample_data", reports_dir: str = "reports"):
        self.sample_dir = sample_dir
        self.reports_dir = reports_dir
        self.history_file = os.path.join(reports_dir, "analysis_history.json")
        os.makedirs(reports_dir, exist_ok=True)

        self.sentinel_explorer = SentinelDataExplorerService(sample_dir=sample_dir)
        self.multi_year = MultiYearAnalysisService()
        self.alert_service = EnvironmentalAlertService(alerts_file=os.path.join(reports_dir, "environmental_alerts.json"))
        self.history_service = HistoryService(
            db_path=os.path.join(reports_dir, "geovision_history.db"),
            json_fallback=self.history_file
        )

        self.current_session: Dict[str, Any] = {}
        self.history = self._load_history()

        # Load default forest scenario on startup so application has immediate rich data
        try:
            self.load_sample("forest")
        except Exception as e:
            print(f"Warning loading sample on startup: {e}. Generating datasets...")
            try:
                from services.sample_generator import generate_demonstration_datasets
                generate_demonstration_datasets(self.sample_dir)
                self.load_sample("forest")
            except Exception as e2:
                print(f"Fallback sample generation error: {e2}")

    def _load_history(self):
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def _save_history(self):
        try:
            with open(self.history_file, "w") as f:
                light_history = []
                for item in self.history[-25:]:
                    light_item = {
                        "id": item.get("id"),
                        "timestamp": item.get("timestamp"),
                        "region_name": item.get("region_name"),
                        "date_earlier": item.get("date_earlier"),
                        "date_later": item.get("date_later"),
                        "sensor": item.get("sensor"),
                        "is_live_sentinel": item.get("is_live_sentinel", False),
                        "deforestation_ha": item.get("deforestation", {}).get("total_vegetation_loss_ha"),
                        "water_loss_ha": item.get("water", {}).get("water_area_decreased_ha"),
                        "change_percentage": item.get("change_detection", {}).get("statistics", {}).get("change_percentage"),
                        "pdf_report_path": item.get("pdf_report_path")
                    }
                    light_history.append(light_item)
                json.dump(light_history, f, indent=2)
        except Exception as e:
            print(f"Error saving history: {e}")

    def load_sample(self, scenario: str = "forest", save_history: bool = False):
        """Loads a pre-generated demonstration scenario (forest or water)."""
        if scenario == "water":
            t1_path = os.path.join(self.sample_dir, "water", "water_2020_t1.tif")
            t2_path = os.path.join(self.sample_dir, "water", "water_2024_t2.tif")
            date1 = "2020-03-10"
            date2 = "2024-04-18"
            region_name = "Bakhtegan-Tashk Salt Lake Basin (Demonstration Scenario)"
            sensor = "Sentinel-2 MSI (Demonstration Multispectral)"
            bounds = [29.3500, 53.4000, 29.5800, 53.7500]
        else:
            t1_path = os.path.join(self.sample_dir, "forest", "forest_2021_t1.tif")
            t2_path = os.path.join(self.sample_dir, "forest", "forest_2024_t2.tif")
            date1 = "2021-06-15"
            date2 = "2024-07-20"
            region_name = "Western Ghats Tropical Moist Biosphere (Demonstration Scenario)"
            sensor = "Sentinel-2 MSI (Demonstration Multispectral)"
            bounds = [12.1500, 75.7800, 12.3800, 76.0500]

        container1 = read_satellite_image(t1_path, os.path.basename(t1_path))
        container2 = read_satellite_image(t2_path, os.path.basename(t2_path))

        session_id = f"GV-{uuid.uuid4().hex[:8].upper()}"
        self.current_session = {
            "id": session_id,
            "timestamp": datetime.now().isoformat(),
            "scenario": scenario,
            "is_demonstration_data": True,
            "is_live_sentinel": False,
            "region_name": region_name,
            "date_earlier": date1,
            "date_later": date2,
            "sensor": sensor,
            "cloud_cover_t1": 2.1,
            "cloud_cover_t2": 3.8,
            "bounds": bounds,
            "container1": container1,
            "container2": container2,
            "earlier_image": container1.get_rgb_preview(),
            "later_image": container2.get_rgb_preview(),
            "image_info": {
                "earlier": {
                    "filename": os.path.basename(t1_path),
                    "dimensions": f"{container1.width} x {container1.height} px",
                    "channels": 4 if container1.has_nir else 3,
                    "is_multispectral": container1.has_nir
                },
                "later": {
                    "filename": os.path.basename(t2_path),
                    "dimensions": f"{container2.width} x {container2.height} px",
                    "channels": 4 if container2.has_nir else 3,
                    "is_multispectral": container2.has_nir
                }
            },
            "deforestation": None,
            "water": None,
            "change_detection": None,
            "cloud_masking": None,
            "lulc": None,
            "accuracy": None,
            "pdf_report_path": None
        }

        self.analyze_all(save_history=save_history)
        return self.get_summary()

    def set_custom_images(self, file1_bytes, file1_name, file2_bytes, file2_name,
                          date1: str, date2: str, region_name: str, sensor: Optional[str] = None):
        """Processes custom uploaded satellite images."""
        container1 = read_satellite_image(file1_bytes, file1_name)
        container2 = read_satellite_image(file2_bytes, file2_name)

        session_id = f"GV-{uuid.uuid4().hex[:8].upper()}"
        resolved_sensor = sensor or ("Sentinel-2 Multispectral" if (container1.has_nir or container2.has_nir) else "RGB Optical Satellite")

        self.current_session = {
            "id": session_id,
            "timestamp": datetime.now().isoformat(),
            "scenario": "custom_upload",
            "is_demonstration_data": False,
            "is_live_sentinel": False,
            "region_name": region_name or "Custom Selected Area",
            "date_earlier": date1,
            "date_later": date2,
            "sensor": resolved_sensor,
            "cloud_cover_t1": 1.5,
            "cloud_cover_t2": 2.2,
            "bounds": container1.metadata.get("bounds", [13.0827, 80.2707, 13.1200, 80.3100]),
            "container1": container1,
            "container2": container2,
            "earlier_image": container1.get_rgb_preview(),
            "later_image": container2.get_rgb_preview(),
            "image_info": {
                "earlier": {
                    "filename": file1_name,
                    "dimensions": f"{container1.width} x {container1.height} px",
                    "channels": 4 if container1.has_nir else 3,
                    "is_multispectral": container1.has_nir
                },
                "later": {
                    "filename": file2_name,
                    "dimensions": f"{container2.width} x {container2.height} px",
                    "channels": 4 if container2.has_nir else 3,
                    "is_multispectral": container2.has_nir
                }
            },
            "deforestation": None,
            "water": None,
            "change_detection": None,
            "cloud_masking": None,
            "lulc": None,
            "accuracy": None,
            "pdf_report_path": None
        }

        self.analyze_all(save_history=save_history)
        return self.get_summary()

    def load_sentinel_scenes(self, scene1_id: str, scene2_id: str, date1: str, date2: str,
                             region_name: str, bounds: list, cloud_cover1: float = 2.0, cloud_cover2: float = 3.5):
        """Loads real Sentinel-2 satellite data retrieved via the Satellite Data Explorer."""
        scene_pkg = self.sentinel_explorer.load_processed_scene_pair(
            scene1_id=scene1_id,
            scene2_id=scene2_id,
            region_name=region_name,
            bounds=bounds
        )

        container1 = scene_pkg["container1"]
        container2 = scene_pkg["container2"]
        session_id = f"GV-{uuid.uuid4().hex[:8].upper()}"

        self.current_session = {
            "id": session_id,
            "timestamp": datetime.now().isoformat(),
            "scenario": "sentinel_explorer",
            "is_demonstration_data": False,
            "is_live_sentinel": True,
            "region_name": region_name or scene_pkg["region_name"],
            "date_earlier": date1,
            "date_later": date2,
            "sensor": "Sentinel-2 MSI Level-2A (ESA Copernicus)",
            "cloud_cover_t1": cloud_cover1,
            "cloud_cover_t2": cloud_cover2,
            "scene1_id": scene1_id,
            "scene2_id": scene2_id,
            "bounds": bounds or scene_pkg["bounds"],
            "container1": container1,
            "container2": container2,
            "earlier_image": container1.get_rgb_preview(),
            "later_image": container2.get_rgb_preview(),
            "image_info": {
                "earlier": {
                    "filename": f"{scene1_id[:25]}...Bands.tif",
                    "dimensions": f"{container1.width} x {container1.height} px",
                    "channels": 5,
                    "is_multispectral": True,
                    "bands": ["B02 (Blue)", "B03 (Green)", "B04 (Red)", "B08 (NIR)", "B11 (SWIR)"]
                },
                "later": {
                    "filename": f"{scene2_id[:25]}...Bands.tif",
                    "dimensions": f"{container2.width} x {container2.height} px",
                    "channels": 5,
                    "is_multispectral": True,
                    "bands": ["B02 (Blue)", "B03 (Green)", "B04 (Red)", "B08 (NIR)", "B11 (SWIR)"]
                }
            },
            "deforestation": None,
            "water": None,
            "change_detection": None,
            "cloud_masking": None,
            "lulc": None,
            "accuracy": None,
            "pdf_report_path": None
        }

        self.analyze_all(save_history=save_history)
        return self.get_summary()

    def analyze_all(self, save_history: bool = True):
        """Runs the complete suite of deforestation, water, change detection, LULC, and hotspot algorithms."""
        c1 = self.current_session.get("container1")
        c2 = self.current_session.get("container2")
        if not c1 or not c2:
            raise ValueError("No images loaded in current session.")

        self.current_session["deforestation"] = analyze_deforestation(c1, c2)
        self.current_session["water"] = analyze_water_resources(c1, c2)
        self.current_session["change_detection"] = perform_change_detection(c1, c2)
        self.current_session["lulc"] = perform_lulc_analysis(c1, c2)

        # 1. Hotspot Spatial Clustering
        self.current_session["deforestation_hotspots"] = detect_deforestation_hotspots(
            c1, c2, self.current_session["deforestation"]
        )
        self.current_session["water_hotspots"] = detect_water_depletion_hotspots(
            c1, c2, self.current_session["water"]
        )

        # 2. Trigger Autonomous Environmental Alert Check with Localized Hotspots
        self.alert_service.evaluate_analysis_for_alerts(self.current_session)

        # 3. Persistent History Snapshot in SQLite & JSON (only when requested)
        if save_history:
            self.history_service.save_record(self.current_session)
            self.history.append(self.current_session)
            self._save_history()

    def analyze_aoi(self, polygon_coords: list):
        """Performs change detection strictly within a custom user-drawn AOI polygon."""
        c1 = self.current_session.get("container1")
        c2 = self.current_session.get("container2")
        if not c1 or not c2:
            raise ValueError("No images loaded in current session.")
        res = analyze_custom_aoi(c1, c2, polygon_coords)
        self.current_session["active_aoi"] = res
        return res

    def get_deforestation_hotspots(self):
        """Returns detected deforestation hotspots."""
        if not self.current_session.get("deforestation_hotspots"):
            c1 = self.current_session.get("container1")
            c2 = self.current_session.get("container2")
            if c1 and c2:
                deforest = self.current_session.get("deforestation") or analyze_deforestation(c1, c2)
                self.current_session["deforestation_hotspots"] = detect_deforestation_hotspots(c1, c2, deforest)
        return self.current_session.get("deforestation_hotspots", {"total_hotspots_detected": 0, "hotspots": []})

    def get_water_hotspots(self):
        """Returns detected water depletion hotspots."""
        if not self.current_session.get("water_hotspots"):
            c1 = self.current_session.get("container1")
            c2 = self.current_session.get("container2")
            if c1 and c2:
                water = self.current_session.get("water") or analyze_water_resources(c1, c2)
                self.current_session["water_hotspots"] = detect_water_depletion_hotspots(c1, c2, water)
        return self.current_session.get("water_hotspots", {"total_depletion_hotspots": 0, "hotspots": []})

    def list_history(self):
        """Returns list of all historical analyses."""
        return self.history_service.list_records()

    def save_history_record(self, custom_name: str = None, notes: str = None):
        """Explicitly saves current active session to history."""
        return self.history_service.save_record(self.current_session, custom_name, notes)

    def load_history_record(self, record_id: str):
        """Restores a previous historical analysis session into active memory."""
        snapshot = self.history_service.get_record(record_id)
        if not snapshot:
            raise ValueError(f"Historical record '{record_id}' not found.")
        # Reload sample images or scenario
        scenario = snapshot.get("scenario", "forest")
        if scenario in ["forest", "water"]:
            self.load_sample(scenario)
        # Overlay historical properties
        for k, v in snapshot.items():
            if k not in ["container1", "container2"]:
                self.current_session[k] = v
        return self.get_summary()

    def delete_history_record(self, record_id: str):
        """Deletes a historical record."""
        return self.history_service.delete_record(record_id)

    def compare_history_records(self, id1: str, id2: str):
        """Compares two historical records."""
        return self.history_service.compare_records(id1, id2)

    def run_cloud_masking_analysis(self, target: str = "later", cloud_thresh: float = 0.38, shadow_thresh: float = 0.12):
        """Executes cloud and cloud shadow detection for Sentinel-2 observation."""
        container = self.current_session.get("container2") if target == "later" else self.current_session.get("container1")
        if not container:
            raise ValueError("No valid image loaded.")

        res = detect_clouds_and_shadows(container, cloud_thresh=cloud_thresh, shadow_thresh=shadow_thresh)
        # Store clean dictionary without raw numpy array in session
        clean_res = {k: v for k, v in res.items() if k != "valid_mask"}
        self.current_session["cloud_masking"] = clean_res
        return clean_res

    def run_lulc_classification(self, algorithm: str = "dt_msi", region_id: str = None):
        """Executes 5-Class Land Use and Land Cover (LULC) Classification."""
        if region_id and region_id in ["forest", "water"] and region_id != self.current_session.get("scenario"):
            self.load_sample(region_id)

        c1 = self.current_session.get("container1")
        c2 = self.current_session.get("container2")
        if not c1 or not c2:
            raise ValueError("No images loaded.")

        res = perform_lulc_analysis(c1, c2, algorithm=algorithm)
        self.current_session["lulc"] = res
        return res

    def run_accuracy_assessment(self, n_points_per_class: int = 50):
        """
        Executes Confusion Matrix and accuracy assessment on current LULC classification
        using stratified random validation sampling points.
        """
        c2 = self.current_session.get("container2")
        if not c2:
            raise ValueError("No imagery loaded.")

        lulc_arr = classify_lulc_single(c2)
        validation_pts = generate_stratified_validation_points(lulc_arr, n_points_per_class=n_points_per_class)
        
        ref_classes = [pt["reference_class"] for pt in validation_pts]
        pred_classes = [pt["predicted_class"] for pt in validation_pts]

        metrics = compute_confusion_matrix_metrics(ref_classes, pred_classes)
        metrics["validation_points"] = validation_pts[:100] # return top 100 sample points for display
        metrics["sample_size"] = len(validation_pts)

        self.current_session["accuracy"] = metrics
        return metrics

    def evaluate_custom_validation_points(self, points: List[Dict[str, Any]]):
        """Evaluates user-uploaded or edited validation ground-truth points."""
        ref_classes = [p["reference_class"] for p in points if "reference_class" in p]
        pred_classes = [p["predicted_class"] for p in points if "predicted_class" in p]

        if len(ref_classes) < 5:
            raise ValueError("At least 5 validation points are required.")

        metrics = compute_confusion_matrix_metrics(ref_classes, pred_classes)
        metrics["validation_points"] = points[:100]
        metrics["sample_size"] = len(points)
        return metrics

    def run_deforestation_only(self):
        c1 = self.current_session.get("container1")
        c2 = self.current_session.get("container2")
        if not c1 or not c2:
            raise ValueError("No images loaded.")
        res = analyze_deforestation(c1, c2)
        self.current_session["deforestation"] = res
        return res

    def run_water_only(self):
        c1 = self.current_session.get("container1")
        c2 = self.current_session.get("container2")
        if not c1 or not c2:
            raise ValueError("No images loaded.")
        res = analyze_water_resources(c1, c2)
        self.current_session["water"] = res
        return res

    def run_change_detection_only(self):
        c1 = self.current_session.get("container1")
        c2 = self.current_session.get("container2")
        if not c1 or not c2:
            raise ValueError("No images loaded.")
        res = perform_change_detection(c1, c2)
        self.current_session["change_detection"] = res
        return res

    def create_pdf_report(self):
        if not self.current_session:
            raise ValueError("No active analysis session.")
        
        report_filename = f"GeoVision_Report_{self.current_session['id']}.pdf"
        report_path = os.path.join(self.reports_dir, report_filename)
        generate_pdf_report(self.current_session, report_path)
        self.current_session["pdf_report_path"] = report_path
        return report_path, report_filename

    def get_summary(self):
        """Returns JSON-serializable snapshot of the active analysis session."""
        if not self.current_session:
            return {}
        res = {k: v for k, v in self.current_session.items() if k not in ["container1", "container2"]}
        return res
