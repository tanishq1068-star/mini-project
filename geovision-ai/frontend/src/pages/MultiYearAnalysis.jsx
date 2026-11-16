import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Activity,
  Trees,
  Droplets,
  TrendingDown,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Globe2,
  CheckCircle2,
  BarChart2,
  Download,
  AlertTriangle,
  Eye,
  CheckSquare,
  Square,
  MapPin,
  ArrowRight,
  Maximize2,
  Filter,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

import { fetchMultiYearRegions, analyzeMultiYearTimeline, fetchMultiYearHistory } from '../services/api';
import MetricCard from '../components/MetricCard';

export default function MultiYearAnalysis({ currentSession }) {
  const [regions, setRegions] = useState([]);
  const [selectedRegionId, setSelectedRegionId] = useState('western_ghats');
  const [selectedYears, setSelectedYears] = useState([2014, 2016, 2018, 2020, 2022, 2024]);
  const [startDate, setStartDate] = useState('2014-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available regions on initial mount
  useEffect(() => {
    async function loadRegions() {
      try {
        const res = await fetchMultiYearRegions();
        if (res?.regions) {
          setRegions(res.regions);
          const defRegion = res.regions.find(r => r.region_id === 'western_ghats') || res.regions[0];
          if (defRegion?.available_years) {
            setSelectedYears(defRegion.available_years);
          }
        }
      } catch (err) {
        console.error('Error fetching multi-year regions:', err);
      }
    }
    loadRegions();
  }, []);

  // Fetch timeline analysis
  const fetchTimeline = async (regionId = selectedRegionId, years = selectedYears, sDate = startDate, eDate = endDate) => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyzeMultiYearTimeline({
        region_id: regionId,
        selected_years: years,
        start_date: sDate,
        end_date: eDate
      });
      setTimelineData(res);
    } catch (err) {
      setError(err.message || 'Failed to analyze multi-year timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRegionId) {
      fetchTimeline(selectedRegionId, selectedYears, startDate, endDate);
    }
  }, [selectedRegionId]);

  const activeRegionObj = regions.find(r => r.region_id === selectedRegionId);
  const availableYears = activeRegionObj?.available_years || [2014, 2016, 2018, 2020, 2022, 2024];

  // Toggle year selection checkbox
  const handleToggleYear = (year) => {
    let updated;
    if (selectedYears.includes(year)) {
      if (selectedYears.length <= 2) {
        setError('At least two observation years are required to compute multi-temporal trajectories.');
        return;
      }
      updated = selectedYears.filter(y => y !== year);
    } else {
      updated = [...selectedYears, year].sort((a, b) => a - b);
    }
    setError(null);
    setSelectedYears(updated);
  };

  // Select all available years
  const handleSelectAllYears = () => {
    setSelectedYears(availableYears);
    setError(null);
  };

  // Handle region switch
  const handleRegionChange = (newRegionId) => {
    setSelectedRegionId(newRegionId);
    const rObj = regions.find(r => r.region_id === newRegionId);
    if (rObj?.available_years) {
      setSelectedYears(rObj.available_years);
      fetchTimeline(newRegionId, rObj.available_years, startDate, endDate);
    } else {
      fetchTimeline(newRegionId, selectedYears, startDate, endDate);
    }
  };

  // Explicit Analyze action triggered by button
  const handleRunAnalysis = () => {
    fetchTimeline(selectedRegionId, selectedYears, startDate, endDate);
  };

  // Export year-wise table as CSV
  const handleExportCSV = () => {
    if (!timelineData?.timeline) return;
    const headers = 'Year,Acquisition Date,Forest Area (ha),Forest %,Water Area (ha),Water %,Delta Forest (ha),Annual Rate (ha/yr),Mean NDVI,Mean NDWI,Cloud Cover %\n';
    const rows = timelineData.timeline.map(o =>
      `${o.year},"${o.date}",${o.forest_ha},${o.forest_percentage},${o.water_ha},${o.water_percentage},${o.forest_delta_baseline_ha || 0},${o.forest_annual_rate_ha || 0},${o.mean_ndvi},${o.mean_ndwi},${o.cloud_cover}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GeoVision_MultiYear_${selectedRegionId}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const cumulative = timelineData?.cumulative_summary || {};
  const intervals = timelineData?.intervals || {};
  const timeline = timelineData?.timeline || [];
  const forestStats = timelineData?.forest_statistics || {};
  const waterStats = timelineData?.water_statistics || {};

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Heading & Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-geo-border pb-6 bg-geo-card p-6 rounded-2xl border shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Decadal Time-Series Archive
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Sentinel-2 MSI & Landsat Decadal Archives
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Multi-Year Environmental Analysis</span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Quantify long-term environmental dynamics, decadal deforestation trajectories, and chronic reservoir shrinkage
            across multi-annual Sentinel-2 satellite observations. Customize study regions, observation dates, and time horizons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={!timeline.length || loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV Table</span>
          </button>

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs transition-all shadow-lg shadow-amber-900/30 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing...' : 'Analyze Multi-Year Trajectory'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Controls Card: Region, Date Range, Multi-Year Checkboxes */}
      <div className="bg-geo-card border border-geo-border rounded-2xl p-5 space-y-4 shadow-xl">
        {/* Geographical Region Selection */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-geo-border">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-amber-400" /> Geographical Region:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {regions.map((r) => (
              <button
                key={r.region_id}
                onClick={() => handleRegionChange(r.region_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedRegionId === r.region_id
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {r.name.split(' (')[0].split(',')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Start & End Observation Dates + Year Checkboxes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1 items-center">
          {/* Date Range Inputs */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-geo-darker border border-geo-border text-white text-xs font-mono focus:border-amber-500 outline-none"
              />
            </div>
            <span className="text-slate-500 mt-4">→</span>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-geo-darker border border-geo-border text-white text-xs font-mono focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Multiple Observation Date Checkboxes */}
          <div className="lg:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Multiple Observation Years ({selectedYears.length} selected):
              </span>
              <button
                onClick={handleSelectAllYears}
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                Select All
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availableYears.map((yr) => {
                const isChecked = selectedYears.includes(yr);
                return (
                  <button
                    key={yr}
                    onClick={() => handleToggleYear(yr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                      isChecked
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{yr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State Spinner */}
      {loading && (
        <div className="rounded-2xl border border-geo-border bg-geo-card p-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-white">Retrieving & Analyzing Multi-Temporal Observations...</p>
          <p className="text-xs text-slate-400">Processing Sentinel-2 decadal archives for {activeRegionObj?.name || 'Selected Region'}</p>
        </div>
      )}

      {/* Forest & Water Coverage Statistics Metric Cards */}
      {timelineData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Forest Cover (Recent)"
            value={(forestStats.recent_forest_ha || 0).toLocaleString()}
            unit="ha"
            change={`${forestStats.net_forest_loss_pct >= 0 ? '+' : ''}${forestStats.net_forest_loss_pct || 0}%`}
            changeType={forestStats.net_forest_loss_pct >= 0 ? 'positive' : 'negative'}
            subtitle={`Initial: ${(forestStats.initial_forest_ha || 0).toLocaleString()} ha`}
            icon={Trees}
            accentColor="emerald"
          />

          <MetricCard
            title="Net Forest Shift"
            value={(forestStats.net_forest_loss_ha || 0).toLocaleString()}
            unit="ha"
            change={`${forestStats.annual_loss_velocity_ha_yr || 0} ha/yr`}
            changeType={forestStats.net_forest_loss_ha < 0 ? 'negative' : 'positive'}
            subtitle="Annual Loss Velocity"
            icon={TrendingDown}
            accentColor="rose"
          />

          <MetricCard
            title="Water Extent (Recent)"
            value={(waterStats.recent_water_ha || 0).toLocaleString()}
            unit="ha"
            change={`${waterStats.net_water_loss_pct >= 0 ? '+' : ''}${waterStats.net_water_loss_pct || 0}%`}
            changeType={waterStats.net_water_loss_pct >= 0 ? 'positive' : 'negative'}
            subtitle={`Initial: ${(waterStats.initial_water_ha || 0).toLocaleString()} ha`}
            icon={Droplets}
            accentColor="cyan"
          />

          <MetricCard
            title="Net Water Shift"
            value={(waterStats.net_water_loss_ha || 0).toLocaleString()}
            unit="ha"
            change={`${waterStats.annual_loss_velocity_ha_yr || 0} ha/yr`}
            changeType={waterStats.net_water_loss_ha < 0 ? 'negative' : 'positive'}
            subtitle="Annual Desiccation Rate"
            icon={TrendingDown}
            accentColor="amber"
          />
        </div>
      )}

      {/* Interval Benchmark Cards: 3-Year, 5-Year, Decadal Horizon */}
      {timelineData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 3-Year Comparison Card */}
          <div className="rounded-xl border border-geo-border bg-geo-card p-5 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 3-Year Horizon Shift
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {intervals.three_year?.start_year} → {intervals.three_year?.end_year}
              </span>
            </div>
            <div className="pt-1 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Forest Coverage Shift:</span>
                <span className={`font-mono font-bold ${intervals.three_year?.forest_change_ha < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {intervals.three_year?.forest_change_ha || 0} ha ({intervals.three_year?.forest_change_pct || 0}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Water Extent Shift:</span>
                <span className={`font-mono font-bold ${intervals.three_year?.water_change_ha < 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {intervals.three_year?.water_change_ha || 0} ha ({intervals.three_year?.water_change_pct || 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* 5-Year Comparison Card */}
          <div className="rounded-xl border border-geo-border bg-geo-card p-5 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 5-Year Horizon Shift
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {intervals.five_year?.start_year} → {intervals.five_year?.end_year}
              </span>
            </div>
            <div className="pt-1 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Forest Coverage Shift:</span>
                <span className={`font-mono font-bold ${intervals.five_year?.forest_change_ha < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {intervals.five_year?.forest_change_ha || 0} ha ({intervals.five_year?.forest_change_pct || 0}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Water Extent Shift:</span>
                <span className={`font-mono font-bold ${intervals.five_year?.water_change_ha < 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {intervals.five_year?.water_change_ha || 0} ha ({intervals.five_year?.water_change_pct || 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* 10-Year Comparison Card */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Decadal Cumulative Shift
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 text-emerald-200">
                {cumulative.total_forest_change_ha < 0 ? 'Canopy Loss' : 'Vegetation Gain'}
              </span>
            </div>
            <div className="pt-1 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-300">Net Forest Shift:</span>
                <span className="font-mono font-bold text-rose-300">
                  {cumulative.total_forest_change_ha || 0} ha ({cumulative.total_forest_change_pct || 0}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Net Water Shift:</span>
                <span className="font-mono font-bold text-amber-300">
                  {cumulative.total_water_change_ha || 0} ha ({cumulative.total_water_change_pct || 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Satellite Observation Comparison Gallery */}
      {timeline.length > 0 && (
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-geo-border">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                Satellite Observation Comparison Gallery
              </h3>
              <p className="text-xs text-slate-400">
                Optical satellite captures retrieved across sequential multi-year epochs.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-slate-800 px-2.5 py-1 rounded">
              Sentinel-2 & Landsat
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {timeline.map((obs) => (
              <div
                key={obs.year}
                className="rounded-xl border border-geo-border bg-slate-900/80 p-2.5 space-y-2 hover:border-slate-600 transition-all shadow-md"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white">{obs.year}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{obs.date}</span>
                </div>

                <div className="aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                  {obs.image_preview ? (
                    <img
                      src={obs.image_preview}
                      alt={`Satellite capture ${obs.year}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-[10px] text-slate-500">Capture {obs.year}</div>
                  )}
                </div>

                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-emerald-400">
                    <span>Forest:</span>
                    <span>{obs.forest_ha} ha</span>
                  </div>
                  <div className="flex justify-between text-cyan-400">
                    <span>Water:</span>
                    <span>{obs.water_ha} ha</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                    <span>Mean NDVI:</span>
                    <span className="text-slate-300">{obs.mean_ndvi}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Multi-Year Trend Graphs */}
      {timeline.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 1: Forest Coverage Trend Chart */}
          <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-geo-border">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trees className="w-4 h-4 text-emerald-400" />
                  Forest Coverage Trend (Hectares)
                </h3>
                <p className="text-xs text-slate-400">Multi-annual tree canopy surface trajectory</p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-slate-800">
                Velocity: {cumulative.annual_forest_loss_velocity_ha_yr || 0} ha/yr
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forestTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => [`${Number(val).toLocaleString()} ha`, 'Forest Area']}
                  />
                  <Area type="monotone" dataKey="forest_ha" name="Forest Area" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#forestTrendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2: Water Coverage Trend Chart */}
          <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-geo-border">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  Water Coverage Trend (Hectares)
                </h3>
                <p className="text-xs text-slate-400">Multi-annual surface water extent trajectory</p>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-slate-800">
                Rate: {cumulative.annual_water_loss_velocity_ha_yr || 0} ha/yr
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="waterTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => [`${Number(val).toLocaleString()} ha`, 'Water Area']}
                  />
                  <Area type="monotone" dataKey="water_ha" name="Water Area" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#waterTrendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Year-Wise Statistics Table */}
      {timeline.length > 0 && (
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-geo-border">
            <div>
              <h3 className="text-base font-bold text-white">Year-Wise Satellite Observation Comparison Table</h3>
              <p className="text-xs text-slate-400">
                Calculated forest and water coverage statistics from Copernicus Sentinel-2 observations.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-slate-800 px-3 py-1 rounded">
              Multi-Temporal Audit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-geo-border">
              <thead>
                <tr className="bg-geo-darker text-slate-300 font-bold border-b border-geo-border">
                  <th className="p-3">Year</th>
                  <th className="p-3">Acquisition Date</th>
                  <th className="p-3">Forest Area (ha)</th>
                  <th className="p-3">Water Area (ha)</th>
                  <th className="p-3">Forest %</th>
                  <th className="p-3">Water %</th>
                  <th className="p-3">Δ Forest (ha)</th>
                  <th className="p-3">Annual Velocity</th>
                  <th className="p-3">Mean NDVI</th>
                  <th className="p-3">Mean NDWI</th>
                  <th className="p-3">Cloud %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {timeline.map((o) => (
                  <tr key={o.year} className="hover:bg-slate-800/40 font-mono">
                    <td className="p-3 font-bold text-white font-sans">{o.year}</td>
                    <td className="p-3 text-slate-400">{o.date}</td>
                    <td className="p-3 text-emerald-400 font-bold">{o.forest_ha} ha</td>
                    <td className="p-3 text-cyan-400 font-bold">{o.water_ha} ha</td>
                    <td className="p-3 text-slate-300">{o.forest_percentage}%</td>
                    <td className="p-3 text-slate-300">{o.water_percentage}%</td>
                    <td className={`p-3 font-bold ${o.forest_delta_baseline_ha < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {o.forest_delta_baseline_ha ? `${o.forest_delta_baseline_ha > 0 ? '+' : ''}${o.forest_delta_baseline_ha} ha` : 'Baseline'}
                    </td>
                    <td className={`p-3 font-bold ${o.forest_annual_rate_ha < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {o.forest_annual_rate_ha !== 0 ? `${o.forest_annual_rate_ha} ha/yr` : 'Baseline'}
                    </td>
                    <td className="p-3 text-emerald-300">{o.mean_ndvi}</td>
                    <td className="p-3 text-cyan-300">{o.mean_ndwi}</td>
                    <td className="p-3 text-slate-400">{o.cloud_cover}%</td>
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
