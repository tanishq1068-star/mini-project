import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  MoveHorizontal,
  CheckCircle2,
  Calendar,
  Activity,
  Maximize2,
  Info,
  Sliders,
  ShieldCheck,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

import ImageSlider from '../components/ImageSlider';
import MetricCard from '../components/MetricCard';

export default function ChangeDetection({ currentSession }) {
  const change = currentSession?.change_detection || {};
  const stats = change.statistics || {};
  const alignment = change.alignment || {};
  const pixelCounts = change.pixel_counts || {};

  const [activeViewMode, setActiveViewMode] = useState('trio'); // 'trio', 'slider', 'heatmap'

  const changeCategoriesData = [
    { name: 'Deforestation', area: stats.deforestation_ha || 0, color: '#ef4444' },
    { name: 'Water Loss', area: stats.water_loss_ha || 0, color: '#f97316' },
    { name: 'Water Expansion', area: stats.water_gain_ha || 0, color: '#06b6d4' },
    { name: 'Vegetation Growth', area: stats.regrowth_ha || 0, color: '#10b981' },
    { name: 'Soil / Disturbance', area: stats.other_change_ha || 0, color: '#eab308' },
    { name: 'Stable Unchanged', area: stats.total_stable_ha || 0, color: '#475569' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Core Multi-Temporal Module
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Automated Feature Registration • Spectral Differencing • Change Classification
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            Multi-Temporal Environmental Change Detection
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Integrated pixel-level comparison comparing observation dates: {currentSession?.date_earlier} vs {currentSession?.date_later}.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-geo-card p-1 rounded-xl border border-geo-border">
          <button
            onClick={() => setActiveViewMode('trio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeViewMode === 'trio'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3-Way Image View
          </button>
          <button
            onClick={() => setActiveViewMode('slider')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeViewMode === 'slider'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Interactive Slider
          </button>
          <button
            onClick={() => setActiveViewMode('heatmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeViewMode === 'heatmap'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Magnitude Heatmap
          </button>
        </div>
      </div>

      {/* Preprocessing and Registration Pipeline Status */}
      <div className="rounded-xl border border-geo-border bg-geo-card/60 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Registration & Noise Filtering Status
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                Completed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {alignment.message || 'Bilateral denoising and sub-pixel tie-point alignment applied.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-300">
          <div>
            <span className="text-slate-500 block text-[10px]">TOTAL EXTENT</span>
            <span className="font-bold text-white">{stats.total_area_ha || 2621.44} ha</span>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div>
            <span className="text-slate-500 block text-[10px]">TOTAL ALTERED</span>
            <span className="font-bold text-rose-400">{stats.total_changed_ha || 0} ha</span>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div>
            <span className="text-slate-500 block text-[10px]">NET CHANGE</span>
            <span className="font-bold text-cyan-400">{stats.change_percentage || 0}%</span>
          </div>
        </div>
      </div>

      {/* Primary Display Area */}
      {activeViewMode === 'trio' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Earlier Satellite Image */}
            <div className="rounded-2xl border border-geo-border bg-geo-card p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  1. Earlier Observation (T1)
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {currentSession?.date_earlier}
                </span>
              </div>
              <div className="relative aspect-square rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner">
                <img
                  src={change.earlier_image || currentSession?.earlier_image}
                  alt="Earlier Satellite Observation"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                  Pre-Change Baseline
                </div>
              </div>
            </div>

            {/* Later Satellite Image */}
            <div className="rounded-2xl border border-geo-border bg-geo-card p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  2. Later Observation (T2)
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {currentSession?.date_later}
                </span>
              </div>
              <div className="relative aspect-square rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner">
                <img
                  src={change.later_image || currentSession?.later_image}
                  alt="Later Satellite Observation"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded text-[11px] font-semibold text-cyan-400 border border-cyan-500/30">
                  Post-Change Monitoring
                </div>
              </div>
            </div>

            {/* Final Multi-Temporal Change Detection Map */}
            <div className="rounded-2xl border-2 border-cyan-500/40 bg-geo-card p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  3. Classified Change Map
                </span>
                <span className="text-emerald-400 font-mono text-[11px] font-bold">
                  {stats.change_percentage}% Altered
                </span>
              </div>
              <div className="relative aspect-square rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner">
                <img
                  src={change.change_map_image}
                  alt="Final Change Map"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded text-[11px] font-semibold text-white border border-slate-700">
                  GeoVision Multi-Temporal Synthesis
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeViewMode === 'slider' && (
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MoveHorizontal className="w-5 h-5 text-cyan-400" />
                Interactive Before-and-After Comparison Slider
              </h3>
              <p className="text-xs text-slate-400">
                Drag the divider horizontally across the canvas to visually reveal terrain and land cover changes.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 px-2.5 py-1 rounded bg-slate-800">
              Interactive Mode
            </span>
          </div>

          <ImageSlider
            beforeImage={change.earlier_image || currentSession?.earlier_image}
            afterImage={change.later_image || currentSession?.later_image}
            beforeLabel={`Earlier Date: ${currentSession?.date_earlier}`}
            afterLabel={`Later Date: ${currentSession?.date_later}`}
            className="h-[520px] w-full"
          />
        </div>
      )}

      {activeViewMode === 'heatmap' && (
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Change Magnitude Spectrum (Spectral Distance Heatmap)
              </h3>
              <p className="text-xs text-slate-400">
                Visualizing Euclidean spectral delta $\Delta I = ||I_{t2} - I_{t1}||$. Cool dark tones indicate unchanged pixels; bright yellow/red indicates severe surface alteration.
              </p>
            </div>
          </div>

          <div className="relative aspect-[16/9] max-h-[500px] rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner mx-auto">
            <img
              src={change.change_heatmap_image}
              alt="Change Magnitude Heatmap"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Change Map Legend and Classification Breakdown */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white mb-1">
            Spectral Classification & Ecological Dynamics (Hectares)
          </h3>
          <p className="text-xs text-slate-400">
            Categorical breakdown of identified land cover transitions across the observation interval
          </p>
        </div>

        {/* Legend Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-geo-dark/80 border border-geo-border flex items-center space-x-2.5">
            <span className="w-4 h-4 rounded bg-[#ef4444] flex-shrink-0 shadow-sm"></span>
            <div>
              <p className="text-xs font-bold text-white">Deforestation</p>
              <p className="text-[11px] font-mono text-rose-400">{stats.deforestation_ha || 0} ha</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-geo-dark/80 border border-geo-border flex items-center space-x-2.5">
            <span className="w-4 h-4 rounded bg-[#f97316] flex-shrink-0 shadow-sm"></span>
            <div>
              <p className="text-xs font-bold text-white">Water Loss</p>
              <p className="text-[11px] font-mono text-amber-400">{stats.water_loss_ha || 0} ha</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-geo-dark/80 border border-geo-border flex items-center space-x-2.5">
            <span className="w-4 h-4 rounded bg-[#06b6d4] flex-shrink-0 shadow-sm"></span>
            <div>
              <p className="text-xs font-bold text-white">Water Gain</p>
              <p className="text-[11px] font-mono text-cyan-400">{stats.water_gain_ha || 0} ha</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-geo-dark/80 border border-geo-border flex items-center space-x-2.5">
            <span className="w-4 h-4 rounded bg-[#10b981] flex-shrink-0 shadow-sm"></span>
            <div>
              <p className="text-xs font-bold text-white">Regrowth</p>
              <p className="text-[11px] font-mono text-emerald-400">{stats.regrowth_ha || 0} ha</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-geo-dark/80 border border-geo-border flex items-center space-x-2.5">
            <span className="w-4 h-4 rounded bg-[#eab308] flex-shrink-0 shadow-sm"></span>
            <div>
              <p className="text-xs font-bold text-white">Soil / Urban</p>
              <p className="text-[11px] font-mono text-yellow-400">{stats.other_change_ha || 0} ha</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-geo-dark/80 border border-geo-border flex items-center space-x-2.5">
            <span className="w-4 h-4 rounded bg-[#334155] flex-shrink-0 shadow-sm"></span>
            <div>
              <p className="text-xs font-bold text-white">Unchanged</p>
              <p className="text-[11px] font-mono text-slate-400">{stats.total_stable_ha || 0} ha</p>
            </div>
          </div>
        </div>

        {/* Categories Bar Chart */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={changeCategoriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="area" radius={[4, 4, 0, 0]}>
                {changeCategoriesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
