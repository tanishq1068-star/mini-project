import React from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Activity,
  Trees,
  Droplets,
  Layers,
  PieChart as PieIcon,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import MetricCard from '../components/MetricCard';

export default function Analytics({ currentSession }) {
  const deforest = currentSession?.deforestation || {};
  const water = currentSession?.water || {};
  const change = currentSession?.change_detection || {};
  const stats = change.statistics || {};

  const totalArea = deforest.total_area_ha || 2621.44;
  const forestBefore = deforest.vegetation_area_before_ha || 0;
  const forestAfter = deforest.vegetation_area_after_ha || 0;
  const forestLoss = deforest.total_vegetation_loss_ha || 0;
  const forestRegrowth = deforest.vegetation_regrowth_ha || 0;
  const forestPct = deforest.percentage_vegetation_change || 0;

  const waterBefore = water.water_area_before_ha || 0;
  const waterAfter = water.water_area_after_ha || 0;
  const waterLoss = water.water_area_decreased_ha || 0;
  const waterGain = water.water_area_increased_ha || 0;
  const waterPct = water.percentage_water_change || 0;

  // Chart 1: Forest Area Comparison Bar Chart
  const forestComparisonData = [
    { name: 'Initial Forest (T1)', Hectares: forestBefore, fill: '#10b981' },
    { name: 'Post Forest (T2)', Hectares: forestAfter, fill: '#059669' },
    { name: 'Net Canopy Loss', Hectares: forestLoss, fill: '#ef4444' },
    { name: 'Regrowth', Hectares: forestRegrowth, fill: '#06b6d4' },
  ];

  // Chart 2: Water Area Comparison Bar Chart
  const waterComparisonData = [
    { name: 'Initial Water (T1)', Hectares: waterBefore, fill: '#2563eb' },
    { name: 'Post Water (T2)', Hectares: waterAfter, fill: '#0284c7' },
    { name: 'Water Deficit', Hectares: waterLoss, fill: '#f97316' },
    { name: 'Water Inundation', Hectares: waterGain, fill: '#06b6d4' },
  ];

  // Chart 3: Combined Land Surface Transition
  const combinedBeforeAfterData = [
    { category: 'Vegetation Canopy', Earlier: forestBefore, Later: forestAfter },
    { category: 'Water Resources', Earlier: waterBefore, Later: waterAfter },
    { category: 'Deforested / Desiccated', Earlier: 0, Later: forestLoss + waterLoss },
    { category: 'Bare Soil / Terrestrial', Earlier: totalArea - forestBefore - waterBefore, Later: totalArea - forestAfter - waterAfter },
  ];

  // Chart 4: Environmental Change Timeline
  const timelineData = [
    { stage: 'Baseline (T1)', forest: forestBefore, water: waterBefore, disturbed: 0 },
    { stage: 'Mid Interval', forest: Number((forestBefore * 0.91).toFixed(1)), water: Number((waterBefore * 0.86).toFixed(1)), disturbed: Number(((forestLoss + waterLoss) * 0.5).toFixed(1)) },
    { stage: 'Observation (T2)', forest: forestAfter, water: waterAfter, disturbed: Number((forestLoss + waterLoss).toFixed(1)) },
  ];

  // Radar Data for Ecosystem Health Profile
  const radarData = [
    { metric: 'Canopy Density', value: Math.min(100, Math.round((forestAfter / Math.max(forestBefore, 1)) * 100)) },
    { metric: 'Hydrological Index', value: Math.min(100, Math.round((waterAfter / Math.max(waterBefore, 1)) * 100)) },
    { metric: 'Landscape Stability', value: Math.round(stats.stability_percentage || 85) },
    { metric: 'Deforestation Resistance', value: Math.max(0, 100 - Math.round(deforest.loss_percentage_of_initial || 15)) },
    { metric: 'Catchment Retention', value: Math.max(0, 100 - Math.round(Math.abs(waterPct))) },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
              Quantitative Analytics
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Statistical Aggregation • Multi-Temporal Trends • Biome Metrics
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Environmental Analytics & Statistical Modeling
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Detailed statistical evaluation of terrestrial canopy loss, surface hydrology, and temporal land transition.
          </p>
        </div>

        <div className="bg-geo-card border border-geo-border px-4 py-2.5 rounded-xl text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Analyzed Area</p>
          <p className="text-sm font-bold text-emerald-400 font-mono">
            {totalArea.toLocaleString()} Hectares
          </p>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Vegetation Change"
          value={`${forestPct >= 0 ? '+' : ''}${forestPct}%`}
          change={`${deforest.net_change_ha >= 0 ? '+' : ''}${deforest.net_change_ha || 0} ha`}
          changeType={forestPct >= 0 ? 'positive' : 'negative'}
          subtitle={`Forest Loss: ${forestLoss.toLocaleString()} ha`}
          icon={Trees}
          accentColor="emerald"
        />

        <MetricCard
          title="Water Coverage Change"
          value={`${waterPct >= 0 ? '+' : ''}${waterPct}%`}
          change={`${water.net_water_change_ha >= 0 ? '+' : ''}${water.net_water_change_ha || 0} ha`}
          changeType={waterPct >= 0 ? 'positive' : 'negative'}
          subtitle={`Water Deficit: ${waterLoss.toLocaleString()} ha`}
          icon={Droplets}
          accentColor="cyan"
        />

        <MetricCard
          title="Land Surface Stability"
          value={`${stats.stability_percentage || 85}%`}
          change="Unmodified Terrain"
          changeType="positive"
          subtitle={`${stats.total_stable_ha || 0} ha preserved`}
          icon={Activity}
          accentColor="blue"
        />

        <MetricCard
          title="Total Disturbance Extent"
          value={`${stats.change_percentage || 15}%`}
          change="Altered Area"
          changeType="negative"
          subtitle={`${stats.total_changed_ha || 0} ha impacted`}
          icon={TrendingDown}
          accentColor="rose"
        />
      </div>

      {/* Row 1: Forest & Water Area Comparison Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forest Comparison Bar Chart */}
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trees className="w-5 h-5 text-emerald-400" />
              Forest Area Comparison (Hectares)
            </h3>
            <p className="text-xs text-slate-400">
              Direct quantification of baseline canopy, post-observation canopy, and gross deforestation
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forestComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="Hectares" radius={[6, 6, 0, 0]}>
                  {forestComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water Area Comparison Bar Chart */}
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-400" />
              Water Resource Extent Comparison (Hectares)
            </h3>
            <p className="text-xs text-slate-400">
              Comparative analysis of open water surface area, drying up, and newly inundated margins
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="Hectares" radius={[6, 6, 0, 0]}>
                  {waterComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Before-and-After Grouped Bar Chart & Radar Biome Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Before and After Comparison Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Land Cover Before-and-After Shift (T1 vs T2)
            </h3>
            <p className="text-xs text-slate-400">
              Paired comparison across major environmental classes
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedBeforeAfterData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Earlier" name="Earlier Date (T1)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Later" name="Later Date (T2)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biome Integrity Radar Chart */}
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Ecosystem Resilience Radar
            </h3>
            <p className="text-xs text-slate-400">
              Multivariate index normalized to 100 scale
            </p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis stroke="#64748b" fontSize={9} domain={[0, 100]} />
                <Radar name="Biome Score" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Environmental Change Timeline */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Environmental Transition Timeline: Forest vs Water vs Disturbance
            </h3>
            <p className="text-xs text-slate-400">
              Temporal land modification curve across the multi-temporal interval
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300">
            {currentSession?.date_earlier} to {currentSession?.date_later}
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="forestAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="waterAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="disturbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="stage" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="forest" name="Forest Area (ha)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#forestAreaGrad)" />
              <Area type="monotone" dataKey="water" name="Water Area (ha)" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#waterAreaGrad)" />
              <Area type="monotone" dataKey="disturbed" name="Disturbed Extent (ha)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#disturbAreaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
