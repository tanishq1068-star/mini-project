import os
import json
import uuid
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional

class HistoryService:
    """
    Manages persistent storage and comparison of multi-temporal analysis sessions
    using SQLite with JSON mirror for maximum reliability and portability.
    """
    def __init__(self, db_path: str = "reports/geovision_history.db", json_fallback: str = "reports/analysis_history.json"):
        self.db_path = db_path
        self.json_fallback = json_fallback
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_sqlite()

    def _init_sqlite(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS analysis_history (
                        id TEXT PRIMARY KEY,
                        name TEXT,
                        timestamp TEXT,
                        region_name TEXT,
                        scenario_type TEXT,
                        sensor TEXT,
                        date_earlier TEXT,
                        date_later TEXT,
                        forest_loss_ha REAL,
                        forest_loss_pct REAL,
                        water_loss_ha REAL,
                        water_loss_pct REAL,
                        change_pct REAL,
                        cloud_cover_pct REAL,
                        hotspots_count INTEGER,
                        alerts_count INTEGER,
                        notes TEXT,
                        snapshot_json TEXT
                    )
                """)
                conn.commit()
        except Exception as e:
            print(f"SQLite init error: {e}")

    def list_records(self) -> List[Dict[str, Any]]:
        """Returns summarized records of all saved analyses."""
        records = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT id, name, timestamp, region_name, scenario_type, sensor, date_earlier, date_later, forest_loss_ha, forest_loss_pct, water_loss_ha, water_loss_pct, change_pct, cloud_cover_pct, hotspots_count, alerts_count, notes FROM analysis_history ORDER BY timestamp DESC")
                for row in cursor.fetchall():
                    records.append(dict(row))
        except Exception:
            pass

        # If SQLite table is empty, check JSON fallback
        if not records and os.path.exists(self.json_fallback):
            try:
                with open(self.json_fallback, "r") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        records = data
            except Exception:
                pass

        return records

    def save_record(self, session_data: Dict[str, Any], custom_name: str = None, notes: str = None) -> Dict[str, Any]:
        """Saves a comprehensive snapshot of an active analysis session."""
        record_id = session_data.get("id") or f"HIST-{uuid.uuid4().hex[:8].upper()}"
        region = session_data.get("region_name", "Target Eco-Region")
        scenario = session_data.get("scenario", "satellite_analysis")
        dates_earlier = session_data.get("date_earlier") or session_data.get("dates", {}).get("earlier", "Baseline")
        dates_later = session_data.get("date_later") or session_data.get("dates", {}).get("later", "Recent")
        name = custom_name or f"{region} ({dates_earlier} to {dates_later})"

        deforest = session_data.get("deforestation", {})
        f_loss_ha = deforest.get("total_vegetation_loss_ha", 0.0)
        f_loss_pct = deforest.get("loss_percentage_of_initial", 0.0)

        water = session_data.get("water", {})
        w_loss_ha = water.get("water_area_decreased_ha", 0.0)
        w_loss_pct = abs(water.get("percentage_water_change", 0.0)) if water.get("percentage_water_change", 0.0) < 0 else 0.0

        change = session_data.get("change_detection", {})
        ch_pct = change.get("statistics", {}).get("change_percentage", 0.0)
        cloud_pct = session_data.get("cloud_cover_t2") or session_data.get("cloud_masking", {}).get("cloud_coverage_percentage", 0.0)

        def_hs = session_data.get("deforestation_hotspots", {}).get("total_hotspots_detected", 0)
        wtr_hs = session_data.get("water_hotspots", {}).get("total_depletion_hotspots", 0)
        hotspots_total = def_hs + wtr_hs

        # Prepare clean snapshot without raw in-memory arrays
        lightweight_snapshot = {k: v for k, v in session_data.items() if k not in ["container1", "container2"]}
        snapshot_str = json.dumps(lightweight_snapshot)

        timestamp = datetime.now().isoformat()

        record = {
            "id": record_id,
            "name": name,
            "timestamp": timestamp,
            "region_name": region,
            "scenario_type": scenario,
            "sensor": session_data.get("sensor", "Sentinel-2 MSI"),
            "date_earlier": dates_earlier,
            "date_later": dates_later,
            "forest_loss_ha": round(float(f_loss_ha), 2),
            "forest_loss_pct": round(float(f_loss_pct), 2),
            "water_loss_ha": round(float(w_loss_ha), 2),
            "water_loss_pct": round(float(w_loss_pct), 2),
            "change_pct": round(float(ch_pct), 2),
            "cloud_cover_pct": round(float(cloud_pct), 2),
            "hotspots_count": hotspots_total,
            "alerts_count": 0,
            "notes": notes or "Historical analysis session logged in GeoVision AI.",
        }

        # 1. Insert into SQLite
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO analysis_history 
                    (id, name, timestamp, region_name, scenario_type, sensor, date_earlier, date_later, forest_loss_ha, forest_loss_pct, water_loss_ha, water_loss_pct, change_pct, cloud_cover_pct, hotspots_count, alerts_count, notes, snapshot_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record["id"], record["name"], record["timestamp"], record["region_name"],
                    record["scenario_type"], record["sensor"], record["date_earlier"], record["date_later"],
                    record["forest_loss_ha"], record["forest_loss_pct"], record["water_loss_ha"], record["water_loss_pct"],
                    record["change_pct"], record["cloud_cover_pct"], record["hotspots_count"], record["alerts_count"],
                    record["notes"], snapshot_str
                ))
                conn.commit()
        except Exception as e:
            print(f"Error saving to SQLite: {e}")

        # 2. Mirror into JSON
        try:
            existing = self.list_records()
            existing = [r for r in existing if r.get("id") != record_id]
            existing.insert(0, record)
            with open(self.json_fallback, "w") as f:
                json.dump(existing[:50], f, indent=2)
        except Exception as e:
            print(f"Error mirroring to JSON: {e}")

        return record

    def get_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves full snapshot of a historical session."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT snapshot_json FROM analysis_history WHERE id = ?", (record_id,))
                row = cursor.fetchone()
                if row and row[0]:
                    return json.loads(row[0])
        except Exception:
            pass
        return None

    def delete_record(self, record_id: str) -> bool:
        """Deletes a historical record from SQLite and JSON."""
        deleted = False
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM analysis_history WHERE id = ?", (record_id,))
                conn.commit()
                deleted = cursor.rowcount > 0
        except Exception as e:
            print(f"SQLite delete error: {e}")

        try:
            existing = self.list_records()
            updated = [r for r in existing if r.get("id") != record_id]
            with open(self.json_fallback, "w") as f:
                json.dump(updated, f, indent=2)
            deleted = True
        except Exception:
            pass

        return deleted

    def compare_records(self, id1: str, id2: str) -> Dict[str, Any]:
        """Compares two historical analysis sessions."""
        r1 = None
        r2 = None
        all_records = self.list_records()
        for r in all_records:
            if r.get("id") == id1:
                r1 = r
            if r.get("id") == id2:
                r2 = r

        if not r1 or not r2:
            raise ValueError(f"One or both records not found: {id1}, {id2}")

        f_delta_ha = round(r2.get("forest_loss_ha", 0) - r1.get("forest_loss_ha", 0), 2)
        w_delta_ha = round(r2.get("water_loss_ha", 0) - r1.get("water_loss_ha", 0), 2)

        return {
            "comparison": {
                "session_a": r1,
                "session_b": r2,
                "delta_forest_loss_ha": f_delta_ha,
                "delta_water_loss_ha": w_delta_ha,
                "change_trajectory": (
                    "Accelerating canopy clearance" if f_delta_ha > 20.0 else
                    "Stabilizing vegetation cover" if f_delta_ha < -20.0 else
                    "Consistent forest dynamic"
                )
            }
        }
