import React from 'react';
import {
  LayoutDashboard,
  Compass,
  MoveHorizontal,
  Satellite,
  Trees,
  Droplets,
  Layers,
  Map as MapIcon,
  BarChart3,
  FileText,
  Info,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cloud,
  History,
  FolderClock,
  ShieldCheck,
  Grid,
  AlertTriangle
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentSession,
  onLoadSample,
  loadingSample
}) {
  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'satellite-explorer', path: '/satellite-explorer', label: 'Satellite Data Explorer', icon: Compass, badge: 'Live', highlight: true },
    { id: 'comparison-slider', path: '/comparison-slider', label: 'Before & After Comparison', icon: MoveHorizontal, badge: 'Interactive' },
    { id: 'satellite-imagery', path: '/satellite-imagery', label: 'Satellite Imagery', icon: Satellite },
    { id: 'cloud-masking', path: '/cloud-masking', label: 'Cloud Masking', icon: Cloud, badge: 'Quality' },
    { id: 'deforestation', path: '/deforestation', label: 'Deforestation Detection', icon: Trees },
    { id: 'water', path: '/water-resources', label: 'Water Resource Monitoring', icon: Droplets },
    { id: 'change-detection', path: '/change-detection', label: 'Change Detection', icon: Layers, highlight: true },
    { id: 'lulc', path: '/lulc-classification', label: 'LULC Classification', icon: Grid, badge: '5-Class' },
    { id: 'multi-year', path: '/multi-year-analysis', label: 'Multi-Year Analysis', icon: History, badge: 'Decadal' },
    { id: 'accuracy-assessment', path: '/accuracy-assessment', label: 'Accuracy Assessment', icon: ShieldCheck, badge: 'Matrix' },
    { id: 'alerts', path: '/alerts', label: 'Environmental Alerts', icon: AlertTriangle, badge: 'Active' },
    { id: 'interactive-map', path: '/interactive-map', label: 'Interactive Map', icon: MapIcon },
    { id: 'analytics', path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', path: '/history', label: 'Analysis History', icon: FolderClock, badge: 'Archive' },
    { id: 'generate-report', path: '/generate-report', label: 'Advanced PDF Reports', icon: FileText, badge: '12-Sec' },
    { id: 'about', path: '/about', label: 'About Project', icon: Info },
  ];

  const currentScenario = currentSession?.scenario || 'forest';

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-geo-darker border-r border-geo-border h-screen sticky top-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="p-5 border-b border-geo-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-geo-dark rounded-[10px] flex items-center justify-center">
              <Satellite className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              GeoVision AI
            </h1>
            <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Remote Sensing System
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-3.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Sentinel Engine Active</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v2.0</span>
        </div>
      </div>

      {/* Demonstration Scenario Quick Switcher */}
      <div className="px-4 py-3 border-b border-geo-border bg-geo-card/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Demo Scenarios
          </span>
          {currentSession?.is_demonstration_data && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Sample
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onLoadSample('forest')}
            disabled={loadingSample}
            className={`px-2 py-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
              currentScenario === 'forest'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30 border border-emerald-400'
                : 'bg-geo-card text-slate-300 hover:bg-slate-800 border border-geo-border'
            }`}
          >
            <Trees className="w-4 h-4 mb-1 text-emerald-300" />
            <span>Deforestation</span>
          </button>

          <button
            type="button"
            onClick={() => onLoadSample('water')}
            disabled={loadingSample}
            className={`px-2 py-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
              currentScenario === 'water'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-700/30 border border-cyan-400'
                : 'bg-geo-card text-slate-300 hover:bg-slate-800 border border-geo-border'
            }`}
          >
            <Droplets className="w-4 h-4 mb-1 text-cyan-300" />
            <span>Water Loss</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <a
              key={item.id}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(item.id);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              } ${item.highlight && !isActive ? 'border border-emerald-500/30 text-emerald-300' : ''}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : item.badge === 'Live'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {/* Footer / Mini Project Tag */}
      <div className="p-4 border-t border-geo-border bg-geo-card/30">
        <div className="rounded-lg bg-geo-card p-3 border border-geo-border">
          <p className="text-xs font-bold text-slate-200">B.Tech CSE Project</p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
            Sentinel-2 Data • Multi-Temporal Decadal • Scientific PDF
          </p>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-emerald-400 font-mono">
            <span>NDVI • NDWI • ΔI Differencing</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
