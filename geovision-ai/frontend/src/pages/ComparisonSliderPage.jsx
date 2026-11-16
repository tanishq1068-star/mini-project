import React, { useState } from 'react';
import {
  MoveHorizontal,
  MoveVertical,
  Upload,
  Calendar,
  Globe2,
  Sparkles,
  Layers,
  ZoomIn,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileImage,
  RefreshCw
} from 'lucide-react';

import ImageSlider from '../components/ImageSlider';
import { uploadCustomImages } from '../services/api';

export default function ComparisonSliderPage({
  currentSession,
  onSessionUpdated,
  onLoadSample,
  loadingSample
}) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileEarlier, setFileEarlier] = useState(null);
  const [fileLater, setFileLater] = useState(null);
  const [dateEarlier, setDateEarlier] = useState('2022-01-15');
  const [dateLater, setDateLater] = useState('2024-05-20');
  const [regionName, setRegionName] = useState(currentSession?.region_name || 'Monitoring Sector');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const deforest = currentSession?.deforestation || {};
  const water = currentSession?.water || {};
  const change = currentSession?.change_detection || {};
  const stats = change.statistics || {};

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!fileEarlier || !fileLater) {
      setUploadError('Please select both earlier and later satellite images.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('earlier_image', fileEarlier);
      formData.append('later_image', fileLater);
      formData.append('date_earlier', dateEarlier);
      formData.append('date_later', dateLater);
      formData.append('region_name', regionName);

      const res = await uploadCustomImages(formData);
      onSessionUpdated(res);
      setShowUploadModal(false);
    } catch (err) {
      setUploadError(err.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Interactive Slider Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Dual-Layer Spatial Synchronization • Dynamic Zoom & Pan
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <MoveHorizontal className="w-6 h-6 text-cyan-400" />
            Before & After Satellite Comparison Slider
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Interactive dual-temporal comparison with sub-pixel locked panning, deep zoom, and horizontal/vertical split modes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowUploadModal(!showUploadModal)}
            className="px-3.5 py-2 rounded-xl bg-geo-card hover:bg-slate-800 border border-geo-border text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition-all"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Upload New Images</span>
          </button>

          <div className="flex items-center space-x-1.5 bg-geo-card p-1 rounded-xl border border-geo-border">
            <button
              onClick={() => onLoadSample('forest')}
              disabled={loadingSample}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentSession?.scenario === 'forest' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Forest Demo
            </button>
            <button
              onClick={() => onLoadSample('water')}
              disabled={loadingSample}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentSession?.scenario === 'water' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Water Demo
            </button>
          </div>
        </div>
      </div>

      {/* Upload Dropdown Modal / Form */}
      {showUploadModal && (
        <div className="rounded-2xl border border-emerald-500/40 bg-geo-card p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-geo-border">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              Upload Custom Satellite Imagery Pair
            </h3>
            <button
              onClick={() => setShowUploadModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          {uploadError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Region / Location</label>
                <input
                  type="text"
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-geo-dark border border-geo-border text-white"
                  placeholder="e.g. Amazon Basin Corridor"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Earlier Date (T1)</label>
                <input
                  type="date"
                  value={dateEarlier}
                  onChange={(e) => setDateEarlier(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-geo-dark border border-geo-border text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Later Date (T2)</label>
                <input
                  type="date"
                  value={dateLater}
                  onChange={(e) => setDateLater(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-geo-dark border border-geo-border text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">Earlier Satellite Image (T1)</label>
                <input
                  type="file"
                  onChange={(e) => setFileEarlier(e.target.files[0])}
                  accept=".png,.jpg,.jpeg,.tif,.tiff,.geotiff"
                  className="text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-cyan-400 mb-1">Later Satellite Image (T2)</label>
                <input
                  type="file"
                  onChange={(e) => setFileLater(e.target.files[0])}
                  accept=".png,.jpg,.jpeg,.tif,.tiff,.geotiff"
                  className="text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUploading}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Upload & Update Comparison</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Interactive Comparison Slider Component */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-2xl">
        <ImageSlider
          beforeImage={currentSession?.earlier_image}
          afterImage={currentSession?.later_image}
          beforeLabel="Before"
          afterLabel="After"
          beforeDate={currentSession?.date_earlier}
          afterDate={currentSession?.date_later}
          regionName={currentSession?.region_name}
          initialOrientation="horizontal"
          allowOrientationToggle={true}
          showControls={true}
          className="h-[580px] w-full"
        />
      </div>

      {/* Comparison Telemetry & Quantitative Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-geo-border bg-geo-card p-4 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Analyzed Area</p>
          <p className="text-xl font-bold text-white font-mono">{deforest.total_area_ha || 2621.44} ha</p>
          <p className="text-xs text-slate-400">Spatial Extent</p>
        </div>

        <div className="rounded-xl border border-geo-border bg-geo-card p-4 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400">Vegetation Loss</p>
          <p className="text-xl font-bold text-rose-400 font-mono">{deforest.total_vegetation_loss_ha || 0} ha</p>
          <p className="text-xs text-rose-300">-{deforest.loss_percentage_of_initial || 0}% Canopy Loss</p>
        </div>

        <div className="rounded-xl border border-geo-border bg-geo-card p-4 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400">Water Body Change</p>
          <p className="text-xl font-bold text-cyan-400 font-mono">{water.net_water_change_ha >= 0 ? '+' : ''}{water.net_water_change_ha || 0} ha</p>
          <p className="text-xs text-cyan-300">{water.percentage_water_change >= 0 ? '+' : ''}{water.percentage_water_change || 0}% Net Shift</p>
        </div>

        <div className="rounded-xl border border-geo-border bg-geo-card p-4 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400">Surface Stability</p>
          <p className="text-xl font-bold text-emerald-400 font-mono">{stats.stability_percentage || 85}%</p>
          <p className="text-xs text-slate-400">{stats.total_stable_ha || 0} ha Unchanged</p>
        </div>
      </div>
    </div>
  );
}
