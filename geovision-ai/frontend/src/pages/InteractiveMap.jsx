import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Rectangle,
  Marker,
  Popup,
  LayersControl,
  ImageOverlay,
  Polygon,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import {
  Map as MapIcon,
  Layers,
  Compass,
  Maximize2,
  Trees,
  Droplets,
  Eye,
  Sliders,
  CheckCircle2,
  Sparkles,
  Pentagon,
  Trash2,
  Play,
  RotateCcw,
  AlertTriangle,
  Flame,
  Check,
  X,
  ShieldAlert,
  Info
} from 'lucide-react';

import { analyzeCustomAOI, fetchDeforestationHotspots, fetchWaterDepletionHotspots } from '../services/api';

// Fix Leaflet default marker icon path issue in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Calculate geodesic polygon area in hectares on Earth sphere
function calculateGeodesicAreaHa(coords) {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137;
  let total = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lon1 = (p1[1] * Math.PI) / 180;
    const lon2 = (p2[1] * Math.PI) / 180;
    total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  const areaM2 = Math.abs((total * R * R) / 2.0);
  return Math.round((areaM2 / 10000.0) * 100) / 100;
}

// Fit map to bounds
function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 4) {
      const leafletBounds = [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]]
      ];
      map.fitBounds(leafletBounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [bounds, map]);
  return null;
}

// Map Click Listener for drawing Custom AOI Polygons
function PolygonDrawingHandler({ isDrawing, onAddPoint }) {
  useMapEvents({
    click(e) {
      if (isDrawing && e?.latlng) {
        onAddPoint([round4(e.latlng.lat), round4(e.latlng.lng)]);
      }
    },
  });
  return null;
}

function round4(val) {
  return Math.round(val * 10000) / 10000;
}

export default function InteractiveMap({ currentSession, onLoadSample }) {
  const bounds = currentSession?.bounds || [12.1500, 75.7800, 12.3800, 76.0500];
  const centerLat = (bounds[0] + bounds[2]) / 2.0;
  const centerLon = (bounds[1] + bounds[3]) / 2.0;

  // Active Map Overlay Layer
  const [overlayType, setOverlayType] = useState('change');
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);

  // Toggleable Feature Layers
  const [showDeforestHotspots, setShowDeforestHotspots] = useState(true);
  const [showWaterHotspots, setShowWaterHotspots] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  // Custom AOI Drawing State
  const [isDrawingAoi, setIsDrawingAoi] = useState(false);
  const [aoiPoints, setAoiPoints] = useState([]);
  const [aoiResult, setAoiResult] = useState(null);
  const [aoiLoading, setAoiLoading] = useState(false);
  const [aoiError, setAoiError] = useState(null);

  // Hotspots Data
  const [defHotspots, setDefHotspots] = useState(currentSession?.deforestation_hotspots?.hotspots || []);
  const [wtrHotspots, setWtrHotspots] = useState(currentSession?.water_hotspots?.hotspots || []);

  useEffect(() => {
    // If hotspots are in currentSession, use them, otherwise fetch
    if (currentSession?.deforestation_hotspots?.hotspots) {
      setDefHotspots(currentSession.deforestation_hotspots.hotspots);
    } else {
      fetchDeforestationHotspots().then(res => setDefHotspots(res.hotspots || [])).catch(() => {});
    }

    if (currentSession?.water_hotspots?.hotspots) {
      setWtrHotspots(currentSession.water_hotspots.hotspots);
    } else {
      fetchWaterDepletionHotspots().then(res => setWtrHotspots(res.hotspots || [])).catch(() => {});
    }
  }, [currentSession]);

  const deforest = currentSession?.deforestation || {};
  const water = currentSession?.water || {};
  const change = currentSession?.change_detection || {};
  const lulc = currentSession?.lulc || {};

  const rectangleBounds = [
    [bounds[0], bounds[1]],
    [bounds[2], bounds[3]]
  ];

  const getOverlayImage = () => {
    switch (overlayType) {
      case 'earlier':
        return currentSession?.earlier_image;
      case 'later':
        return currentSession?.later_image;
      case 'change':
        return change.change_map_image;
      case 'deforest':
        return deforest.change_map_image;
      case 'water':
        return water.change_map_image;
      case 'lulc':
        return lulc.lulc_map_t2;
      case 'hotspot_deforest':
        return currentSession?.deforestation_hotspots?.heatmap_overlay;
      case 'hotspot_water':
        return currentSession?.water_hotspots?.heatmap_overlay;
      default:
        return null;
    }
  };

  const overlayUrl = getOverlayImage();

  // AOI Drawing Handlers
  const handleAddAoiPoint = (pt) => {
    setAoiPoints((prev) => [...prev, pt]);
  };

  const handleClearAoi = () => {
    setAoiPoints([]);
    setAoiResult(null);
    setAoiError(null);
    setIsDrawingAoi(false);
  };

  const handleRunAoiAnalysis = async () => {
    if (aoiPoints.length < 3) {
      setAoiError('Please click at least 3 points on the map to define an AOI polygon.');
      return;
    }

    try {
      setAoiLoading(true);
      setAoiError(null);
      const res = await analyzeCustomAOI(aoiPoints);
      setAoiResult(res);
      setIsDrawingAoi(false);
    } catch (err) {
      setAoiError(err.message || 'AOI polygon analysis failed.');
    } finally {
      setAoiLoading(false);
    }
  };

  const currentAoiAreaHa = calculateGeodesicAreaHa(aoiPoints);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Interactive GIS Core
            </span>
            <span className="text-xs text-slate-400 font-mono">
              WGS 84 • Sentinel-2 Overlay • Polygon AOI Extraction
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-emerald-400" />
            Interactive Geospatial Satellite Map & AOI System
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Inspect geographic context, layer multi-temporal change masks, detect spatial clusters,
            and draw custom Area of Interest (AOI) polygons to compute localized deforestation and water metrics.
          </p>
        </div>

        {/* Region Quick Selectors */}
        <div className="flex items-center space-x-2 bg-geo-card p-1.5 rounded-xl border border-geo-border">
          <span className="text-xs font-semibold text-slate-400 px-2">Preset Zones:</span>
          <button
            onClick={() => onLoadSample('forest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentSession?.scenario === 'forest'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Western Ghats
          </button>
          <button
            onClick={() => onLoadSample('water')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentSession?.scenario === 'water'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Lake Basin
          </button>
        </div>
      </div>

      {/* AOI Drawing Bar & Controls */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsDrawingAoi(!isDrawingAoi)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
              isDrawingAoi
                ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Pentagon className="w-4 h-4" />
            <span>{isDrawingAoi ? 'Drawing Active (Click Map to Add Points)' : 'Draw Custom AOI Polygon'}</span>
          </button>

          {aoiPoints.length > 0 && (
            <>
              <button
                onClick={handleRunAoiAnalysis}
                disabled={aoiLoading || aoiPoints.length < 3}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{aoiLoading ? 'Analyzing AOI Pixels...' : `Analyze AOI (${aoiPoints.length} vertices)`}</span>
              </button>

              <button
                onClick={handleClearAoi}
                className="px-3 py-2 rounded-xl bg-geo-dark hover:bg-slate-800 text-slate-300 border border-geo-border text-xs font-semibold flex items-center space-x-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear AOI</span>
              </button>

              <div className="px-3 py-1.5 rounded-lg bg-geo-dark/80 border border-geo-border text-xs flex items-center space-x-2">
                <span className="text-slate-400">Live Polygon Area:</span>
                <span className="font-mono font-bold text-emerald-400">{currentAoiAreaHa.toLocaleString()} ha</span>
              </div>
            </>
          )}
        </div>

        {/* Feature Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-400 mr-1">Feature Overlays:</span>
          <button
            onClick={() => setShowDeforestHotspots(!showDeforestHotspots)}
            className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center space-x-1 transition-all ${
              showDeforestHotspots
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-geo-dark text-slate-400 border-geo-border'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Deforestation Hotspots ({defHotspots.length})</span>
          </button>

          <button
            onClick={() => setShowWaterHotspots(!showWaterHotspots)}
            className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center space-x-1 transition-all ${
              showWaterHotspots
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-geo-dark text-slate-400 border-geo-border'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Water Depletion Hotspots ({wtrHotspots.length})</span>
          </button>
        </div>
      </div>

      {aoiError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{aoiError}</span>
          </div>
          <button onClick={() => setAoiError(null)} className="text-xs font-bold">✕</button>
        </div>
      )}

      {/* AOI Analysis Results Card */}
      {aoiResult && (
        <div className="rounded-2xl border border-emerald-500/40 bg-geo-card p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-geo-border pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase tracking-wider">
                  AOI Analysis Complete
                </span>
                <span className="font-mono text-xs text-white font-bold">
                  {aoiResult.aoi_metrics?.total_aoi_area_ha} ha Selected Area
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Multi-spectral pixels extracted strictly within user-defined polygon boundary.
              </p>
            </div>
            <button
              onClick={() => setAoiResult(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
            >
              Dismiss Result
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* AOI Preview Image */}
            <div className="rounded-xl overflow-hidden border border-geo-border aspect-square bg-slate-950 flex items-center justify-center">
              {aoiResult.preview_image ? (
                <img
                  src={aoiResult.preview_image}
                  alt="AOI Cropped Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-slate-500">No Preview</span>
              )}
            </div>

            {/* AOI Vegetation Stats */}
            <div className="p-3.5 rounded-xl bg-geo-darker/60 border border-geo-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Trees className="w-3.5 h-3.5" />
                AOI Canopy Loss
              </span>
              <div className="text-xl font-black text-white">
                {aoiResult.vegetation_analysis?.forest_loss_ha} ha
              </div>
              <div className="text-[11px] text-slate-400">
                Loss %: <strong className="text-rose-400">-{aoiResult.vegetation_analysis?.forest_loss_percentage}%</strong>
              </div>
              <div className="text-[11px] text-slate-400">
                Mean ΔNDVI: <strong className="text-white">{aoiResult.vegetation_analysis?.mean_delta_ndvi}</strong>
              </div>
            </div>

            {/* AOI Water Stats */}
            <div className="p-3.5 rounded-xl bg-geo-darker/60 border border-geo-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                AOI Water Depletion
              </span>
              <div className="text-xl font-black text-white">
                {aoiResult.water_analysis?.water_loss_ha} ha
              </div>
              <div className="text-[11px] text-slate-400">
                Depletion %: <strong className="text-rose-400">-{aoiResult.water_analysis?.water_loss_percentage}%</strong>
              </div>
              <div className="text-[11px] text-slate-400">
                Post-Period Water: <strong className="text-white">{aoiResult.water_analysis?.water_t2_ha} ha</strong>
              </div>
            </div>

            {/* AOI Geographic Geometry */}
            <div className="p-3.5 rounded-xl bg-geo-darker/60 border border-geo-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Polygon Specifications
              </span>
              <div className="text-sm font-bold text-white font-mono">
                {aoiResult.aoi_metrics?.vertices_count} Vertices
              </div>
              <div className="text-[11px] text-slate-400">
                Pixels: <strong className="text-white font-mono">{aoiResult.aoi_metrics?.aoi_pixels?.toLocaleString()} px</strong>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold pt-1">
                ✓ Extracted at 10m Ground Resolution
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Layer Overlays Control Bar */}
      <div className="rounded-xl border border-geo-border bg-geo-card p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Active Satellite Mask:
          </span>
          {[
            { id: 'change', label: 'Combined Differencing (ΔI)' },
            { id: 'deforest', label: 'Deforestation (NDVI)' },
            { id: 'water', label: 'Water Resources (NDWI)' },
            { id: 'lulc', label: '5-Class LULC Map' },
            { id: 'hotspot_deforest', label: 'Deforestation Heatmap' },
            { id: 'earlier', label: 'T1 Baseline' },
            { id: 'later', label: 'T2 Recent' },
            { id: 'none', label: 'Hide Mask' },
          ].map((lyr) => (
            <button
              key={lyr.id}
              onClick={() => setOverlayType(lyr.id)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                overlayType === lyr.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-geo-dark text-slate-400 hover:text-white border border-geo-border'
              }`}
            >
              {lyr.label}
            </button>
          ))}
        </div>

        {/* Opacity Slider */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-400">Opacity:</span>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            className="w-24 accent-emerald-500 cursor-pointer"
          />
          <span className="font-mono text-slate-300 w-8">{Math.round(overlayOpacity * 100)}%</span>
        </div>
      </div>

      {/* Main Leaflet Map Container */}
      <div className="rounded-2xl border border-geo-border overflow-hidden shadow-2xl relative bg-geo-darker h-[650px] w-full">
        <MapContainer
          center={[centerLat, centerLon]}
          zoom={11}
          style={{ height: '100%', width: '100%', zIndex: 10 }}
          scrollWheelZoom={true}
        >
          <MapController bounds={bounds} />
          <PolygonDrawingHandler isDrawing={isDrawingAoi} onAddPoint={handleAddAoiPoint} />

          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Esri World Imagery (Satellite)">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="OpenStreetMap Standard">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="CartoDB Dark Matter">
              <TileLayer
                attribution="&copy; CARTO"
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Analysis Area Bounding Box */}
          <Rectangle
            bounds={rectangleBounds}
            pathOptions={{
              color: '#10b981',
              weight: 2,
              dashArray: '4, 4',
              fillColor: '#10b981',
              fillOpacity: 0.04
            }}
          />

          {/* Satellite Mask Overlay Image */}
          {overlayUrl && (
            <ImageOverlay
              url={overlayUrl}
              bounds={rectangleBounds}
              opacity={overlayOpacity}
              zIndex={500}
            />
          )}

          {/* User-Drawn Custom AOI Polygon */}
          {aoiPoints.length > 0 && (
            <>
              {aoiPoints.length >= 3 ? (
                <Polygon
                  positions={aoiPoints}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 3,
                    fillColor: '#06b6d4',
                    fillOpacity: 0.25
                  }}
                />
              ) : (
                <Polyline
                  positions={aoiPoints}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 2,
                    dashArray: '4, 4'
                  }}
                />
              )}

              {/* Vertex Markers */}
              {aoiPoints.map((pt, idx) => (
                <CircleMarker
                  key={`aoi-pt-${idx}`}
                  center={pt}
                  radius={5}
                  pathOptions={{ color: '#06b6d4', fillColor: '#ffffff', fillOpacity: 1 }}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong>AOI Vertex #{idx + 1}</strong>
                      <br />
                      [{pt[0].toFixed(4)}°N, {pt[1].toFixed(4)}°E]
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </>
          )}

          {/* Deforestation Hotspots Overlay Pins */}
          {showDeforestHotspots &&
            defHotspots.map((hs) => (
              <CircleMarker
                key={hs.id}
                center={hs.coordinates}
                radius={hs.severity === 'HIGH' ? 10 : hs.severity === 'MEDIUM' ? 8 : 6}
                pathOptions={{
                  color: hs.color,
                  fillColor: hs.color,
                  fillOpacity: 0.85,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-2 space-y-1 text-xs">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: hs.color }}
                    >
                      {hs.severity} Severity Hotspot
                    </span>
                    <p className="font-bold text-slate-900 mt-1">{hs.id}</p>
                    <p className="text-slate-600">
                      Coordinates: {hs.coordinates[0].toFixed(4)}°N, {hs.coordinates[1].toFixed(4)}°E
                    </p>
                    <p className="text-rose-700 font-semibold">
                      Canopy Loss: {hs.area_ha} ha ({hs.canopy_loss_percentage}%)
                    </p>
                    <p className="text-slate-500 font-mono text-[10px]">
                      Mean ΔNDVI: {hs.mean_delta_ndvi}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Water Depletion Hotspots Overlay Pins */}
          {showWaterHotspots &&
            wtrHotspots.map((wh) => (
              <CircleMarker
                key={wh.id}
                center={wh.coordinates}
                radius={wh.severity === 'HIGH' ? 10 : wh.severity === 'MEDIUM' ? 8 : 6}
                pathOptions={{
                  color: wh.color,
                  fillColor: wh.color,
                  fillOpacity: 0.85,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-2 space-y-1 text-xs">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: wh.color }}
                    >
                      {wh.severity} Water Depletion
                    </span>
                    <p className="font-bold text-slate-900 mt-1">{wh.id}</p>
                    <p className="text-slate-600">
                      Coordinates: {wh.coordinates[0].toFixed(4)}°N, {wh.coordinates[1].toFixed(4)}°E
                    </p>
                    <p className="text-cyan-700 font-semibold">
                      Desiccated Extent: {wh.area_ha} ha ({wh.depletion_percentage}%)
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Center Marker */}
          <Marker position={[centerLat, centerLon]}>
            <Popup>
              <div className="p-2 space-y-1 text-xs">
                <p className="font-bold text-slate-900">{currentSession?.region_name}</p>
                <p className="text-slate-600">Center: {centerLat.toFixed(4)}°N, {centerLon.toFixed(4)}°E</p>
                <p className="text-emerald-700 font-semibold">
                  Deforestation: {deforest.total_vegetation_loss_ha || 0} ha lost
                </p>
                <p className="text-cyan-700 font-semibold">
                  Water Change: {water.net_water_change_ha || 0} ha
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating Comprehensive Map Legend */}
        <div className="absolute bottom-4 left-4 z-[500] bg-geo-dark/95 backdrop-blur-md p-4 rounded-2xl border border-geo-border text-xs shadow-2xl space-y-2.5 max-w-xs pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Cartographic Legend
            </span>
            <span className="text-[10px] text-slate-400 font-mono">WGS 84</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#ef4444] border border-white/50"></span>
              <span className="text-slate-300">High Deforestation Hotspot (≥35 ha)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#f97316] border border-white/50"></span>
              <span className="text-slate-300">Moderate Deforestation Hotspot</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#dc2626] border border-white/50"></span>
              <span className="text-slate-300">Water Desiccation Hotspot</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-sm bg-[#06b6d4] border border-white/50"></span>
              <span className="text-slate-300">User Custom AOI Polygon</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-sm bg-[#22c55e]"></span>
              <span className="text-slate-300">Preserved Forest Canopy</span>
            </div>
          </div>
        </div>

        {/* Drawing Mode Guide Badge */}
        {isDrawingAoi && (
          <div className="absolute top-4 left-4 z-[500] px-4 py-2 bg-amber-500/90 text-slate-950 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-pulse">
            <Pentagon className="w-4 h-4" />
            <span>AOI Drawing Active: Click map to place polygon vertices. Click "Analyze AOI" when done.</span>
          </div>
        )}
      </div>
    </div>
  );
}
