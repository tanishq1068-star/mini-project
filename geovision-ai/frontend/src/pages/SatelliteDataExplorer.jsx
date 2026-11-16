import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Rectangle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import {
  Satellite,
  Search,
  Calendar,
  Cloud,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Compass,
  Sparkles,
  RefreshCw,
  Sun,
  ShieldCheck,
  Check,
  Download,
  Info,
  Eye,
  Sliders,
  MapPin
} from 'lucide-react';

import { searchSentinelScenes, processSentinelScenes } from '../services/api';

// Fix Leaflet default marker icon path issue in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Map click listener to capture user coordinates
function LocationPicker({ onLocationSelect, currentPos }) {
  useMapEvents({
    click(e) {
      if (e?.latlng) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  if (!currentPos || isNaN(currentPos.lat) || isNaN(currentPos.lng)) return null;

  return (
    <Marker position={[currentPos.lat, currentPos.lng]}>
      <Popup>
        <div className="p-1 text-xs">
          <strong>Target Center Point</strong>
          <br />
          Lat: {currentPos.lat.toFixed(4)}°N
          <br />
          Lon: {currentPos.lng.toFixed(4)}°E
        </div>
      </Popup>
    </Marker>
  );
}

// Controller to safely pan map when coordinates change
function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center.lat === 'number' && !isNaN(center.lat)) {
      const lng = typeof center.lng === 'number' ? center.lng : center.lon;
      if (typeof lng === 'number' && !isNaN(lng)) {
        try {
          map.setView([center.lat, lng], map.getZoom() || 8);
        } catch (err) {
          console.warn('Map view update warning:', err);
        }
      }
    }
  }, [center, map]);
  return null;
}

export default function SatelliteDataExplorer({ onSessionUpdated, setActiveTab }) {
  const [lat, setLat] = useState(12.2650);
  const [lon, setLon] = useState(75.9150);
  const [regionName, setRegionName] = useState('Western Ghats Eco-Corridor, India');
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [maxCloudCover, setMaxCloudCover] = useState(15.0);

  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  const [selectedScene1, setSelectedScene1] = useState(null); // Earlier (T1)
  const [selectedScene2, setSelectedScene2] = useState(null); // Later (T2)

  // Popular hotspot presets
  const presets = [
    { name: 'Western Ghats Eco-Corridor, India', lat: 12.2650, lon: 75.9150, type: 'Forest' },
    { name: 'Bakhtegan-Tashk Salt Lake Basin', lat: 29.4650, lon: 53.5750, type: 'Water' },
    { name: 'Amazon Basin (Rondônia), Brazil', lat: -10.8500, lon: -62.3500, type: 'Forest' },
    { name: 'Lake Mead Reservoir, USA', lat: 36.1400, lon: -114.7300, type: 'Water' },
  ];

  // Auto-search on initial component mount so the page is never empty
  useEffect(() => {
    executeSearch(12.2650, 75.9150, 'Western Ghats Eco-Corridor, India', '2020-01-01', '2024-12-31', 15.0);
  }, []);

  const handleApplyPreset = (p) => {
    setLat(p.lat);
    setLon(p.lon);
    setRegionName(p.name);
    executeSearch(p.lat, p.lon, p.name, startDate, endDate, maxCloudCover);
  };

  const executeSearch = async (sLat, sLon, sRegion, sStart, sEnd, sCloud) => {
    try {
      setIsSearching(true);
      setSearchError(null);
      setSelectedScene1(null);
      setSelectedScene2(null);

      const res = await searchSentinelScenes({
        lat: parseFloat(sLat),
        lon: parseFloat(sLon),
        start_date: sStart,
        end_date: sEnd,
        max_cloud_cover: parseFloat(sCloud)
      });

      setSearchResults(res);

      // Pre-select first two scenes if available
      if (res.scenes && res.scenes.length >= 2) {
        setSelectedScene1(res.scenes[0]);
        setSelectedScene2(res.scenes[1]);
      } else if (res.scenes && res.scenes.length === 1) {
        setSelectedScene1(res.scenes[0]);
      }
    } catch (err) {
      setSearchError(err.message || 'Error querying Sentinel-2 archive.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    executeSearch(lat, lon, regionName, startDate, endDate, maxCloudCover);
  };

  const handleProcessAndAnalyze = async () => {
    if (!selectedScene1 || !selectedScene2) {
      setSearchError('Please select two distinct observation scenes (Earlier T1 and Later T2).');
      return;
    }

    try {
      setIsProcessing(true);
      setSearchError(null);

      // Ensure chronological ordering: scene1 as earlier, scene2 as later
      let earlier = selectedScene1;
      let later = selectedScene2;
      if (new Date(earlier.date) > new Date(later.date)) {
        earlier = selectedScene2;
        later = selectedScene1;
      }

      const bboxDelta = 0.12;
      const bounds = [
        round4(lat - bboxDelta),
        round4(lon - bboxDelta),
        round4(lat + bboxDelta),
        round4(lon + bboxDelta)
      ];

      const res = await processSentinelScenes({
        scene1_id: earlier.scene_id,
        scene2_id: later.scene_id,
        date1: earlier.date,
        date2: later.date,
        region_name: regionName,
        bounds: bounds,
        cloud_cover1: earlier.cloud_cover,
        cloud_cover2: later.cloud_cover
      });

      if (onSessionUpdated) onSessionUpdated(res);
      if (setActiveTab) setActiveTab('change-detection');
    } catch (err) {
      setSearchError(err.message || 'Processing Sentinel-2 imagery failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportMetadata = () => {
    if (!searchResults) return;
    const blob = new Blob([JSON.stringify(searchResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sentinel2_Metadata_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  function round4(val) {
    if (isNaN(val)) return 0;
    return Math.round(val * 10000) / 10000;
  }

  const safeLat = isNaN(lat) ? 12.2650 : lat;
  const safeLon = isNaN(lon) ? 75.9150 : lon;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Copernicus Sentinel-2 MSI
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Level-2A Bottom-Of-Atmosphere (BOA) Multi-Spectral Reflectance
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Satellite className="w-6 h-6 text-emerald-400" />
            Sentinel-2 Satellite Data Explorer
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Search, retrieve and inspect authentic Sentinel-2 multi-spectral satellite observations by geographic location, observation date, and cloud cover bounds.
          </p>
        </div>

        {/* Hotspot Presets */}
        <div className="flex flex-wrap items-center gap-1.5 bg-geo-card p-1.5 rounded-xl border border-geo-border text-xs">
          <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Eco-Hotspots:
          </span>
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => handleApplyPreset(p)}
              className="px-2.5 py-1 rounded-lg bg-geo-dark hover:bg-slate-800 text-slate-200 border border-geo-border transition-all"
            >
              {p.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Copernicus Data Access Status Card */}
      <div className="p-4 rounded-xl bg-geo-card border border-geo-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block">
              {searchResults?.auth_status?.provider || 'Copernicus Data Space Ecosystem (CDSE)'}
            </span>
            <span className="text-slate-400 text-[11px] block mt-0.5">
              {searchResults?.auth_status?.message || 'Serving authentic 10-meter Level-2A multi-spectral observations (B02 Blue, B03 Green, B04 Red, B08 NIR, B11 SWIR).'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            {searchResults?.auth_status?.mode || 'Verified ESA Archive'}
          </span>
        </div>
      </div>

      {searchError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{searchError}</span>
          </div>
          <button onClick={() => setSearchError(null)} className="text-xs font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Main Search Grid: Query Form & Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Geographic Parameters Form */}
        <div className="lg:col-span-5 rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            Geographical Search Criteria
          </h3>

          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Study Area / Region Name
              </label>
              <input
                type="text"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-geo-dark border border-geo-border text-xs text-white"
                placeholder="e.g. Western Ghats Reserve"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Latitude (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-geo-dark border border-geo-border text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Longitude (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-geo-dark border border-geo-border text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-geo-dark border border-geo-border text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-geo-dark border border-geo-border text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-slate-400" />
                  Max Cloud Coverage Filter
                </span>
                <span className="font-mono text-emerald-400 font-bold">{maxCloudCover}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={maxCloudCover}
                onChange={(e) => setMaxCloudCover(parseFloat(e.target.value) || 1)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Querying Sentinel-2 Catalog...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search Satellite Imagery</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="p-3 rounded-xl bg-geo-dark/70 border border-geo-border text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Sentinel-2 Multi-Spectral Band Payload:
            </p>
            <p>• <strong>B02:</strong> Blue (490nm) | • <strong>B03:</strong> Green (560nm)</p>
            <p>• <strong>B04:</strong> Red (665nm) | • <strong>B08:</strong> Near Infrared (842nm)</p>
            <p>• <strong>B11:</strong> Shortwave Infrared SWIR (1610nm)</p>
          </div>
        </div>

        {/* Right Column: Interactive Leaflet Map */}
        <div className="lg:col-span-7 rounded-2xl border border-geo-border overflow-hidden shadow-xl relative bg-geo-darker h-[460px]">
          <MapContainer
            center={[safeLat, safeLon]}
            zoom={8}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <MapCenterController center={{ lat: safeLat, lon: safeLon }} />
            <TileLayer
              attribution="Tiles &copy; Esri World Imagery"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <LocationPicker
              onLocationSelect={(newLat, newLon) => {
                setLat(round4(newLat));
                setLon(round4(newLon));
              }}
              currentPos={{ lat: safeLat, lng: safeLon }}
            />
            {/* Search Bounding Box Indicator */}
            <Rectangle
              bounds={[
                [safeLat - 0.12, safeLon - 0.12],
                [safeLat + 0.12, safeLon + 0.12]
              ]}
              pathOptions={{ color: '#10b981', weight: 2, dashArray: '4, 4', fillOpacity: 0.1 }}
            />
          </MapContainer>

          <div className="absolute bottom-3 left-3 z-[500] px-3 py-1.5 bg-black/85 backdrop-blur-md rounded-lg border border-geo-border text-[11px] text-slate-300 pointer-events-none flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Click anywhere on the map to set target center coordinates</span>
          </div>
        </div>
      </div>

      {/* Available Observations Results Grid */}
      {searchResults && (
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-geo-border pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Available Observations
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                  {searchResults.scenes?.length || 0} Scenes Found
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {searchResults.source} — {searchResults.note || 'Select two different observation dates to compare.'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Export JSON Button */}
              <button
                onClick={handleExportMetadata}
                className="px-3.5 py-2.5 rounded-xl bg-geo-dark hover:bg-slate-800 text-slate-300 hover:text-white border border-geo-border text-xs font-semibold flex items-center space-x-1.5 transition-all"
                title="Download raw Sentinel-2 metadata as JSON"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Export Metadata</span>
              </button>

              {/* Proceed to Change Detection Button */}
              <button
                onClick={handleProcessAndAnalyze}
                disabled={isProcessing || !selectedScene1 || !selectedScene2}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/40 flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Multispectral Bands...</span>
                  </>
                ) : (
                  <>
                    <span>Preprocess & Send to Change Detection</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Selection indicator pill */}
          <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-geo-dark/80 border border-geo-border text-xs">
            <span className="font-bold text-slate-300">Selected Comparison Pair:</span>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                T1 (Earlier): {selectedScene1 ? selectedScene1.date : 'None'}
              </span>
              <span className="text-slate-500">→</span>
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                T2 (Later): {selectedScene2 ? selectedScene2.date : 'None'}
              </span>
            </div>
            {selectedScene1 && selectedScene2 && (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 ml-auto">
                <Check className="w-3.5 h-3.5" />
                Ready to compute NDVI & NDWI multi-temporal differencing
              </span>
            )}
          </div>

          {/* Scenes Cards Grid with Visual Image Previews */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {searchResults.scenes?.map((scene) => {
              const isSelected1 = selectedScene1?.scene_id === scene.scene_id;
              const isSelected2 = selectedScene2?.scene_id === scene.scene_id;

              return (
                <div
                  key={scene.scene_id}
                  className={`rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                    isSelected1
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-950/40'
                      : isSelected2
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-950/40'
                      : 'border-geo-border bg-geo-dark/60 hover:border-slate-600'
                  }`}
                >
                  {/* Visual Satellite Image Preview */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden group border-b border-geo-border">
                    {scene.thumbnail_b64 || scene.thumbnail_url ? (
                      <img
                        src={scene.thumbnail_b64 || scene.thumbnail_url}
                        alt={`Sentinel-2 ${scene.date}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
                        <Satellite className="w-7 h-7 text-emerald-500/40" />
                        <span className="text-[10px]">Sentinel-2 MSI Level-2A</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-slate-700">
                      {scene.platform}
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                      Cloud: {scene.cloud_cover}%
                    </div>
                  </div>

                  {/* Scene Details */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                          {scene.date}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {scene.resolution_m || 10}m Res
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-geo-card/60 p-2 rounded-lg border border-geo-border">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Sun Elevation</span>
                          <span className="font-mono text-white">{scene.sun_elevation}°</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Sensor</span>
                          <span className="font-mono text-white truncate block">MSI Level-2A</span>
                        </div>
                      </div>

                      {scene.description && (
                        <p className="text-[11px] text-slate-300 leading-relaxed bg-black/30 p-2 rounded-lg border border-slate-800">
                          {scene.description}
                        </p>
                      )}
                    </div>

                    {/* Selection Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <button
                        onClick={() => setSelectedScene1(scene)}
                        className={`py-2 rounded-lg font-semibold transition-all ${
                          isSelected1
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                            : 'bg-geo-dark hover:bg-slate-800 text-slate-300 border border-geo-border'
                        }`}
                      >
                        {isSelected1 ? '✓ Selected as T1' : 'Set as Earlier (T1)'}
                      </button>

                      <button
                        onClick={() => setSelectedScene2(scene)}
                        className={`py-2 rounded-lg font-semibold transition-all ${
                          isSelected2
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40'
                            : 'bg-geo-dark hover:bg-slate-800 text-slate-300 border border-geo-border'
                        }`}
                      >
                        {isSelected2 ? '✓ Selected as T2' : 'Set as Later (T2)'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
