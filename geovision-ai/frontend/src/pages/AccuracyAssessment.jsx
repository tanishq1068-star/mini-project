import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Sparkles,
  RefreshCw,
  Award,
  Layers,
  FileCheck,
  BarChart3,
  HelpCircle
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

import { evaluateAccuracy, uploadCustomValidationPoints } from '../services/api';
import MetricCard from '../components/MetricCard';

export default function AccuracyAssessment({ currentSession }) {
  const [accuracyData, setAccuracyData] = useState(null);
  const [samplePointsPerClass, setSamplePointsPerClass] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchAccuracy = async (nPoints = 50) => {
    try {
      setLoading(true);
      setError(null);
      const res = await evaluateAccuracy({ sample_points_per_class: parseInt(nPoints) });
      setAccuracyData(res);
    } catch (err) {
      setError(err.message || 'Failed to compute accuracy metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccuracy(samplePointsPerClass);
  }, []);

  const handleCustomCsvSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Parse CSV lines: format "x, y, predicted_class, reference_class" or "reference_class, predicted_class"
      const lines = csvText.trim().split('\n');
      const points = [];
      lines.forEach((line, idx) => {
        const parts = line.split(',').map((s) => s.trim());
        if (parts.length >= 2 && !isNaN(parseInt(parts[0]))) {
          points.push({
            id: idx + 1,
            reference_class: parseInt(parts[0]),
            predicted_class: parseInt(parts[1]),
            x: parts[2] ? parseInt(parts[2]) : idx * 5,
            y: parts[3] ? parseInt(parts[3]) : idx * 5
          });
        }
      });

      if (points.length < 5) {
        throw new Error('Please provide at least 5 valid comma-separated rows (e.g. "reference_class, predicted_class").');
      }

      const res = await uploadCustomValidationPoints(points);
      setAccuracyData(res);
      setShowUploadModal(false);
    } catch (err) {
      setError(err.message || 'Error parsing custom validation dataset.');
    } finally {
      setLoading(false);
    }
  };

  // Recharts accuracy comparison data
  const classAccuracyChartData = accuracyData?.per_class_metrics?.map((m) => ({
    name: m.name,
    'Producer Accuracy (Recall)': m.producers_accuracy,
    'User Accuracy (Precision)': m.users_accuracy,
    'F1 Score': m.f1_score
  })) || [];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Remote Sensing Validation
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Error Matrix • Overall Accuracy • Producer & User Precision • Cohen's Kappa
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Classification Accuracy Assessment
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Rigorous statistical validation cross-referencing classified Sentinel-2 pixels against stratified ground-truth reference samples.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowUploadModal(!showUploadModal)}
            className="px-3.5 py-2 rounded-xl bg-geo-card hover:bg-slate-800 border border-geo-border text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition-all"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Upload Reference CSV</span>
          </button>

          <button
            onClick={() => fetchAccuracy(samplePointsPerClass)}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Resample (N={samplePointsPerClass})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Upload Custom Reference Modal */}
      {showUploadModal && (
        <div className="rounded-2xl border border-cyan-500/40 bg-geo-card p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-geo-border">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Upload Independent Ground-Truth Validation Reference
            </h3>
            <button onClick={() => setShowUploadModal(false)} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Paste comma-separated ground truth points with format: <code>reference_class_id, predicted_class_id</code> (Class IDs: 1=Forest, 2=Water, 3=Vegetation, 4=Urban, 5=Barren).
          </p>
          <form onSubmit={handleCustomCsvSubmit} className="space-y-3">
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="1, 1&#10;1, 1&#10;2, 2&#10;3, 3&#10;4, 4&#10;5, 5&#10;1, 3&#10;4, 5"
              className="w-full p-3 rounded-lg bg-geo-dark border border-geo-border text-xs text-white font-mono"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                Compute Verification Matrix
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards Row */}
      {accuracyData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Overall Accuracy (OA)"
            value={`${accuracyData.overall_accuracy}%`}
            subtitle={`${accuracyData.correct_samples} of ${accuracyData.total_validation_samples} samples correct`}
            icon={Award}
            accentColor="emerald"
          />

          <MetricCard
            title="Cohen's Kappa (κ)"
            value={accuracyData.cohens_kappa}
            subtitle={accuracyData.cohens_kappa >= 0.8 ? 'Strong Substantial Agreement' : 'Moderate Agreement'}
            icon={ShieldCheck}
            accentColor="cyan"
          />

          <MetricCard
            title="Validation Samples"
            value={accuracyData.total_validation_samples}
            subtitle="Stratified Random Ground Points"
            icon={FileCheck}
            accentColor="blue"
          />

          <MetricCard
            title="Standard Compliance"
            value="USGS / ESA"
            subtitle="Benchmark: OA ≥ 85%, κ ≥ 0.75"
            icon={CheckCircle2}
            accentColor="emerald"
          />
        </div>
      )}

      {/* Confusion Matrix Table Display */}
      {accuracyData?.confusion_matrix && (
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-geo-border gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Error Matrix (Confusion Matrix Cross-Tabulation)
              </h3>
              <p className="text-xs text-slate-400">
                Rows represent Reference Ground Truth; Columns represent GeoVision AI Classified Map. Diagonal cells represent accurate classifications.
              </p>
            </div>

            <div className="text-xs font-mono px-3 py-1 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
              Sample Count: N = {accuracyData.total_validation_samples}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse border border-geo-border">
              <thead>
                <tr className="bg-geo-darker text-slate-300 font-bold border-b border-geo-border">
                  <th className="p-3 text-left">Reference Class (Ground Truth)</th>
                  {accuracyData.class_names.map((c) => (
                    <th key={c} className="p-3">{c} (Pred)</th>
                  ))}
                  <th className="p-3 bg-slate-900 text-slate-200">Total Ref</th>
                  <th className="p-3 bg-emerald-950/60 text-emerald-300 font-bold">Producer's Acc (PA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {accuracyData.confusion_matrix.map((row, rIdx) => (
                  <tr key={row.reference_class} className="hover:bg-slate-800/40">
                    <td className="p-3 text-left font-sans font-semibold text-white flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }}></span>
                      <span>{row.reference_class}</span>
                    </td>
                    {row.predicted_counts.map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      return (
                        <td
                          key={cIdx}
                          className={`p-3 font-bold ${
                            isDiagonal
                              ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/40'
                              : val > 0
                              ? 'text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                    <td className="p-3 bg-slate-900 font-bold text-white">{row.row_total}</td>
                    <td className="p-3 bg-emerald-950/40 text-emerald-400 font-bold">{row.producers_accuracy}%</td>
                  </tr>
                ))}
                {/* Column Totals & User's Accuracy */}
                <tr className="bg-slate-900 font-bold text-slate-200 border-t-2 border-slate-700">
                  <td className="p-3 text-left font-sans">Predicted Column Totals</td>
                  {accuracyData.column_totals.map((tot, idx) => (
                    <td key={idx} className="p-3">{tot}</td>
                  ))}
                  <td className="p-3 bg-slate-950 font-bold text-emerald-400">{accuracyData.total_validation_samples}</td>
                  <td className="p-3 bg-emerald-900 text-white font-bold">{accuracyData.overall_accuracy}% OA</td>
                </tr>
                <tr className="bg-cyan-950/40 font-bold text-cyan-300 border-t border-slate-800">
                  <td className="p-3 text-left font-sans text-cyan-200">User's Accuracy (Precision)</td>
                  {accuracyData.users_accuracy_summary.map((ua, idx) => (
                    <td key={idx} className="p-3">{ua}%</td>
                  ))}
                  <td className="p-3 bg-slate-950">-</td>
                  <td className="p-3 bg-cyan-900 text-cyan-100 font-mono">κ = {accuracyData.cohens_kappa}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-Class Metrics Bar Chart & Scientific Breakdown */}
      {accuracyData?.per_class_metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Per-Class Producer vs User Precision (%)
            </h3>
            <p className="text-xs text-slate-400">
              Producer's Accuracy measures omission errors; User's Accuracy measures commission errors.
            </p>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classAccuracyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f2231', borderColor: '#1a3a52', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar dataKey="Producer Accuracy (Recall)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="User Accuracy (Precision)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="F1 Score" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Validation Error Accounting (Omission vs Commission)</h3>
            <div className="space-y-3 text-xs">
              {accuracyData.per_class_metrics.map((m) => (
                <div key={m.name} className="p-3 rounded-xl bg-geo-dark/70 border border-geo-border space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="flex items-center space-x-2 text-white">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }}></span>
                      <span>{m.name}</span>
                    </span>
                    <span className="font-mono text-purple-400">F1 Score: {m.f1_score}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-black/40 p-2 rounded">
                      <span className="text-slate-400 block">Producer's (PA): {m.producers_accuracy}%</span>
                      <span className="text-rose-400">Omission: {m.omission_error}%</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded">
                      <span className="text-slate-400 block">User's (UA): {m.users_accuracy}%</span>
                      <span className="text-amber-400">Commission: {m.commission_error}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
