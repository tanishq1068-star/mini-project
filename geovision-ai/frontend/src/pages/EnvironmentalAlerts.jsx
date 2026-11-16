import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Bell,
  CheckCircle,
  Clock,
  MapPin,
  Settings,
  Sliders,
  Filter,
  Check,
  RotateCcw,
  ExternalLink,
  Info,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

import {
  fetchAlerts,
  acknowledgeAlert,
  updateAlertThresholds
} from '../services/api';
import MetricCard from '../components/MetricCard';

export default function EnvironmentalAlerts({ currentSession }) {
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & State
  const [statusFilter, setStatusFilter] = useState('all'); // all, Active, Acknowledged, Resolved
  const [severityFilter, setSeverityFilter] = useState('all'); // all, CRITICAL, WARNING

  // Modal / Acknowledge State
  const [selectedAlertForAction, setSelectedAlertForAction] = useState(null);
  const [analystName, setAnalystName] = useState('GIS Analyst');
  const [analystNotes, setAnalystNotes] = useState('');
  const [actionStatus, setActionStatus] = useState('Acknowledged');

  // Configurable Thresholds State
  const [showConfig, setShowConfig] = useState(false);
  const [thresholds, setThresholds] = useState({
    forest_loss_warning_pct: 5.0,
    forest_loss_critical_pct: 12.0,
    forest_loss_critical_ha: 150.0,
    water_loss_warning_pct: 8.0,
    water_loss_critical_pct: 18.0,
    water_loss_critical_ha: 80.0
  });

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAlerts();
      setAlertData(res);
      if (res.thresholds) {
        setThresholds(res.thresholds);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch environmental alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedAlertForAction) return;

    try {
      setLoading(true);
      await acknowledgeAlert({
        alert_id: selectedAlertForAction.id,
        status: actionStatus,
        user_name: analystName,
        notes: analystNotes || undefined
      });

      setSuccessMsg(`Alert ${selectedAlertForAction.id} updated to "${actionStatus}"`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setSelectedAlertForAction(null);
      setAnalystNotes('');
      await loadAlerts();
    } catch (err) {
      setError(err.message || 'Failed to update alert.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await updateAlertThresholds(thresholds);
      setSuccessMsg('Alert trigger thresholds updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      setShowConfig(false);
      await loadAlerts();
    } catch (err) {
      setError(err.message || 'Failed to save thresholds.');
    } finally {
      setLoading(false);
    }
  };

  const allAlerts = alertData?.alerts || [];
  const filteredAlerts = allAlerts.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const summary = alertData?.summary || {
    total_alerts: allAlerts.length,
    active_alerts: allAlerts.filter((a) => a.status === 'Active').length,
    critical_count: allAlerts.filter((a) => a.severity === 'CRITICAL').length,
    acknowledged_alerts: allAlerts.filter((a) => a.status === 'Acknowledged').length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-geo-card border border-geo-border p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" />
              Real-Time Alert Dispatcher
            </span>
            <span className="text-xs text-slate-400">Autonomous Sentinel Trigger</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Environmental Monitoring Alert System
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Continuously monitors bi-temporal satellite analyses against configurable environmental thresholds.
            Identifies rapid canopy clearance and reservoir shrinkage, categorizes incident severity,
            and logs verification status.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-geo-darker hover:bg-slate-800 text-slate-300 hover:text-white border border-geo-border font-semibold text-xs transition-all"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Configure Triggers</span>
          </button>

          <button
            onClick={loadAlerts}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Thresholds Configuration Drawer */}
      {showConfig && (
        <form
          onSubmit={handleSaveThresholds}
          className="bg-geo-darker/90 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-geo-border">
            <div className="flex items-center space-x-2 text-sm font-bold text-white">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Configurable Trigger Thresholds</span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Forest Loss Warning % */}
            <div className="p-3 rounded-xl bg-geo-card border border-geo-border space-y-2">
              <label className="text-slate-300 font-semibold block">
                Forest Loss Warning Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={thresholds.forest_loss_warning_pct}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    forest_loss_warning_pct: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">Triggers WARNING alert status</span>
            </div>

            {/* Forest Loss Critical % */}
            <div className="p-3 rounded-xl bg-geo-card border border-geo-border space-y-2">
              <label className="text-slate-300 font-semibold block">
                Forest Loss Critical Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                value={thresholds.forest_loss_critical_pct}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    forest_loss_critical_pct: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">Triggers CRITICAL severity alert</span>
            </div>

            {/* Forest Loss Critical Area ha */}
            <div className="p-3 rounded-xl bg-geo-card border border-geo-border space-y-2">
              <label className="text-slate-300 font-semibold block">
                Forest Loss Critical Area (ha)
              </label>
              <input
                type="number"
                step="10"
                min="10"
                max="5000"
                value={thresholds.forest_loss_critical_ha}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    forest_loss_critical_ha: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">Absolute canopy loss trigger</span>
            </div>

            {/* Water Loss Warning % */}
            <div className="p-3 rounded-xl bg-geo-card border border-geo-border space-y-2">
              <label className="text-slate-300 font-semibold block">
                Water Loss Warning Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={thresholds.water_loss_warning_pct}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    water_loss_warning_pct: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">Triggers hydrological WATCH alert</span>
            </div>

            {/* Water Loss Critical % */}
            <div className="p-3 rounded-xl bg-geo-card border border-geo-border space-y-2">
              <label className="text-slate-300 font-semibold block">
                Water Loss Critical Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                value={thresholds.water_loss_critical_pct}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    water_loss_critical_pct: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">Severe desiccation threshold</span>
            </div>

            {/* Water Loss Critical Area ha */}
            <div className="p-3 rounded-xl bg-geo-card border border-geo-border space-y-2">
              <label className="text-slate-300 font-semibold block">
                Water Loss Critical Area (ha)
              </label>
              <input
                type="number"
                step="10"
                min="10"
                max="5000"
                value={thresholds.water_loss_critical_ha}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    water_loss_critical_ha: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">Absolute water shrinkage trigger</span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30"
            >
              Save Alert Thresholds
            </button>
          </div>
        </form>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Alerts"
          value={summary.active_alerts}
          subtitle="Awaiting analyst review"
          icon={AlertTriangle}
          accentColor="rose"
        />
        <MetricCard
          title="Critical Severity"
          value={summary.critical_count}
          subtitle="Severe canopy / water depletion"
          icon={ShieldAlert}
          accentColor="rose"
        />
        <MetricCard
          title="Acknowledged Events"
          value={summary.acknowledged_alerts}
          subtitle="Under active investigation"
          icon={Clock}
          accentColor="amber"
        />
        <MetricCard
          title="Total Incidents"
          value={summary.total_alerts}
          subtitle="Logged multi-temporal alerts"
          icon={Bell}
          accentColor="emerald"
        />
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-geo-card p-4 rounded-xl border border-geo-border">
        {/* Status Filters */}
        <div className="flex items-center space-x-1 bg-geo-darker p-1 rounded-xl border border-geo-border text-xs">
          {['all', 'Active', 'Acknowledged', 'Resolved'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                statusFilter === s
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'All Incidents' : s}
            </button>
          ))}
        </div>

        {/* Severity Filters */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Severity:</span>
          {['all', 'CRITICAL', 'WARNING'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                severityFilter === sev
                  ? 'bg-slate-700 text-white border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-geo-card border border-geo-border space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">No Matching Alerts</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No environmental incidents match your active filters. Re-run an analysis session to test alert dispatching.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isVerified = alert.verification.toLowerCase().includes('verified');

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border bg-geo-card shadow-xl transition-all space-y-4 ${
                  isCritical
                    ? 'border-rose-500/30 hover:border-rose-500/60'
                    : 'border-amber-500/30 hover:border-amber-500/60'
                }`}
              >
                {/* Alert Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider font-mono ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {alert.severity}
                    </span>

                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      {alert.event_type}
                    </span>

                    <span className="text-xs text-slate-500 font-mono">
                      #{alert.id}
                    </span>
                  </div>

                  {/* Verification Status Badge */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 ${
                        isVerified
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isVerified ? 'bg-blue-400' : 'bg-amber-400'
                        }`}
                      ></span>
                      {alert.verification}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        alert.status === 'Active'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : alert.status === 'Acknowledged'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="text-xs text-slate-200 font-medium leading-relaxed bg-geo-darker/50 p-3.5 rounded-xl border border-geo-border">
                  {alert.message}
                </div>

                {/* Region & Quantitative Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Geographic Region
                      </span>
                      <span className="font-semibold">{alert.region_name}</span>
                      {alert.coordinates && (
                        <span className="text-[10px] text-slate-500 block font-mono">
                          [{alert.coordinates[0].toFixed(4)}°N, {alert.coordinates[1].toFixed(4)}°E]
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Detected Timestamp
                      </span>
                      <span className="font-mono">{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Triggered Condition
                      </span>
                      <span className="text-rose-300 font-mono text-[11px]">
                        {alert.metrics?.threshold_exceeded || 'Calculated Change Breach'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acknowledgment & Actions */}
                <div className="pt-3 border-t border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-400 text-[11px]">
                    {alert.acknowledged_by ? (
                      <span>
                        Assigned: <strong className="text-white">{alert.acknowledged_by}</strong>
                        {alert.acknowledged_at && (
                          <span className="text-slate-500 ml-1">
                            ({new Date(alert.acknowledged_at).toLocaleDateString()})
                          </span>
                        )}
                        {alert.notes && (
                          <span className="block text-slate-300 italic mt-0.5">
                            "{alert.notes}"
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-400/90 font-medium">
                        Pending analyst triage and field verification.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {alert.status === 'Active' && (
                      <button
                        onClick={() => {
                          setSelectedAlertForAction(alert);
                          setActionStatus('Acknowledged');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-semibold transition-all"
                      >
                        Acknowledge Alert
                      </button>
                    )}

                    {alert.status !== 'Resolved' && (
                      <button
                        onClick={() => {
                          setSelectedAlertForAction(alert);
                          setActionStatus('Resolved');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md"
                      >
                        Resolve Alert
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Acknowledge / Resolve Modal */}
      {selectedAlertForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleUpdateStatus}
            className="w-full max-w-md bg-geo-card border border-geo-border rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-geo-border">
              <h3 className="text-base font-bold text-white">
                {actionStatus === 'Resolved' ? 'Resolve Environmental Alert' : 'Acknowledge Alert'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAlertForAction(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Updating incident <span className="font-mono text-emerald-400 font-bold">#{selectedAlertForAction.id}</span> ({selectedAlertForAction.event_type}) in {selectedAlertForAction.region_name}.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold block">
                Analyst / Officer Name
              </label>
              <input
                type="text"
                required
                value={analystName}
                onChange={(e) => setAnalystName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold block">
                Investigation Notes & Field Verification Details
              </label>
              <textarea
                rows={3}
                value={analystNotes}
                onChange={(e) => setAnalystNotes(e.target.value)}
                placeholder="e.g. Ground station confirmed seasonal timber extraction or drought condition..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs resize-none"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setSelectedAlertForAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg"
              >
                Confirm Update
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
