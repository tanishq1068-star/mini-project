import os
import json
import uuid
from datetime import datetime

DEFAULT_THRESHOLDS = {
    "forest_loss_warning_pct": 5.0,
    "forest_loss_critical_pct": 12.0,
    "forest_loss_critical_ha": 150.0,
    "water_loss_warning_pct": 8.0,
    "water_loss_critical_pct": 18.0,
    "water_loss_critical_ha": 80.0
}


class EnvironmentalAlertService:
    def __init__(self, alerts_file: str = "reports/environmental_alerts.json"):
        self.alerts_file = alerts_file
        self.thresholds = DEFAULT_THRESHOLDS.copy()
        os.makedirs(os.path.dirname(alerts_file), exist_ok=True)
        self.alerts = self._load_alerts()

    def _load_alerts(self):
        if os.path.exists(self.alerts_file):
            try:
                with open(self.alerts_file, "r") as f:
                    return json.load(f)
            except Exception:
                return []
        # Initial seed alerts for demonstration
        return [
            {
                "id": "ALT-2024-001",
                "timestamp": "2024-07-20T10:15:00",
                "region_name": "Western Ghats Eco-Corridor, India",
                "coordinates": [12.2650, 75.9150],
                "event_type": "Deforestation Event",
                "severity": "CRITICAL",
                "message": "Severe canopy clearance detected: 660.68 ha deforested across logging corridor sector.",
                "metrics": {
                    "canopy_loss_ha": 660.68,
                    "loss_pct": 28.59,
                    "threshold_exceeded": "Forest Loss Critical Threshold (12%)"
                },
                "status": "Active",
                "verification": "Automatically Detected (Pending Ground-Truth)",
                "acknowledged_by": None,
                "notes": "Automated Sentinel-2 L2A differencing trigger."
            },
            {
                "id": "ALT-2024-002",
                "timestamp": "2024-04-18T08:30:00",
                "region_name": "Bakhtegan-Tashk Salt Lake Basin",
                "coordinates": [29.4650, 53.5750],
                "event_type": "Water Desiccation Event",
                "severity": "CRITICAL",
                "message": "Dramatic reservoir shrinkage: 64.92% surface water reduction; exposed saline lakebed.",
                "metrics": {
                    "water_loss_ha": 648.5,
                    "loss_pct": 64.92,
                    "threshold_exceeded": "Water Desiccation Critical Threshold (18%)"
                },
                "status": "Acknowledged",
                "verification": "Independently Verified (Copernicus Drought Observatory)",
                "acknowledged_by": "Senior GIS Specialist",
                "notes": "Corroborated by regional hydrological drought reports."
            }
        ]

    def _save_alerts(self):
        try:
            with open(self.alerts_file, "w") as f:
                json.dump(self.alerts, f, indent=2)
        except Exception as e:
            print(f"Error saving alerts: {e}")

    def evaluate_analysis_for_alerts(self, session_data):
        """
        Scans a completed multi-temporal analysis session against configurable thresholds
        and automatically creates an alert if deforestation or water loss bounds are breached.
        """
        deforest = session_data.get("deforestation", {})
        water = session_data.get("water", {})
        region = session_data.get("region_name", "Target Region")
        coords = session_data.get("bounds", [12.2, 75.9, 12.4, 76.1])
        center = [(coords[0] + coords[2])/2.0, (coords[1] + coords[3])/2.0] if len(coords) == 4 else [12.2, 75.9]

        f_loss_ha = deforest.get("total_vegetation_loss_ha", 0)
        f_loss_pct = deforest.get("loss_percentage_of_initial", 0)

        w_loss_ha = water.get("water_area_decreased_ha", 0)
        w_loss_pct = abs(water.get("percentage_water_change", 0)) if water.get("percentage_water_change", 0) < 0 else 0

        new_alerts = []

        # 1. Deforestation Check
        if f_loss_pct >= self.thresholds["forest_loss_critical_pct"] or f_loss_ha >= self.thresholds["forest_loss_critical_ha"]:
            alert = {
                "id": f"ALT-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": datetime.now().isoformat(),
                "region_name": region,
                "coordinates": center,
                "event_type": "Rapid Deforestation Event",
                "severity": "CRITICAL",
                "message": f"Critical canopy reduction: {f_loss_ha:,.2f} ha deforested ({f_loss_pct:.2f}% of baseline).",
                "metrics": {
                    "canopy_loss_ha": f_loss_ha,
                    "loss_pct": f_loss_pct,
                    "threshold_exceeded": f"Critical Threshold ({self.thresholds['forest_loss_critical_pct']}%)"
                },
                "status": "Active",
                "verification": "Automatically Detected (Pending Ground-Truth)",
                "acknowledged_by": None,
                "notes": f"Detected during {session_data.get('date_earlier')} to {session_data.get('date_later')} analysis."
            }
            new_alerts.append(alert)
        elif f_loss_pct >= self.thresholds["forest_loss_warning_pct"]:
            alert = {
                "id": f"ALT-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": datetime.now().isoformat(),
                "region_name": region,
                "coordinates": center,
                "event_type": "Vegetation Stress Warning",
                "severity": "WARNING",
                "message": f"Moderate vegetation loss detected: {f_loss_ha:,.2f} ha ({f_loss_pct:.2f}%).",
                "metrics": {
                    "canopy_loss_ha": f_loss_ha,
                    "loss_pct": f_loss_pct,
                    "threshold_exceeded": f"Warning Threshold ({self.thresholds['forest_loss_warning_pct']}%)"
                },
                "status": "Active",
                "verification": "Automatically Detected (Pending Ground-Truth)",
                "acknowledged_by": None,
                "notes": "Moderate canopy thinning observed."
            }
            new_alerts.append(alert)

        # 2. Water Loss Check
        if w_loss_pct >= self.thresholds["water_loss_critical_pct"] or w_loss_ha >= self.thresholds["water_loss_critical_ha"]:
            alert = {
                "id": f"ALT-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": datetime.now().isoformat(),
                "region_name": region,
                "coordinates": center,
                "event_type": "Severe Water Desiccation",
                "severity": "CRITICAL",
                "message": f"Significant reservoir depletion: {w_loss_ha:,.2f} ha water lost (-{w_loss_pct:.2f}%).",
                "metrics": {
                    "water_loss_ha": w_loss_ha,
                    "loss_pct": w_loss_pct,
                    "threshold_exceeded": f"Critical Threshold ({self.thresholds['water_loss_critical_pct']}%)"
                },
                "status": "Active",
                "verification": "Automatically Detected (Pending Ground-Truth)",
                "acknowledged_by": None,
                "notes": "Severe shoreline retreat detected."
            }
            new_alerts.append(alert)

        # 3. Localized Deforestation Hotspot Checks
        def_hotspots = session_data.get("deforestation_hotspots", {}).get("hotspots", [])
        for hs in def_hotspots[:2]: # Top 2 critical hotspots
            if hs.get("severity") == "HIGH":
                alert = {
                    "id": f"ALT-HOTSPOT-{hs['id']}",
                    "timestamp": datetime.now().isoformat(),
                    "region_name": f"{region} ({hs['id']})",
                    "coordinates": hs["coordinates"],
                    "event_type": "Deforestation Hotspot Cluster",
                    "severity": "CRITICAL",
                    "message": f"Localized severe canopy clearance: {hs['area_ha']} ha concentrated loss (mean ΔNDVI {hs['mean_delta_ndvi']}).",
                    "metrics": {
                        "hotspot_id": hs["id"],
                        "canopy_loss_ha": hs["area_ha"],
                        "loss_pct": hs["canopy_loss_percentage"],
                        "threshold_exceeded": "High Severity Cluster Threshold (>35 ha)"
                    },
                    "status": "Active",
                    "verification": "Automatically Detected (Spatial Density Analysis)",
                    "acknowledged_by": None,
                    "notes": hs.get("threat_description", "Intensive canopy clearing cluster.")
                }
                new_alerts.append(alert)

        # 4. Localized Water Depletion Hotspot Checks
        wtr_hotspots = session_data.get("water_hotspots", {}).get("hotspots", [])
        for whs in wtr_hotspots[:2]:
            if whs.get("severity") == "HIGH":
                alert = {
                    "id": f"ALT-HOTSPOT-{whs['id']}",
                    "timestamp": datetime.now().isoformat(),
                    "region_name": f"{region} ({whs['id']})",
                    "coordinates": whs["coordinates"],
                    "event_type": "Water Depletion Hotspot Cluster",
                    "severity": "CRITICAL",
                    "message": f"Concentrated reservoir shoreline retreat: {whs['area_ha']} ha desiccated waterbed.",
                    "metrics": {
                        "hotspot_id": whs["id"],
                        "water_loss_ha": whs["area_ha"],
                        "loss_pct": whs["depletion_percentage"],
                        "threshold_exceeded": "High Severity Water Depletion (>30 ha)"
                    },
                    "status": "Active",
                    "verification": "Automatically Detected (NDWI Shoreline Differencing)",
                    "acknowledged_by": None,
                    "notes": whs.get("threat_description", "Severe reservoir shrinkage cluster.")
                }
                new_alerts.append(alert)

        # Prepend new alerts and remove duplicates by ID
        existing_ids = {a["id"] for a in self.alerts}
        for na in new_alerts:
            if na["id"] not in existing_ids:
                self.alerts.insert(0, na)
                existing_ids.add(na["id"])

        self._save_alerts()
        return new_alerts

    def get_alerts(self):
        return {
            "alerts": self.alerts,
            "thresholds": self.thresholds,
            "summary": {
                "total_alerts": len(self.alerts),
                "active_alerts": len([a for a in self.alerts if a["status"] == "Active"]),
                "acknowledged_alerts": len([a for a in self.alerts if a["status"] == "Acknowledged"]),
                "resolved_alerts": len([a for a in self.alerts if a["status"] == "Resolved"]),
                "critical_count": len([a for a in self.alerts if a["severity"] == "CRITICAL"])
            }
        }

    def update_alert_status(self, alert_id: str, new_status: str, user_name: str = "GIS Analyst", notes: str = None):
        """Allows users to acknowledge or resolve an alert."""
        for a in self.alerts:
            if a["id"] == alert_id:
                a["status"] = new_status
                if new_status in ["Acknowledged", "Resolved"]:
                    a["acknowledged_by"] = user_name
                    a["acknowledged_at"] = datetime.now().isoformat()
                if notes:
                    a["notes"] = notes
                self._save_alerts()
                return a
        return None

    def update_thresholds(self, new_thresholds: dict):
        self.thresholds.update(new_thresholds)
        return self.thresholds
