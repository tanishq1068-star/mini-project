import React from 'react';
import {
  Droplets,
  TrendingDown,
  TrendingUp,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Waves,
  Sparkles,
  MapPin
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

import MetricCard from '../components/MetricCard';

export default function WaterResources({ currentSession }) {
  const water = currentSession?.water || {};

  const totalArea = water.total_area_ha || 2621.44;
  const waterBefore = water.water_area_before_ha || 0;
  const waterAfter = water.water_area_after_ha || 0;
  const waterLost = water.water_area_decreased_ha || 0;
  const waterGained = water.water_area_increased_ha || 0;
  const netChange = water.net_water_change_ha || 0;
  const pctChange = water.percentage_water_change || 0;

  // Water Dynamics Chart Data
  const waterDynamicsData = [
    { name: 'Initial Water (T1)', extent: waterBefore, fill: '#2563eb' },
    { name: 'Post-Period Water (T2)', extent: waterAfter, fill: '#0284c7' },
    { name: 'Depletion / Loss', extent: waterLost, fill: '#ef4444' },
    { name: 'Expansion / Gain', extent: waterGained, fill: '#06b6d4' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Module 02
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Hydro-Catchment & Surface Water Indexing
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Droplets className="w-6 h-6 text-cyan-400" />
            Water Resource & Reservoir Monitoring
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Tracking lakes, rivers, reservoirs, and wetland surface water retreat, drought, and inundation.
          </p>
        </div>

        {/* Algorithm Badge */}
        <div className="bg-geo-card border border-geo-border px-4 py-2.5 rounded-xl text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Index Employed</p>
          <p className="text-xs font-bold text-cyan-400 font-mono">
            {water.index_name || 'Normalized Difference Water Index (McFeeters NDWI)'}
          </p>
        </div>
      </div>

      {/* Scientific Notice */}
      <div className={`rounded-xl border p-4 ${
        water.is_true_ndwi
          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg mt-0.5 ${
            water.is_true_ndwi ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {water.is_true_ndwi ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                {water.is_true_ndwi ? 'Multispectral McFeeters NDWI Active' : 'RGB Water Estimation Active (Notice)'}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40">
                Formula: {water.is_true_ndwi ? 'NDWI = (GREEN - NIR) / (GREEN + NIR)' : 'NDWI_rgb = ((G + B)/2 - R) / ((G + B)/2 + R)'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {water.scientific_note}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Water Area Before (T1)"
          value={waterBefore.toLocaleString()}
          unit="ha"
          subtitle={`Observed on ${currentSession?.date_earlier}`}
          icon={Droplets}
          accentColor="blue"
        />

        <MetricCard
          title="Water Area After (T2)"
          value={waterAfter.toLocaleString()}
          unit="ha"
          subtitle={`Observed on ${currentSession?.date_later}`}
          icon={Droplets}
          accentColor="cyan"
        />

        <MetricCard
          title="Water Area Decreased"
          value={waterLost.toLocaleString()}
          unit="ha"
          change={waterLost > 0 ? 'Desiccation' : 'None'}
          changeType={waterLost > 0 ? 'negative' : 'neutral'}
          subtitle="Shoreline Retreat / Drought"
          icon={TrendingDown}
          accentColor="rose"
        />

        <MetricCard
          title="Water Area Increased"
          value={waterGained.toLocaleString()}
          unit="ha"
          change={`${pctChange >= 0 ? '+' : ''}${pctChange}% Net`}
          changeType={pctChange >= 0 ? 'positive' : 'negative'}
          subtitle="Newly Inundated Water"
          icon={TrendingUp}
          accentColor="cyan"
        />
      </div>

      {/* Primary Water Change Map Visualizer */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-geo-border gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Surface Water Resource Change Map
            </h3>
            <p className="text-xs text-slate-400">
              High-contrast hydrological change map tracking lakes, reservoirs, river channels, and ponds.
            </p>
          </div>

          {/* Color Legend required by prompt:
              Blue: Water bodies
              Red: Reduced water coverage
              Cyan: Newly detected water areas
              Grey: Non-water regions */}
          <div className="flex flex-wrap items-center gap-3 bg-geo-dark/70 px-3.5 py-2 rounded-xl border border-geo-border text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#2563eb]"></span>
              <span className="text-slate-300 font-medium">Water Bodies (Stable)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
              <span className="text-slate-300 font-medium">Reduced Water Coverage</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span>
              <span className="text-slate-300 font-medium">Newly Detected Water</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#323842]"></span>
              <span className="text-slate-400 font-medium">Non-Water Regions</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {/* Main Change Map Image */}
          <div className="lg:col-span-2 relative aspect-square rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner">
            <img
              src={water.change_map_image}
              alt="Water Change Map"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-md text-xs font-bold text-white border border-slate-700">
              GeoVision AI Classified Hydro-Map
            </div>
          </div>

          {/* Side Comparison Panels */}
          <div className="space-y-4">
            <div className="rounded-xl bg-geo-dark/70 border border-geo-border p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                NDWI Colormap Index (T1 vs T2)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-blue-400 mb-1">Earlier (T1)</p>
                  <img
                    src={water.ndwi_before_map}
                    alt="NDWI Earlier"
                    className="w-full aspect-square rounded-lg object-cover border border-geo-border"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-cyan-400 mb-1">Later (T2)</p>
                  <img
                    src={water.ndwi_after_map}
                    alt="NDWI Later"
                    className="w-full aspect-square rounded-lg object-cover border border-geo-border"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Vibrant azure values ($NDWI \ge 0.05$) indicate open water; ochre-tan values represent dry terrestrial soil.
              </p>
            </div>

            {/* Pixel Statistics Card */}
            <div className="rounded-xl bg-geo-dark/70 border border-geo-border p-4 space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-400">
                Hydro-Pixel Quantization
              </h4>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Stable Water Pixels</span>
                  <span className="font-mono font-bold text-blue-400">
                    {water.pixel_metrics?.stable_water_pixels?.toLocaleString() || 0} px
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Desiccated / Lost</span>
                  <span className="font-mono font-bold text-rose-400">
                    {water.pixel_metrics?.lost_water_pixels?.toLocaleString() || 0} px
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Newly Inundated</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {water.pixel_metrics?.gained_water_pixels?.toLocaleString() || 0} px
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Non-Water Terrestrial</span>
                  <span className="font-mono font-bold text-slate-400">
                    {water.pixel_metrics?.non_water_pixels?.toLocaleString() || 0} px
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Surface Water Dynamics Chart */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-1">
          Water Resource Budget Analysis (Hectares)
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Quantified breakdown of baseline reservoir storage, current surface area, depletion, and inundation
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterDynamicsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="extent" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW FEATURE 3: WATER DEPLETION HOTSPOT DETECTION */}
      {currentSession?.water_hotspots && (
        <div className="rounded-2xl border border-cyan-500/30 bg-geo-card p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-geo-border pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" />
                  Hydrological Depletion Hotspots
                </span>
                <span className="text-xs text-slate-400">NDWI Shoreline Contraction Analysis</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                Detected Water Depletion & Shoreline Retraction Clusters
              </h3>
              <p className="text-xs text-slate-400">
                Spatial clusters experiencing severe reservoir drying, lakebed exposure, and hydrological storage loss.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                {currentSession.water_hotspots.severity_summary?.high || 0} High Desiccation
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {currentSession.water_hotspots.total_depletion_area_ha || 0} ha Total Depleted
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-geo-darker/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Cluster ID</th>
                  <th className="p-3">Centroid Coordinates</th>
                  <th className="p-3 text-right">Desiccated Area</th>
                  <th className="p-3 text-right">Depletion %</th>
                  <th className="p-3 text-center">Severity</th>
                  <th className="p-3">Hydro-Morphological Threat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(currentSession.water_hotspots.hotspots || []).map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: wh.color }}></span>
                      <span>{wh.id}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      [{wh.coordinates[0].toFixed(4)}°N, {wh.coordinates[1].toFixed(4)}°E]
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-400">
                      {wh.area_ha} ha
                    </td>
                    <td className="p-3 text-right font-mono text-amber-300 font-semibold">
                      -{wh.depletion_percentage}%
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase"
                        style={{
                          backgroundColor: `${wh.color}25`,
                          color: wh.color,
                          border: `1px solid ${wh.color}50`
                        }}
                      >
                        {wh.severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 text-[11px]">
                      {wh.threat_description}
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
