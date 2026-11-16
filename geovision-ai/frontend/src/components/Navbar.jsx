import React from 'react';
import { Calendar, Globe2, Cpu, Download, RefreshCw, AlertTriangle } from 'lucide-react';

export default function Navbar({
  currentSession,
  onRefreshAnalysis,
  onDownloadReport,
  loadingAction,
  activeTabTitle
}) {
  const region = currentSession?.region_name || 'Monitoring Zone';
  const date1 = currentSession?.date_earlier || 'Date 1';
  const date2 = currentSession?.date_later || 'Date 2';
  const sensor = currentSession?.sensor || 'Sentinel-2 MSI';
  const isDemo = currentSession?.is_demonstration_data;

  return (
    <header className="h-16 px-6 bg-geo-dark/80 backdrop-blur-md border-b border-geo-border flex items-center justify-between sticky top-0 z-40">
      {/* Left: Current Section & Location */}
      <div className="flex items-center space-x-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            {activeTabTitle}
          </h2>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
            <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-300">{region}</span>
          </div>
        </div>

        {isDemo && (
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            Demonstration Data
          </span>
        )}
      </div>

      {/* Right: Meta Badges & Actions */}
      <div className="flex items-center space-x-3">
        {/* Date Range Badge */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-geo-card border border-geo-border text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>{date1}</span>
          <span className="text-slate-500">→</span>
          <span className="text-white font-semibold">{date2}</span>
        </div>

        {/* Sensor Badge */}
        <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-geo-card border border-geo-border text-xs text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>{sensor}</span>
        </div>

        {/* Re-Analyze Button */}
        <button
          onClick={onRefreshAnalysis}
          disabled={loadingAction}
          className="px-3 py-1.5 rounded-lg bg-geo-card hover:bg-slate-800 border border-geo-border text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition-all disabled:opacity-50"
          title="Re-run environmental detection pipeline"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loadingAction ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Re-Analyze</span>
        </button>

        {/* Quick Export Report Button */}
        <button
          onClick={onDownloadReport}
          disabled={loadingAction}
          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/40 flex items-center space-x-1.5 transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export PDF Report</span>
        </button>
      </div>
    </header>
  );
}
