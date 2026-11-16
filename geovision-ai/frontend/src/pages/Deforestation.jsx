import React from 'react';
import {
  Trees,
  TrendingDown,
  Info,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sparkles,
  Flame,
  MapPin
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

import MetricCard from '../components/MetricCard';

export default function Deforestation({ currentSession }) {
  const deforest = currentSession?.deforestation || {};
  const isMultispectral = currentSession?.image_info?.earlier?.is_multispectral;

  const totalArea = deforest.total_area_ha || 2621.44;
  const vegBefore = deforest.vegetation_area_before_ha || 0;
  const vegAfter = deforest.vegetation_area_after_ha || 0;
  const vegLoss = deforest.total_vegetation_loss_ha || 0;
  const vegGain = deforest.vegetation_regrowth_ha || 0;
  const netChange = deforest.net_change_ha || 0;
  const pctChange = deforest.percentage_vegetation_change || 0;
  const lossPct = deforest.loss_percentage_of_initial || 0;

  const breakdownBefore = deforest.breakdown_before || {};
  const breakdownAfter = deforest.breakdown_after || {};

  // Comparison Bar Chart Data
  const classificationComparisonData = [
    {
      category: 'Dense Canopy',
      Before: breakdownBefore.dense_ha || 0,
      After: breakdownAfter.dense_ha || 0,
    },
    {
      category: 'Moderate Canopy',
      Before: breakdownBefore.moderate_ha || 0,
      After: breakdownAfter.moderate_ha || 0,
    },
    {
      category: 'Low Vegetation',
      Before: breakdownBefore.low_ha || 0,
      After: breakdownAfter.low_ha || 0,
    },
    {
      category: 'Bare Soil / Non-Veg',
      Before: breakdownBefore.bare_ha || 0,
      After: breakdownAfter.bare_ha || 0,
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Module 01
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Sentinel-2 L2A BOA Multispectral Indexing
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Trees className="w-6 h-6 text-emerald-400" />
            Deforestation & Vegetation Canopy Detection
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Quantifying vegetation loss, forest degradation, and canopy health across multi-temporal observations.
          </p>
        </div>

        {/* Algorithm Badge */}
        <div className="bg-geo-card border border-geo-border px-4 py-2.5 rounded-xl text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Index Employed</p>
          <p className="text-xs font-bold text-emerald-400 font-mono">
            {deforest.index_name || 'Normalized Difference Vegetation Index (NDVI)'}
          </p>
        </div>
      </div>

      {/* Scientific Limitation & Methodology Notice */}
      <div className={`rounded-xl border p-4 ${
        deforest.is_true_ndvi
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg mt-0.5 ${
            deforest.is_true_ndvi ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {deforest.is_true_ndvi ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                {deforest.is_true_ndvi ? 'Rigorous Multispectral NDVI Pipeline Active' : 'RGB Visible Index Active (VARI Limitation Notice)'}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40">
                Formula: {deforest.is_true_ndvi ? 'NDVI = (NIR - RED) / (NIR + RED)' : 'VARI = (Green - Red) / (Green + Red - Blue)'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {deforest.scientific_note}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Forest Area Before (T1)"
          value={vegBefore.toLocaleString()}
          unit="ha"
          subtitle={`Observed on ${currentSession?.date_earlier}`}
          icon={Trees}
          accentColor="emerald"
        />

        <MetricCard
          title="Forest Area After (T2)"
          value={vegAfter.toLocaleString()}
          unit="ha"
          subtitle={`Observed on ${currentSession?.date_later}`}
          icon={Trees}
          accentColor="cyan"
        />

        <MetricCard
          title="Total Vegetation Loss"
          value={vegLoss.toLocaleString()}
          unit="ha"
          change={`-${lossPct}%`}
          changeType="negative"
          subtitle="Net Canopy Clearance"
          icon={TrendingDown}
          accentColor="rose"
        />

        <MetricCard
          title="Vegetation Net Change"
          value={`${pctChange >= 0 ? '+' : ''}${pctChange}%`}
          unit=""
          change={`${netChange >= 0 ? '+' : ''}${netChange.toLocaleString()} ha`}
          changeType={pctChange >= 0 ? 'positive' : 'negative'}
          subtitle="Overall Canopy Shift"
          icon={Trees}
          accentColor={pctChange >= 0 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Primary Vegetation Change Map Visualizer */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-geo-border gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Vegetation Change Detection Map
            </h3>
            <p className="text-xs text-slate-400">
              Pixel-by-pixel multi-temporal classification showing canopy preservation, loss, and moderate stress.
            </p>
          </div>

          {/* Color Legend required by prompt:
              Green: Vegetation
              Red: Vegetation loss
              Yellow: Moderate vegetation change
              Dark grey: Non-vegetated areas */}
          <div className="flex flex-wrap items-center gap-3 bg-geo-dark/70 px-3.5 py-2 rounded-xl border border-geo-border text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span>
              <span className="text-slate-300 font-medium">Vegetation (Stable)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
              <span className="text-slate-300 font-medium">Vegetation Loss</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#eab308]"></span>
              <span className="text-slate-300 font-medium">Moderate Change</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#2d343c]"></span>
              <span className="text-slate-400 font-medium">Non-Vegetated</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {/* Main Change Map Image */}
          <div className="lg:col-span-2 relative aspect-square rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner">
            <img
              src={deforest.change_map_image}
              alt="Vegetation Change Map"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-md text-xs font-bold text-white border border-slate-700">
              GeoVision AI Classified Change Map
            </div>
          </div>

          {/* Side Comparison Panels */}
          <div className="space-y-4">
            <div className="rounded-xl bg-geo-dark/70 border border-geo-border p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                NDVI Colormap Spectrum (T1 vs T2)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-400 mb-1">Earlier (T1)</p>
                  <img
                    src={deforest.ndvi_before_map}
                    alt="NDVI Earlier"
                    className="w-full aspect-square rounded-lg object-cover border border-geo-border"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-cyan-400 mb-1">Later (T2)</p>
                  <img
                    src={deforest.ndvi_after_map}
                    alt="NDVI Later"
                    className="w-full aspect-square rounded-lg object-cover border border-geo-border"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Deep green tones represent high chlorophyll density ($NDVI \ge 0.50$); yellow-brown tones represent bare or deforested ground.
              </p>
            </div>

            {/* Pixel Statistics Card */}
            <div className="rounded-xl bg-geo-dark/70 border border-geo-border p-4 space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-400">
                Canopy Pixel Quantization
              </h4>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Deforested Pixels</span>
                  <span className="font-mono font-bold text-rose-400">
                    {deforest.pixel_metrics?.loss_pixels?.toLocaleString() || 0} px
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Moderate Alteration</span>
                  <span className="font-mono font-bold text-amber-400">
                    {deforest.pixel_metrics?.moderate_change_pixels?.toLocaleString() || 0} px
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Stable Canopy</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {deforest.pixel_metrics?.stable_vegetation_pixels?.toLocaleString() || 0} px
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Vegetation Regrowth</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {deforest.pixel_metrics?.regrowth_pixels?.toLocaleString() || 0} px
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canopy Classification Shift Chart */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-1">
          Vegetation Density Transitions: T1 vs T2 (Hectares)
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Comparison across Dense Vegetation, Moderate Vegetation, Low Vegetation, and Non-Vegetated bare soil
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classificationComparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Before" name="Earlier Date (T1)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="After" name="Later Date (T2)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW FEATURE 2: DEFORESTATION HOTSPOT DETECTION */}
      {currentSession?.deforestation_hotspots && (
        <div className="rounded-2xl border border-rose-500/30 bg-geo-card p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-geo-border pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  Spatial Density Hotspot Analysis
                </span>
                <span className="text-xs text-slate-400">Connected Component Clustering</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                Detected Deforestation Hotspots & Critical Clusters
              </h3>
              <p className="text-xs text-slate-400">
                Identifies contiguous geographic clusters experiencing concentrated canopy clearings and timber extraction.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                {currentSession.deforestation_hotspots.severity_summary?.high || 0} High Severity
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {currentSession.deforestation_hotspots.severity_summary?.medium || 0} Medium
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-geo-darker/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Hotspot ID</th>
                  <th className="p-3">Centroid Coordinates</th>
                  <th className="p-3 text-right">Canopy Loss Extent</th>
                  <th className="p-3 text-right">Mean ΔNDVI</th>
                  <th className="p-3 text-center">Severity</th>
                  <th className="p-3">Threat Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(currentSession.deforestation_hotspots.hotspots || []).map((hs) => (
                  <tr key={hs.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hs.color }}></span>
                      <span>{hs.id}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      [{hs.coordinates[0].toFixed(4)}°N, {hs.coordinates[1].toFixed(4)}°E]
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-400">
                      {hs.area_ha} ha ({hs.canopy_loss_percentage}%)
                    </td>
                    <td className="p-3 text-right font-mono text-amber-300 font-semibold">
                      {hs.mean_delta_ndvi}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase"
                        style={{
                          backgroundColor: `${hs.color}25`,
                          color: hs.color,
                          border: `1px solid ${hs.color}50`
                        }}
                      >
                        {hs.severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 text-[11px]">
                      {hs.threat_description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
