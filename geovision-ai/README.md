# GeoVision AI — Advanced Environmental Monitoring System

## "Change Detection of Deforestation and Water Resources Using Multi-Temporal Satellite Images"
**B.Tech Computer Science & Engineering Final Project & Viva System**

---

## 🌟 Advanced Features & System Modules

GeoVision AI is an end-to-end remote sensing and GIS application designed to detect, quantify, and visualize terrestrial and hydrological changes using multi-temporal Copernicus Sentinel-2 satellite imagery.

### 1. 📐 Custom Area of Interest (AOI) Selection
- **Interactive Leaflet Polygon Drawing Toolbar**: Draw custom arbitrary polygon boundaries directly on the GIS map (`PolygonDrawingHandler`), edit vertex vertices dynamically, or delete polygons with one click.
- **Real-Time Geodesic Area Calculation**: Computes live surface area in hectares ($ha$) utilizing spherical geodesic polygon projection formulas:
  $$A = R^2 \sum_{i=1}^{n} (\lambda_{i+1} - \lambda_{i-1}) \sin(\phi_i)$$
- **Rasterized In-Polygon Pixel Analysis**: Backend rasterizes the polygon onto the Sentinel-2 image matrix (`cv2.fillPoly`), extracting only pixels strictly inside the delineated polygon.
- **Localized Change Metrics**: Computes baseline forest/water extent, forest loss ($ha$ & %), and water depletion specifically within the user's custom AOI.
- **Cropped Spatial Preview**: Generates base64 true-color cropped preview highlighted with an emerald polygon perimeter.
- **REST API**: `POST /api/aoi/analyze`

---

### 2. 🔥 Deforestation Hotspot Detection (Spatial Clustering)
- **Connected Component Labeling**: Groups contiguous canopy loss pixels ($\Delta\text{NDVI} \le -0.15$) using OpenCV's `connectedComponentsWithStats` with 8-way connectivity.
- **Cluster Spatial Attributes**:
  - Centroid geographic coordinates in WGS 84 (Latitude, Longitude).
  - Spatial extent in hectares ($ha$).
  - Mean change magnitude ($\Delta\text{NDVI}$).
  - Minimum bounding box $[y_{\min}, x_{\min}, y_{\max}, x_{\max}]$.
- **Severity Stratification**:
  - `HIGH`: $\ge 30.0\text{ ha}$ contiguous loss (or mean $\Delta\text{NDVI} \le -0.30$)
  - `MEDIUM`: $10.0 - 30.0\text{ ha}$ contiguous loss
  - `LOW`: $< 10.0\text{ ha}$ canopy fragmentation
- **Visualization**: Transparent RGBA heatmap overlay on the interactive map and structured spatial cluster tables on the Deforestation page.
- **REST API**: `GET /api/hotspots/deforestation`

---

### 3. 💧 Water Depletion Hotspot Detection
- **Desiccation Spatial Clustering**: Isolates severe water retreat clusters ($\Delta\text{NDWI} \le -0.22$) corresponding to desiccated lakebeds, dried wetlands, and shrinking reservoir shorelines.
- **Cluster Metrics**:
  - Surface water reduction area in hectares ($ha$).
  - Depletion percentage relative to baseline.
  - Centroid coordinates and threat descriptions (e.g., "Critical reservoir contraction cluster").
- **Visualization**: Amber/orange heatmap overlay on GIS map and dedicated depletion cluster table on the Water Resources page.
- **REST API**: `GET /api/hotspots/water`

---

### 4. 🚨 Autonomous Environmental Alert System
- **Threshold-Driven Event Dispatcher**: Evaluates multi-temporal analysis results against configurable limits (e.g. Forest Loss Critical $> 12\%$ or $> 150\text{ ha}$; Water Loss Critical $> 18\%$ or $> 80\text{ ha}$).
- **Localized Hotspot Linkage**: Automatically extracts top high-severity Deforestation and Water Depletion clusters and generates localized alerts with exact centroid coordinates.
- **Analyst Incident Workflow**: Enables GIS analysts to review, acknowledge, or resolve alerts, attaching verified field notes and analyst identity.
- **Persistent Storage**: Saved in `reports/environmental_alerts.json`.
- **REST API**: `GET /api/alerts`, `POST /api/alerts/acknowledge`, `POST /api/alerts/thresholds`

---

### 5. 🗄️ Persistent Analysis History Module
- **Dual SQLite & JSON Architecture**:
  - SQLite database at `reports/geovision_history.db` storing structured metadata, loss hectares, change %, and complete JSON session snapshots.
  - JSON mirror at `reports/analysis_history.json` for lightweight audit trails and human-readable export.
- **Interactive History Archive Page**:
  - Browse historical sessions with acquisition dates, sensor type, region, forest loss, and water loss.
  - **Reopen Session**: Restores any historical analysis snapshot back into the active application memory.
  - **Save Session**: Explicitly save current session with custom label and analyst notes.
  - **Side-by-Side Comparative Audit Modal**: Select any two historical runs and compute differential gains/losses ($\Delta\text{ha}$) across separate campaigns.
  - **Delete Record**: Remove obsolete historical sessions with immediate database cleanup.
- **REST API**: `GET /api/history`, `POST /api/history/save`, `GET /api/history/load/{id}`, `DELETE /api/history/{id}`, `POST /api/history/compare`

---

### 6. 📊 Executive Mission Control Dashboard
- **Quality Assurance**: Real-time cloud coverage % with quality status indicator ($< 5\%$ Optimal Optical Window, $< 15\%$ Acceptable, $> 15\%$ Cloud Interference).
- **Temporal Baseline Days**: Calculated interval between acquisition date $T_1$ and $T_2$ (e.g. 1,101 days).
- **Platform Badge**: Clearly differentiates *Live Sentinel-2 L2A (ESA Copernicus)* from *Calibrated Demonstration Scenarios*.
- **Live Incident Counters**: Immediate counts of Deforestation Hotspots, Water Depletion Clusters, and Active Alerts with one-click navigation.
- **Interactive Image Comparison Slider**: Horizontal split slider for instant visual change inspection.
- **Recharts Visual Analytics**: Forest dynamics bar chart, water resource dynamics bar chart, 5-class land cover pie chart, and decadal trend area chart.

---

### 7. 🗺️ Enhanced Interactive GIS Satellite Map
- **Dual Basemap Providers**: Esri World Imagery (high-resolution optical satellite) and OpenStreetMap.
- **Toggleable Multi-Layer Overlays**:
  - Forest Canopy Loss ($\Delta\text{NDVI}$)
  - Water Depletion ($\Delta\text{NDWI}$)
  - Deforestation Hotspots Heatmap
  - Water Depletion Clusters Heatmap
  - 5-Class LULC Classification Map
  - Active Custom AOI Polygon
  - Environmental Alert Markers
- **Full Cartographic Legend**: Clear symbology with color keys for all layers.

---

### 8. ☁️ Cloud Detection & Surface Masking
- Multi-spectral albedo/whiteness detection and morphological shadow dilation.
- Calculates clear valid surface % and automatically removes cloud/shadow contaminated pixels from NDVI/NDWI differencing.

---

### 9. ⏳ Multi-Year Environmental Analysis
- Decadal time series (2014–2024 across 3, 5, and 10-year intervals) for Western Ghats, Bakhtegan Lake, Amazon Arc, and Lake Mead.
- Annual loss velocity ($\Delta\text{ha/year}$) and long-term trend trajectories.

---

### 10. 🎯 Remote Sensing Accuracy Assessment
- $5 \times 5$ Confusion Matrix heatmap, Overall Accuracy ($OA$), Producer's Accuracy ($PA$), User's Accuracy ($UA$), F1 Score, and Cohen's Kappa ($\kappa$).
- Custom ground-truth CSV upload and validation with zero fake metrics.

---

### 11. 🌾 5-Class Land Use and Land Cover (LULC) Classification
- Forest, Water, Vegetation, Urban Areas, and Barren Land via DT-MSI multi-spectral decision tree.
- $5 \times 5$ Land Cover Transition Matrix in hectares detailing exact conversions.

---

### 12. 🛰️ Real Copernicus Sentinel-2 Satellite Data Explorer
- Interactive global map search by coordinates, date range, and cloud cover filter.
- Ingests Sentinel-2 bands B02, B03, B04, B08, and B11.

---

### 13. 📄 Publication-Ready 12-Section Scientific PDF Report Generator
Compliant with IEEE and remote sensing research standards; includes:
1. Cover Page
2. Abstract
3. Study Area
4. Satellite Data Information
5. Methodology
6. Deforestation Analysis & **Deforestation Hotspot Table**
7. Water Resource Analysis & **Water Depletion Cluster Table**
8. Visual Comparison & AOI Evaluation
9. Statistical Analysis & Land Cover Transition Matrix
10. Results and Discussion
11. Conclusion
12. References

---

## 💻 Quick Start Launch (Windows)

### Option A: One-Click Launch Script
Double-click:
```bat
run_geovision.bat
```
or in PowerShell:
```powershell
.\run_geovision.ps1
```

### Option B: Manual Execution

#### 1. Backend API (FastAPI)
```powershell
cd "geovision-ai\backend"
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- API Root: `http://127.0.0.1:8000`
- Interactive API Docs (Swagger): `http://127.0.0.1:8000/docs`

#### 2. Frontend (React + Vite + Tailwind CSS)
```powershell
cd "geovision-ai\frontend"
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🧪 Comprehensive Backend Verification Suite

Run the automated backend test suite to verify all endpoints, algorithms, and PDF generation:
```powershell
cd "geovision-ai\backend"
.\venv\Scripts\python.exe test_all_features.py
```

Expected result:
```
============================================================
ALL TESTS PASSED WITH 100% SUCCESS!
============================================================
```

---

## 📑 Complete Sidebar Navigation Structure

1. **Dashboard**: Mission overview, acquisition baseline, cloud cover %, sensor info, KPIs, hotspots summary, comparison slider, and charts.
2. **Satellite Data Explorer**: Interactive global map, Sentinel-2 STAC search, cloud filter, and scene selection.
3. **Before & After Comparison**: Dual-layer slider with zoom, pan, horizontal/vertical toggle, reset, and fullscreen.
4. **Satellite Imagery**: Custom file uploader (GeoTIFF, TIFF, PNG, JPG).
5. **Cloud Masking**: Sentinel-2 cloud and shadow detection, surface quality %, and unmasked vs masked index correction.
6. **Deforestation Detection**: NDVI canopy loss maps, degradation metrics, and **Deforestation Hotspots Spatial Table**.
7. **Water Resource Monitoring**: NDWI surface water loss, shoreline retreat maps, and **Water Depletion Clusters Table**.
8. **Change Detection**: 3-Way image view, alignment report, and change magnitude heatmaps.
9. **LULC Classification**: 5-class land cover map, category areas, and $5 \times 5$ Land Cover Transition Matrix.
10. **Multi-Year Analysis**: Decadal time series (3, 5, 10-year intervals), annual change rates, and long-term trend graphs.
11. **Accuracy Assessment**: Confusion matrix heatmap, Overall Accuracy, PA, UA, F1 Score, Cohen's Kappa, and CSV ground-truth validator.
12. **Environmental Alerts**: Autonomous threshold dispatcher, severity badges, incident triage, and acknowledgment logging.
13. **Interactive Map**: Leaflet.js with Esri World Imagery, OpenStreetMap, **Polygon AOI Drawing Toolbar**, and hotspot overlays.
14. **Analytics**: Recharts interactive charts (Bar, Area, Donut, Radar).
15. **Analysis History**: Persistent SQLite & JSON session archive, one-click session restore, and side-by-side comparative audit modal.
16. **Advanced PDF Reports**: 12-section scientific report compilation with hotspot tables and instant download.
17. **About Project**: Academic specifications, mathematical formulas, and system architecture.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Recharts, Leaflet.js, Lucide Icons.
- **Backend**: Python 3.13, FastAPI, Uvicorn, SQLite3, Pydantic v2.
- **Remote Sensing & Spatial Libraries**: NumPy, OpenCV (`cv2`), Pillow, Rasterio, Matplotlib, ReportLab.
- **Data Protocols**: STAC API (SpatioTemporal Asset Catalog), WGS 84 (EPSG:4326), GeoTIFF.
