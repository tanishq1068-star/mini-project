import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Layers,
  Trash2,
  Eye,
  ArrowRightLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Sparkles,
  Trees,
  Droplets,
  Cloud,
  FileText
} from 'lucide-react';

import {
  fetchHistory,
  saveAnalysisHistory,
  loadAnalysisHistory,
  deleteAnalysisHistory,
  compareAnalysisHistory
} from '../services/api';
import MetricCard from '../components/MetricCard';

export default function AnalysisHistory({ currentSession, onSessionUpdated, setActiveTab }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [notes, setNotes] = useState('');

  // Compare Modal State
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareId1, setCompareId1] = useState('');
  const [compareId2, setCompareId2] = useState('');
  const [compareResult, setCompareResult] = useState(null);

  const loadHistoryRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchHistory();
      setRecords(res.records || res.history || []);
    } catch (err) {
      setError(err.message || 'Failed to load analysis history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryRecords();
  }, []);

  const handleSaveCurrentSession = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await saveAnalysisHistory(customName || undefined, notes || undefined);
      setSuccessMsg('Active analysis session saved to persistent history!');
      setTimeout(() => setSuccessMsg(null), 4000);
      setShowSaveModal(false);
      setCustomName('');
      setNotes('');
      await loadHistoryRecords();
    } catch (err) {
      setError(err.message || 'Failed to save analysis session.');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenSession = async (recordId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await loadAnalysisHistory(recordId);
      if (res.session && onSessionUpdated) {
        onSessionUpdated(res.session);
        setSuccessMsg(`Restored historical session #${recordId}`);
        setTimeout(() => setSuccessMsg(null), 3000);
        if (setActiveTab) setActiveTab('dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to load session.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm(`Delete historical analysis record ${recordId}?`)) return;
    try {
      setLoading(true);
      await deleteAnalysisHistory(recordId);
      setSuccessMsg(`Record ${recordId} deleted.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadHistoryRecords();
    } catch (err) {
      setError(err.message || 'Failed to delete record.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    if (!compareId1 || !compareId2) {
      setError('Please select two distinct historical analysis sessions to compare.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await compareAnalysisHistory(compareId1, compareId2);
      setCompareResult(res.comparison);
    } catch (err) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-geo-card border border-geo-border p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5">
              <History className="w-3 h-3" />
              Audit & Session Archive
            </span>
            <span className="text-xs text-slate-400">Persistent SQLite & JSON Store</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Analysis Session History & Comparison
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Audit previous multi-temporal analysis sessions, restore past environmental assessments
            into active memory, and compare historical deforestation and hydrological trajectories side-by-side.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-geo-darker hover:bg-slate-800 text-slate-200 border border-geo-border font-semibold text-xs transition-all"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>Save Current Session</span>
          </button>

          <button
            onClick={() => {
              setShowCompareModal(true);
              if (records.length >= 2) {
                setCompareId1(records[0].id);
                setCompareId2(records[1].id);
              }
            }}
            disabled={records.length < 2}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-lg disabled:opacity-50"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Compare Sessions</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold">✕</button>
        </div>
      )}

      {/* Historical Sessions Table */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-geo-border pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Saved Analysis Records ({records.length})
            </h3>
          </div>
          <button
            onClick={loadHistoryRecords}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No historical records saved yet. Run an analysis and click "Save Current Session" to archive.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-geo-darker/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Session & Region</th>
                  <th className="p-3">Observation Dates</th>
                  <th className="p-3 text-right">Forest Loss</th>
                  <th className="p-3 text-right">Water Loss</th>
                  <th className="p-3 text-center">Change %</th>
                  <th className="p-3 text-center">Hotspots</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-white block">{rec.name || rec.region_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        ID: {rec.id} • {new Date(rec.timestamp).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {rec.date_earlier} → {rec.date_later}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-rose-400">
                      {rec.forest_loss_ha ? `-${rec.forest_loss_ha} ha` : '0 ha'}
                      {rec.forest_loss_pct ? ` (-${rec.forest_loss_pct}%)` : ''}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-cyan-400">
                      {rec.water_loss_ha ? `-${rec.water_loss_ha} ha` : '0 ha'}
                    </td>
                    <td className="p-3 text-center font-mono text-amber-400 font-bold">
                      {rec.change_pct || 0}%
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                        {rec.hotspots_count || 0}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleReopenSession(rec.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/30 text-xs font-semibold"
                        title="Restore session into active dashboard"
                      >
                        Reopen
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Session Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveCurrentSession}
            className="w-full max-w-md bg-geo-card border border-geo-border rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-geo-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Save className="w-4 h-4 text-emerald-400" />
                Save Active Analysis Session
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold block">Session Name / Label</label>
              <input
                type="text"
                placeholder={`e.g. ${currentSession?.region_name || 'Western Ghats'} Pre-Viva Run`}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold block">Notes & Annotations</label>
              <textarea
                rows={3}
                placeholder="Observed illegal canopy clearings and receding water line..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white resize-none"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-geo-card border border-geo-border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-geo-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                Compare Historical Analysis Sessions
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCompareModal(false);
                  setCompareResult(null);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Session A (Baseline)</label>
                <select
                  value={compareId1}
                  onChange={(e) => setCompareId1(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || r.id} ({r.date_earlier} to {r.date_later})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Session B (Comparison)</label>
                <select
                  value={compareId2}
                  onChange={(e) => setCompareId2(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || r.id} ({r.date_earlier} to {r.date_later})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleRunComparison}
                disabled={loading || compareId1 === compareId2}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg disabled:opacity-50"
              >
                Execute Comparison
              </button>
            </div>

            {compareResult && (
              <div className="p-4 rounded-xl bg-geo-darker/70 border border-cyan-500/30 space-y-3 text-xs pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Comparative Trajectory Result
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold font-mono">
                    {compareResult.change_trajectory}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-geo-card border border-geo-border">
                    <span className="text-slate-400 block text-[10px]">Δ Forest Loss Shift</span>
                    <span className="text-lg font-black font-mono text-rose-400">
                      {compareResult.delta_forest_loss_ha > 0 ? '+' : ''}
                      {compareResult.delta_forest_loss_ha} ha
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-geo-card border border-geo-border">
                    <span className="text-slate-400 block text-[10px]">Δ Water Loss Shift</span>
                    <span className="text-lg font-black font-mono text-cyan-400">
                      {compareResult.delta_water_loss_ha > 0 ? '+' : ''}
                      {compareResult.delta_water_loss_ha} ha
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
