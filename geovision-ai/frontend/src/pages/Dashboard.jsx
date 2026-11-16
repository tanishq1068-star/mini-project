import React, { useState, useEffect } from 'react';
import {
  Trees,
  Droplets,
  Layers,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Maximize2,
  Cloud,
  Sparkles,
  MapPin,
  Bell,
  ArrowUpRight,
  Compass,
  ShieldAlert,
  Flame,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import MetricCard from '../components/MetricCard';
import ImageSlider from '../components/ImageSlider';
import { fetchAlerts } from '../services/api';

export default function Dashboard({ currentSession, setActiveTab, onLoadSample }) {
  const [alertSummary, setAlertSummary] = useState({ total_alerts: 0, active_alerts: 0, critical_count: 0 });

  useEffect(() => {
    let isMounted = true;
    async function loadAlerts() {
      try {
        const res = await fetchAlerts();
        if (isMounted && res?.summary) {
          setAlertSummary(res.summary);
        }
      } catch (err) {
        console.warn('Could not load live alerts for dashboard summary:', err);
      }
    }
    loadAlerts();
    return () => { isMounted = false; };
  }, [currentSession]);

  const deforest = currentSession?.deforestation || {};
  const water = currentSession?.water || {};
  const change = currentSession?.change_detection || {};
  const stats = change.statistics || {};

  const totalArea = deforest.total_area_ha || 2621.44;
  const forestBefore = deforest.vegetation_area_before_ha || 0;
  const forestAfter = deforest.vegetation_area_after_ha || 0;
  const forestLoss = deforest.total_vegetation_loss_ha || 0;
  const vegPctChange = deforest.percentage_vegetation_change || 0;

  const waterBefore = water.water_area_before_ha || 0;
  const waterAfter = water.water_area_after_ha || 0;
  const waterLoss = water.water_area_decreased_ha || 0;
  const waterGain = water.water_area_increased_ha || 0;
  const waterPctChange = water.percentage_water_change || 0;

  // Cloud coverage & quality
  const cloudCover = currentSession?.cloud_cover_t2 ?? currentSession?.cloud_masking?.cloud_coverage_percent ?? (currentSession?.scenario === 'forest' ? 3.4 : 1.8);
  const cloudQuality = cloudCover <= 5
    ? { label: 'Optimal Optical Window (< 5%)', color: 'emerald' }
    : cloudCover <= 15
    ? { label: 'Acceptable Cloud Cover (< 15%)', color: 'cyan' }
    : { label: 'Moderate Interference (> 15%)', color: 'amber' };

  // Temporal baseline calculation
  const date1 = currentSession?.date_earlier || '2021-03-15';
  const date2 = currentSession?.date_later || '2024-03-20';
  let daysDiff = 0;
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    daysDiff = Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24)));
  } catch {
    daysDiff = 1095;
  }

  // Hotspots summaries
  const deforestHotspots = currentSession?.deforestation_hotspots?.hotspots || [];
  const totalDeforestHotspots = currentSession?.deforestation_hotspots?.total_hotspots_detected || deforestHotspots.length;
  const highDeforestHotspots = currentSession?.deforestation_hotspots?.severity_breakdown?.HIGH ??
    deforestHotspots.filter(h => h.severity === 'HIGH').length;

  const waterHotspots = currentSession?.water_hotspots?.hotspots || [];
  const totalWaterHotspots = currentSession?.water_hotspots?.total_depletion_hotspots || waterHotspots.length;
  const highWaterHotspots = currentSession?.water_hotspots?.severity_breakdown?.HIGH ??
    waterHotspots.filter(h => h.severity === 'HIGH').length;

  // Sensor and source info
  const isRealSentinel = currentSession?.is_live_sentinel || (!currentSession?.is_demonstration_data && currentSession?.sensor?.includes('Sentinel'));
  const sensorLabel = currentSession?.sensor || 'Sentinel-2 MSI Level-2A (ESA Copernicus)';

  // Recharts Chart Data: Forest Comparison
  const forestChartData = [
    { name: 'Initial Forest (T1)', area: forestBefore, fill: '#10b981' },
    { name: 'Current Forest (T2)', area: forestAfter, fill: '#059669' },
    { name: 'Forest Loss', area: forestLoss, fill: '#ef4444' },
    { name: 'Regrowth', area: deforest.vegetation_regrowth_ha || 0, fill: '#06b6d4' }
  ];

  // Water Comparison Data
  const waterChartData = [
    { name: 'Initial Water (T1)', area: waterBefore, fill: '#2563eb' },
    { name: 'Current Water (T2)', area: waterAfter, fill: '#0284c7' },
    { name: 'Water Deficit', area: waterLoss, fill: '#f97316' },
    { name: 'Water Inundation', area: waterGain, fill: '#06b6d4' }
  ];

  // Land Cover Distribution
  const landCoverData = [
    { name: 'Stable Vegetation', value: deforest.pixel_metrics?.stable_vegetation_pixels || 120000, color: '#10b981' },
    { name: 'Deforested Canopy', value: deforest.pixel_metrics?.loss_pixels || 45000, color: '#ef4444' },
    { name: 'Water Resources', value: water.pixel_metrics?.stable_water_pixels || 30000, color: '#2563eb' },
    { name: 'Water Desiccated', value: water.pixel_metrics?.lost_water_pixels || 15000, color: '#f97316' },
    { name: 'Bare Land / Urban', value: deforest.pixel_metrics?.non_vegetated_pixels || 80000, color: '#64748b' }
  ];

  // Environmental Change Timeline
  const timelineData = [
    { year: date1, forest: forestBefore, water: waterBefore },
    { year: 'Mid-Point', forest: +(forestBefore * 0.92).toFixed(1), water: +(waterBefore * 0.88).toFixed(1) },
    { year: date2, forest: forestAfter, water: waterAfter }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Mission Control Bar: Sensor, Cloud, Baseline & Alerts */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-geo-border">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Mission Overview
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                isRealSentinel
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {isRealSentinel ? 'Live Sentinel-2 Data' : 'Pre-calibrated Demonstration'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {currentSession?.region_name || 'Western Ghats, India'}
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <span>Multi-Temporal Satellite Surveillance Dashboard</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('satellite-explorer')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Search Sentinel-2 Scenes</span>
            </button>
            <button
              onClick={() => setActiveTab('interactive-map')}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Open GIS Map</span>
            </button>
          </div>
        </div>

        {/* Executive Metadata Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-4">
          {/* 1. Observation Interval */}
          <div className="rounded-xl bg-geo-dark/70 border border-geo-border p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-[11px] uppercase">Acquisition Baseline</span>
            </div>
            <div className="font-bold text-white text-xs tracking-tight">
              {date1} <span className="text-slate-500">→</span> {date2}
            </div>
            <p className="text-[10px] text-cyan-400 font-medium mt-0.5">
              {daysDiff} days temporal gap
            </p>
          </div>

          {/* 2. Cloud Coverage % */}
          <div className="rounded-xl bg-geo-dark/70 border border-geo-border p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-[11px] uppercase">Cloud Cover %</span>
            </div>
            <div className="text-base font-black text-white font-mono">
              {typeof cloudCover === 'number' ? cloudCover.toFixed(1) : cloudCover}%
            </div>
            <p className={`text-[10px] font-semibold mt-0.5 ${
              cloudCover <= 5 ? 'text-emerald-400' : cloudCover <= 15 ? 'text-cyan-400' : 'text-amber-400'
            }`}>
              {cloudQuality.label}
            </p>
          </div>

          {/* 3. Sensor Specification */}
          <div className="rounded-xl bg-geo-dark/70 border border-geo-border p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-semibold text-[11px] uppercase">Sensor Platform</span>
            </div>
            <div className="font-bold text-white text-xs truncate">
              {isRealSentinel ? 'Sentinel-2 MSI' : 'Calibrated Synth'}
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              10m / px • L2A BOA
            </p>
          </div>

          {/* 4. Deforestation Hotspots */}
          <div
            onClick={() => setActiveTab('deforestation')}
            className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 cursor-pointer hover:border-rose-500/40 transition-all group"
          >
            <div className="flex items-center justify-between text-rose-400 text-xs mb-1">
              <div className="flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-semibold text-[11px] uppercase">Forest Hotspots</span>
              </div>
              <ArrowUpRight className="w-3 h-3 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-base font-black text-rose-300 font-mono">
              {totalDeforestHotspots} Clusters
            </div>
            <p className="text-[10px] text-rose-400 font-medium mt-0.5">
              {highDeforestHotspots} High-severity clusters
            </p>
          </div>

          {/* 5. Water Depletion Clusters */}
          <div
            onClick={() => setActiveTab('water')}
            className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 cursor-pointer hover:border-amber-500/40 transition-all group"
          >
            <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
              <div className="flex items-center space-x-1.5">
                <Droplets className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-[11px] uppercase">Water Clusters</span>
              </div>
              <ArrowUpRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-base font-black text-amber-300 font-mono">
              {totalWaterHotspots} Clusters
            </div>
            <p className="text-[10px] text-amber-400 font-medium mt-0.5">
              {highWaterHotspots} Critical desiccation
            </p>
          </div>

          {/* 6. Active Environmental Alerts */}
          <div
            onClick={() => setActiveTab('alerts')}
            className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 cursor-pointer hover:border-emerald-500/40 transition-all group"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
              <div className="flex items-center space-x-1.5">
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-[11px] uppercase">Active Alerts</span>
              </div>
              {alertSummary.active_alerts > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </div>
            <div className="text-base font-black text-emerald-300 font-mono">
              {alertSummary.active_alerts} Active
            </div>
            <p className="text-[10px] text-emerald-400/90 font-medium mt-0.5">
              {alertSummary.critical_count} Critical incidents
            </p>
          </div>
        </div>
      </div>

      {/* Demonstration Banner */}
      {currentSession?.is_demonstration_data && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-300">
                Demonstration Mode Active ({currentSession.scenario === 'forest' ? 'Western Ghats Rainforest' : 'Bakhtegan Lake Basin'})
              </p>
              <p className="text-xs text-amber-300/80">
                Displaying pre-computed Sentinel-2 multi-temporal satellite observations. You can search live Copernicus Sentinel-2 scenes or upload custom GeoTIFF imagery anytime.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onLoadSample(currentSession.scenario === 'forest' ? 'water' : 'forest')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold text-amber-300 transition-all"
            >
              Switch to {currentSession.scenario === 'forest' ? 'Water Scenario' : 'Forest Scenario'}
            </button>
            <button
              onClick={() => setActiveTab('satellite-imagery')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all"
            >
              Upload Custom
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Area"
          value={totalArea.toLocaleString()}
          unit="ha"
          subtitle="Spatial Study Extent"
          icon={Maximize2}
          accentColor="blue"
        />

        <MetricCard
          title="Forest Cover"
          value={forestAfter.toLocaleString()}
          unit="ha"
          change={`${vegPctChange >= 0 ? '+' : ''}${vegPctChange}%`}
          changeType={vegPctChange >= 0 ? 'positive' : 'negative'}
          subtitle={`Was ${forestBefore.toLocaleString()} ha (T1)`}
          icon={Trees}
          accentColor="emerald"
        />

        <MetricCard
          title="Forest Loss"
          value={forestLoss.toLocaleString()}
          unit="ha"
          change={`${deforest.loss_percentage_of_initial || 0}% of forest`}
          changeType="negative"
          subtitle="Deforested Canopy"
          icon={TrendingDown}
          accentColor="rose"
        />

        <MetricCard
          title="Water Bodies"
          value={waterAfter.toLocaleString()}
          unit="ha"
          change={`${waterPctChange >= 0 ? '+' : ''}${waterPctChange}%`}
          changeType={waterPctChange >= 0 ? 'positive' : 'negative'}
          subtitle={`Was ${waterBefore.toLocaleString()} ha (T1)`}
          icon={Droplets}
          accentColor="cyan"
        />

        <MetricCard
          title="Water Depleted"
          value={waterLoss.toLocaleString()}
          unit="ha"
          change={waterLoss > 0 ? 'Desiccated' : 'Stable'}
          changeType={waterLoss > 0 ? 'negative' : 'neutral'}
          subtitle="Shoreline Retraction"
          icon={TrendingDown}
          accentColor="amber"
        />

        <MetricCard
          title="Total Changed"
          value={stats.change_percentage || 0}
          unit="%"
          subtitle={`${stats.total_changed_ha || 0} ha altered`}
          icon={Activity}
          accentColor={stats.change_percentage > 15 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Hotspots & Alert Quick Action Banner */}
      {(totalDeforestHotspots > 0 || totalWaterHotspots > 0 || alertSummary.active_alerts > 0) && (
        <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-950/20 via-geo-card to-amber-950/20 p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Environmental Hotspot & Incident Dispatch Alert</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono uppercase">
                    Spatial AI Trigger
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Autonomous spatial clustering identified{' '}
                  <strong className="text-rose-400">{totalDeforestHotspots} deforestation hotspots</strong> ({highDeforestHotspots} high severity) and{' '}
                  <strong className="text-amber-400">{totalWaterHotspots} water depletion clusters</strong>. There are{' '}
                  <strong className="text-emerald-400">{alertSummary.active_alerts} active alerts</strong> awaiting field verification.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('interactive-map')}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>View on GIS Map</span>
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className="px-3.5 py-2 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Acknowledge Alerts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Split-Screen Comparison Preview */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-geo-border gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Multi-Temporal Satellite Comparison
            </h3>
            <p className="text-xs text-slate-400">
              Drag the interactive slider handle horizontally to inspect changes between observation dates.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('comparison-slider')}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Full Slider Mode
            </button>
            <button
              onClick={() => setActiveTab('change-detection')}
              className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <span>Open Detailed Change Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2">
            <ImageSlider
              beforeImage={currentSession?.earlier_image}
              afterImage={currentSession?.later_image}
              beforeLabel={`Earlier (${date1})`}
              afterLabel={`Later (${date2})`}
              className="h-80 sm:h-96 w-full"
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-geo-dark/70 border border-geo-border p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Observation Parameters</span>
                <span className="text-[10px] text-emerald-400 font-mono">10m GSD</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Region Name</span>
                  <span className="font-semibold text-white">{currentSession?.region_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Sensor Band Order</span>
                  <span className="font-mono text-emerald-400">
                    {currentSession?.image_info?.earlier?.is_multispectral ? 'Red, Green, Blue, NIR, SWIR' : 'RGB True Color (3-Band)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Cloud Quality</span>
                  <span className="font-semibold text-cyan-400">{cloudQuality.label}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Stability Index</span>
                  <span className="font-semibold text-emerald-400">{stats.stability_percentage || 85}% Unchanged</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-4">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Automated Change Detection Summary</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Vegetation coverage experienced a net change of{' '}
                <strong className={vegPctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {vegPctChange > 0 ? `+${vegPctChange}%` : `${vegPctChange}%`}
                </strong>
                , with {forestLoss.toLocaleString()} hectares classified as canopy loss. Surface water extent shifted by{' '}
                <strong className={waterPctChange >= 0 ? 'text-cyan-400' : 'text-amber-400'}>
                  {waterPctChange > 0 ? `+${waterPctChange}%` : `${waterPctChange}%`}
                </strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forest Coverage Chart */}
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trees className="w-4 h-4 text-emerald-400" />
                Vegetation Coverage Dynamics (Hectares)
              </h3>
              <p className="text-xs text-slate-400">Baseline vs post-period canopy area</p>
            </div>
            <button
              onClick={() => setActiveTab('deforestation')}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View NDVI</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forestChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="area" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water Coverage Chart */}
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                Water Resource Dynamics (Hectares)
              </h3>
              <p className="text-xs text-slate-400">Baseline vs post-period surface water</p>
            </div>
            <button
              onClick={() => setActiveTab('water')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>View NDWI</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="area" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Land Cover Breakdown & Environmental Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Land Cover Classification */}
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white">Land Cover Pixel Distribution</h3>
            <button
              onClick={() => setActiveTab('lulc')}
              className="text-[11px] text-emerald-400 hover:underline"
            >
              5-Class LULC
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">Class breakdown across study zone</p>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={landCoverData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {landCoverData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 mt-2">
            {landCoverData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono text-slate-400">{item.value.toLocaleString()} px</span>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental Trend Timeline */}
        <div className="lg:col-span-2 rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Multi-Temporal Environmental Trend
              </h3>
              <p className="text-xs text-slate-400">Canopy vs water trajectory over observation interval</p>
            </div>
            <button
              onClick={() => setActiveTab('multi-year')}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-all"
            >
              Decadal Analysis →
            </button>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="forestGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="forest" name="Forest Area (ha)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#forestGrad)" />
                <Area type="monotone" dataKey="water" name="Water Area (ha)" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#waterGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
