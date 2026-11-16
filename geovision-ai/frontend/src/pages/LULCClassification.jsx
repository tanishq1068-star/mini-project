import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Calendar,
  Sparkles,
  RefreshCw,
  Info,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Maximize2,
  HelpCircle,
  BarChart2,
  Download,
  Eye,
  Sliders,
  Cpu,
  ShieldCheck,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { runLULCClassification, fetchLULCResults } from '../services/api';
import MetricCard from '../components/MetricCard';

export default function LULCClassification({ currentSession }) {
  const [lulcData, setLulcData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMapView, setActiveMapView] = useState('side_by_side'); // 'side_by_side', 'classified_both', 't1_compare', 't2_compare'
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('dt_msi'); // 'dt_msi' or 'random_forest'
  const [selectedRegion, setSelectedRegion] = useState('current');

  const fetchLULC = async (algo = selectedAlgorithm, reg = selectedRegion) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        algorithm: algo,
        region_id: reg === 'current' ? null : reg
      };
      const res = await runLULCClassification(params);
      setLulcData(res);
    } catch (err) {
      setError(err.message || 'Failed to compute LULC classification.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If current session already contains LULC, use it initially
    if (currentSession?.lulc && !lulcData) {
      setLulcData(currentSession.lulc);
    } else {
      fetchLULC();
    }
  }, [currentSession]);

  const handleAlgorithmChange = (algo) => {
    setSelectedAlgorithm(algo);
    fetchLULC(algo, selectedRegion);
  };

  const handleRegionChange = (reg) => {
    setSelectedRegion(reg);
    fetchLULC(selectedAlgorithm, reg);
  };

  const classes = lulcData?.classes || [
    { class_id: 1, name: 'Forest', hex: '#15803d', desc: 'Dense woody tree canopy & moist reserves' },
    { class_id: 2, name: 'Water', hex: '#2563eb', desc: 'Open water bodies, lakes, rivers, reservoirs' },
    { class_id: 3, name: 'Vegetation', hex: '#84cc16', desc: 'Croplands, grasslands, shrubs & pasture' },
    { class_id: 4, name: 'Urban Areas', hex: '#e11d48', desc: 'Impervious built-up surfaces & settlements' },
    { class_id: 5, name: 'Barren Land', hex: '#eab308', desc: 'Bare soil, exposed earth, sand, rocky terrain' },
  ];

  // Dates
  const dateT1 = currentSession?.date_earlier || '2021-03-15';
  const dateT2 = currentSession?.date_later || '2024-03-20';

  // Prepare comparison chart data safely
  const chartData = (lulcData?.net_changes || []).map((nc) => ({
    name: nc.name,
    'Initial (T1)': nc.area_t1 || 0,
    'Recent (T2)': nc.area_t2 || 0,
    delta: nc.delta_ha || 0,
    deltaPct: nc.delta_pct || 0,
    color: nc.color
  }));

  // Pie chart data for T2 safely
  const pieDataT2 = classes.map((c) => {
    const stat = lulcData?.statistics_t2?.[c.name];
    return {
      name: c.name,
      value: stat ? stat.area_ha : 0,
      percentage: stat ? stat.percentage : 0,
      color: c.hex
    };
  });

  // Handler to download classification results
  const handleDownloadResults = () => {
    if (!lulcData) return;
    const exportPayload = {
      title: 'GeoVision AI - 5-Class LULC Classification Report',
      timestamp: new Date().toISOString(),
      region: currentSession?.region_name || 'Selected Sentinel-2 Region',
      dates: { baseline_t1: dateT1, recent_t2: dateT2 },
      algorithm: lulcData.algorithm_name || 'Decision Tree Multi-Spectral Engine (DT-MSI)',
      total_area_ha: lulcData.total_area_ha,
      statistics_t1: lulcData.statistics_t1,
      statistics_t2: lulcData.statistics_t2,
      net_changes: lulcData.net_changes,
      transition_matrix: lulcData.transition_matrix,
      academic_notes: lulcData.scientific_notes
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GeoVision_LULC_Report_${dateT2}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-geo-card border border-geo-border p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              5-Class Remote Sensing
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {currentSession?.region_name || 'Multi-Spectral Observation'}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Land Use & Land Cover (LULC) Classification
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Pixel-wise remote sensing classification across 5 land cover categories: Forest, Water, Vegetation,
            Urban Areas, and Barren Land. Evaluates bi-temporal surface transitions, category distributions,
            and From-To transition dynamics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadResults}
            disabled={!lulcData || loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download Report</span>
          </button>

          <button
            onClick={() => fetchLULC(selectedAlgorithm, selectedRegion)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Classifying...' : 'Re-Run Classification'}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Region, Dates, Algorithm */}
      <div className="bg-geo-card border border-geo-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        {/* Region Quick Select */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Study Region:
          </span>
          <button
            onClick={() => handleRegionChange('current')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedRegion === 'current'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Active Session
          </button>
          <button
            onClick={() => handleRegionChange('forest')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedRegion === 'forest'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Western Ghats (Forest)
          </button>
          <button
            onClick={() => handleRegionChange('water')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedRegion === 'water'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Bakhtegan Basin (Water)
          </button>
        </div>

        {/* Algorithm Select */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Algorithm:
          </span>
          <button
            onClick={() => handleAlgorithmChange('dt_msi')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedAlgorithm === 'dt_msi'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Calibrated Sentinel-2 Multi-Index Physical Decision Tree"
          >
            DT-MSI Decision Tree
          </button>
          <button
            onClick={() => handleAlgorithmChange('random_forest')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedAlgorithm === 'random_forest'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Random Forest Supervised Ensemble (Demonstration Mode)"
          >
            Random Forest (ML)
          </button>
        </div>
      </div>

      {/* Academic Integrity / Methodology Disclaimer */}
      {selectedAlgorithm === 'random_forest' ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">
              Supervised Machine Learning Mode (Random Forest Demonstration)
            </p>
            <p className="text-amber-200/90 leading-relaxed">
              Supervised machine learning classifiers require verified polygon ground-truth shapefiles (e.g., CORINE / Dynamic World).
              When external ground-truth shapefiles are not uploaded, GeoVision AI operates using stratified multi-spectral demonstration weights.
              For research and viva verification, this mode is explicitly distinguished from field-validated machine learning.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Deterministic DT-MSI Classification Active:</strong> Utilizing Sentinel-2 physical spectral bands (B02 Blue, B03 Green, B04 Red, B08 NIR) with calibrated physical index thresholds (NDVI, NDWI, NDBI).
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Observation Meta Badge */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-geo-darker/60 p-3.5 rounded-xl border border-geo-border text-xs">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Baseline Date (T1)</span>
          <span className="text-white font-mono font-semibold flex items-center gap-1 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            {dateT1}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Recent Date (T2)</span>
          <span className="text-white font-mono font-semibold flex items-center gap-1 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            {dateT2}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Spatial Extent</span>
          <span className="text-white font-mono font-semibold mt-0.5 block">
            {lulcData?.total_area_ha ? `${lulcData.total_area_ha.toLocaleString()} ha` : '2,621.44 ha'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Sensor Resolution</span>
          <span className="text-emerald-400 font-mono font-semibold mt-0.5 block">
            10.0m / pixel (Sentinel-2 L2A)
          </span>
        </div>
      </div>

      {/* 5-Class Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {classes.map((cls) => {
          const statT1 = lulcData?.statistics_t1?.[cls.name];
          const statT2 = lulcData?.statistics_t2?.[cls.name];
          const delta = statT1 && statT2 ? statT2.area_ha - statT1.area_ha : 0;
          const deltaPct = statT1 && statT1.area_ha > 0 ? (delta / statT1.area_ha) * 100 : 0;
          const isNegative = delta < 0;

          return (
            <div
              key={cls.class_id || cls.name}
              className="p-4 rounded-xl border border-geo-border bg-geo-card shadow-lg hover:border-slate-600 transition-all"
              style={{ borderTop: `4px solid ${cls.hex}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {cls.name}
                </span>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cls.hex }}
                ></span>
              </div>

              <div className="mt-2">
                <div className="text-xl font-black text-white font-mono">
                  {statT2 ? `${statT2.area_ha.toLocaleString()}` : '--'}
                  <span className="text-xs font-normal text-slate-400 ml-1">ha</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  {statT2 ? `${statT2.percentage}% of study area` : '--'}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 text-[10px]">Net:</span>
                <span
                  className={`font-semibold flex items-center gap-0.5 ${
                    delta === 0
                      ? 'text-slate-400'
                      : isNegative
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)} ha ({deltaPct > 0 ? '+' : ''}
                  {deltaPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Satellite Imagery vs Classified Maps Display */}
      <div className="bg-geo-card border border-geo-border rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-geo-border">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Satellite Imagery vs Classified LULC Maps
            </h2>
            <p className="text-xs text-slate-400">
              Inspect raw multi-spectral true-color imagery alongside the 5-class classified thematic layer.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex flex-wrap items-center bg-geo-darker p-1 rounded-xl border border-geo-border text-xs">
            <button
              onClick={() => setActiveMapView('side_by_side')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeMapView === 'side_by_side'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              True Color vs LULC
            </button>
            <button
              onClick={() => setActiveMapView('classified_both')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeMapView === 'classified_both'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              T1 vs T2 LULC
            </button>
            <button
              onClick={() => setActiveMapView('t2_compare')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeMapView === 't2_compare'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Recent Epoch (T2)
            </button>
          </div>
        </div>

        {/* Maps Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span className="text-emerald-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {activeMapView === 'side_by_side'
                  ? `True Color Satellite Image (${dateT2})`
                  : `Baseline LULC Map (T1: ${dateT1})`}
              </span>
              <span className="text-slate-400 font-mono">Sentinel-2 MSI</span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-geo-border bg-slate-950 aspect-video flex items-center justify-center group shadow-inner">
              {activeMapView === 'side_by_side' ? (
                lulcData?.true_color_t2 || currentSession?.later_image ? (
                  <img
                    src={lulcData?.true_color_t2 || currentSession?.later_image}
                    alt="True Color Satellite Imagery"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Layers className="w-8 h-8 animate-pulse text-emerald-500/50" />
                    <span className="text-xs">Loading True-Color Satellite Imagery...</span>
                  </div>
                )
              ) : lulcData?.lulc_map_t1 ? (
                <img
                  src={lulcData.lulc_map_t1}
                  alt="LULC Map T1"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Layers className="w-8 h-8 animate-pulse text-emerald-500/50" />
                  <span className="text-xs">Generating LULC map for T1...</span>
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                {activeMapView === 'side_by_side' ? 'True Color Optical' : 'Classified LULC (T1)'}
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span className="text-cyan-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {activeMapView === 'side_by_side'
                  ? `Classified 5-Class LULC Map (${dateT2})`
                  : `Recent LULC Map (T2: ${dateT2})`}
              </span>
              <span className="text-slate-400 font-mono">10m Ground Resolution</span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-geo-border bg-slate-950 aspect-video flex items-center justify-center group shadow-inner">
              {lulcData?.lulc_map_t2 ? (
                <img
                  src={lulcData.lulc_map_t2}
                  alt="LULC Map T2"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Layers className="w-8 h-8 animate-pulse text-cyan-500/50" />
                  <span className="text-xs">Generating LULC map for T2...</span>
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                {selectedAlgorithm === 'random_forest' ? 'Random Forest Classified' : 'DT-MSI Classified'}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 rounded-xl bg-geo-darker/60 border border-geo-border">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            5-Class Color Symbology & Spectral Definitions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {classes.map((c) => (
              <div key={c.class_id || c.name} className="flex items-center space-x-2.5 text-xs">
                <span
                  className="w-4 h-4 rounded-md flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: c.hex }}
                ></span>
                <div>
                  <span className="font-semibold text-white block">{c.name}</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    {c.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytical Charts: Area Comparison & T2 Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Area Comparison (Bar Chart) */}
        <div className="lg:col-span-2 bg-geo-card border border-geo-border rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-geo-border">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                Category Area Comparison (Hectares)
              </h3>
              <p className="text-xs text-slate-400">
                Direct spatial extent shift between $T_1$ ({dateT1}) and $T_2$ ({dateT2}).
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1320',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(val) => [`${Number(val || 0).toLocaleString()} ha`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Initial (T1)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Recent (T2)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* T2 Percentage Distribution (Donut Chart) */}
        <div className="bg-geo-card border border-geo-border rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              T2 Land Cover Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Proportion of total study area in {dateT2}.
            </p>
          </div>

          <div className="h-48 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataT2}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {pieDataT2.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1320',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(val, name, entry) => [
                    `${Number(val || 0).toLocaleString()} ha (${entry?.payload?.percentage || 0}%)`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
            {pieDataT2.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Land Cover Transition Matrix (From-To Cross-Tabulation Table) */}
      <div className="bg-geo-card border border-geo-border rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-geo-border">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Land Cover Transition Matrix (From-To Cross-Tabulation)
            </h3>
            <p className="text-xs text-slate-400">
              Cross-tabulation showing pixel transitions from Baseline ($T_1$) rows to Recent ($T_2$) columns in hectares.
              Diagonal values represent persistence (land cover that remained stable).
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Values in hectares (ha)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-geo-darker/60">
                <th className="p-3 text-slate-400 font-semibold uppercase tracking-wider">
                  Baseline (T1) \ Recent (T2)
                </th>
                {classes.map((cls) => (
                  <th
                    key={cls.class_id || cls.name}
                    className="p-3 font-semibold text-center"
                    style={{ color: cls.hex }}
                  >
                    {cls.name}
                  </th>
                ))}
                <th className="p-3 text-slate-400 font-semibold text-right">
                  Total T1 Area
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(lulcData?.transition_matrix || []).map((row, rIdx) => {
                const transitions = row.transitions || {};
                const t1Total = Object.values(transitions).reduce((acc, val) => acc + (val || 0), 0);

                return (
                  <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: row.color }}
                      ></span>
                      <span>{row.from_class}</span>
                    </td>

                    {classes.map((colClass, cIdx) => {
                      const val = transitions[colClass.name] || 0;
                      const isDiagonal = rIdx === cIdx; // Persistence

                      return (
                        <td
                          key={cIdx}
                          className={`p-3 text-center font-mono ${
                            isDiagonal
                              ? 'bg-emerald-500/10 font-bold text-emerald-300 border-x border-emerald-500/20'
                              : val > 10
                              ? 'text-amber-300 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {val > 0 ? val.toFixed(1) : '-'}
                          {isDiagonal && val > 0 && (
                            <span className="block text-[9px] text-emerald-500/80 font-sans font-normal">
                              (Stable)
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="p-3 font-mono font-bold text-white text-right">
                      {t1Total.toFixed(1)} ha
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-700/50 text-xs">
          <div className="p-3 rounded-xl bg-geo-darker/60 border border-geo-border">
            <span className="text-[10px] uppercase font-bold text-slate-400">Deforestation Driver</span>
            <p className="text-slate-300 mt-1">
              Forest converted to Barren Land or Agriculture identifies active logging and anthropogenic forest fragmentation.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-geo-darker/60 border border-geo-border">
            <span className="text-[10px] uppercase font-bold text-slate-400">Water Desiccation Driver</span>
            <p className="text-slate-300 mt-1">
              Water transitioned to Barren Land indicates exposed lakebeds, seasonal drought, or shoreline retreat.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-geo-darker/60 border border-geo-border">
            <span className="text-[10px] uppercase font-bold text-slate-400">Urban Expansion</span>
            <p className="text-slate-300 mt-1">
              Vegetation or Barren Land transitioned to Urban Areas indicates impervious expansion and built-up sprawl.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
