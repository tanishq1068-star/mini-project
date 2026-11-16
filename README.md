# GeoVision AI — Advanced Environmental Monitoring System

## Change Detection of Deforestation and Water Resources Using Multi-Temporal Satellite Images
**B.Tech Computer Science & Engineering Final Project & Viva System**

---

### 🌟 Key Features & Advanced Capabilities:

1. **Custom Area of Interest (AOI) Selection**:
   - Interactive polygon drawing, vertex editing, and deletion on Leaflet GIS map.
   - Real-time geodesic area calculation in hectares ($ha$) via spherical trigonometry.
   - Backend polygon rasterization (`cv2.fillPoly`), pixel extraction, and localized NDVI/NDWI change metrics strictly bounded by the AOI.
   - Base64 cropped visualization showing the delineated polygon on true-color Sentinel imagery.

2. **Deforestation Hotspot Detection (Spatial AI)**:
   - Identifies high-density canopy loss clusters ($\Delta\text{NDVI} \le -0.15$) using connected-component spatial clustering (`cv2.connectedComponentsWithStats`).
   - Categorizes clusters into **HIGH** ($\ge 30\text{ ha}$), **MEDIUM** ($10-30\text{ ha}$), and **LOW** ($< 10\text{ ha}$) severity tiers.
   - Generates spatial centroid coordinates (WGS 84), cluster bounding boxes, and an RGBA heatmap overlay.

3. **Water Depletion Hotspot Detection**:
   - Quantifies contiguous desiccated lakebed/reservoir clusters ($\Delta\text{NDWI} \le -0.22$).
   - Computes cluster area in hectares, surface water reduction percentage, and shoreline retraction vectors.
   - Visualized with amber/rose heatmaps and dedicated spatial data tables.

4. **Autonomous Environmental Alert Dispatcher**:
   - Dynamically evaluates bi-temporal satellite analyses against configurable environmental bounds.
   - Automatically generates localized alerts for top high-severity deforestation and water depletion clusters with exact coordinates.
   - Analyst workflow: acknowledge or resolve alerts with analyst name and audit notes saved to persistent storage.

5. **Persistent Analysis History Module (SQLite + JSON Mirror)**:
   - Dual-persistence engine using SQLite (`reports/geovision_history.db`) and human-readable JSON (`reports/analysis_history.json`).
   - Archive and retrieve previous multi-temporal analyses with one-click session restore into active memory.
   - Side-by-side comparative audit modal computing differential delta losses ($\Delta\text{ha}$) across separate historical runs.

6. **Executive Mission Control Dashboard**:
   - Live cloud coverage quality status badge ($< 5\%$ Optimal, $< 15\%$ Acceptable, $> 15\%$ Cloud Interference).
   - Satellite acquisition dates ($T_1$ vs $T_2$) with elapsed temporal baseline days.
   - Data source & sensor badges clearly differentiating real Copernicus Sentinel-2 Level-2A BOA from demonstration datasets.
   - Live counters and direct-action triggers for Deforestation Hotspots, Water Depletion Clusters, and Active Alerts.

7. **Interactive GIS Satellite Map**:
   - Multiple base maps: Esri World Imagery (high-resolution satellite) and OpenStreetMap.
   - Toggleable layer overlays: Forest Loss, Water Depletion, Deforestation Hotspots, Water Depletion Clusters, 5-Class LULC Map, Active AOI, and Localized Alerts.
   - Interactive polygon drawing toolbar and full cartographic legend.

8. **Cloud Detection and Masking**:
   - Multi-spectral albedo/whiteness detection and morphological cloud shadow dilation.
   - Quantifies cloud cover %, shadow cover %, and clear valid surface %. Excludes cloud pixels from NDVI and NDWI calculations.

9. **Multi-Year Environmental Analysis**:
   - Decadal time series (2014–2024 across 3, 5, and 10-year intervals) for Western Ghats, Bakhtegan Lake, Amazon Arc, and Lake Mead.
   - Calculates annual rate of change ($\Delta\text{ha/year}$) and long-term environmental trajectories.

10. **Accuracy Assessment**:
    - $5 \times 5$ Confusion Matrix heatmap, Overall Accuracy ($OA$), Producer's Accuracy ($PA$), User's Accuracy ($UA$), F1 Score, and Cohen's Kappa ($\kappa$).
    - Custom CSV ground-truth validator with zero fake metrics.

11. **5-Class LULC Classification**:
    - Forest, Water, Vegetation, Urban Areas, and Barren Land via DT-MSI multi-spectral decision tree.
    - $5 \times 5$ Land Cover Transition Matrix in hectares.

12. **Before & After Satellite Comparison Slider**:
    - Dual-layer synchronized zoom/pan ($1\times - 4\times$), horizontal/vertical split toggles, reset, and fullscreen mode.

13. **Real Copernicus Sentinel-2 Satellite Data Explorer**:
    - Global map search by coordinates, date ranges, and cloud cover filter.
    - Ingests Sentinel-2 bands B02, B03, B04, B08, and B11.

14. **Publication-Ready 12-Section Scientific PDF Report Generator**:
    - Compliant with academic research standards; includes running headers/footers, "Page X of Y" numbering, high-res charts, and formal tables for AOI metrics, Deforestation Hotspots, Water Depletion Hotspots, and Alerts.

---

### 🚀 One-Click Launch (Windows)

Double-click `run_geovision.bat` or run in PowerShell:
```powershell
.\run_geovision.ps1
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Full technical documentation and API documentation are in [`geovision-ai/README.md`](geovision-ai/README.md).
