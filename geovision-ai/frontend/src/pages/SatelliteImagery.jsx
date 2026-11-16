import React, { useState } from 'react';
import {
  Upload,
  FileImage,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { uploadCustomImages } from '../services/api';

export default function SatelliteImagery({
  currentSession,
  onSessionUpdated,
  onLoadSample,
  loadingSample,
  setActiveTab
}) {
  const [fileEarlier, setFileEarlier] = useState(null);
  const [fileLater, setFileLater] = useState(null);
  const [previewEarlier, setPreviewEarlier] = useState(null);
  const [previewLater, setPreviewLater] = useState(null);
  const [dateEarlier, setDateEarlier] = useState('2022-01-15');
  const [dateLater, setDateLater] = useState('2024-05-20');
  const [regionName, setRegionName] = useState('Central Eco-Corridor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const handleEarlierChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileEarlier(file);
      setPreviewEarlier(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleLaterChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileLater(file);
      setPreviewLater(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!fileEarlier || !fileLater) {
      setUploadError('Please select both earlier and later satellite images.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadError(null);
      setUploadSuccess(null);

      const formData = new FormData();
      formData.append('earlier_image', fileEarlier);
      formData.append('later_image', fileLater);
      formData.append('date_earlier', dateEarlier);
      formData.append('date_later', dateLater);
      formData.append('region_name', regionName);

      const res = await uploadCustomImages(formData);
      setUploadSuccess('Satellite images uploaded and analyzed successfully!');
      onSessionUpdated(res);
    } catch (err) {
      setUploadError(err.message || 'Error processing satellite images.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            Satellite Imagery Management & Ingestion
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload multi-temporal satellite imagery (GeoTIFF, TIFF, PNG, JPEG) or explore pre-calibrated Sentinel-2 scenarios.
          </p>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex items-center space-x-2 bg-geo-card p-1.5 rounded-xl border border-geo-border">
          <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Load Sample:
          </span>
          <button
            onClick={() => onLoadSample('forest')}
            disabled={loadingSample}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all disabled:opacity-50"
          >
            Forest Cover
          </button>
          <button
            onClick={() => onLoadSample('water')}
            disabled={loadingSample}
            className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all disabled:opacity-50"
          >
            Water Bodies
          </button>
        </div>
      </div>

      {/* Shortcut to Satellite Data Explorer */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white">Search Real Sentinel-2 Satellite Scenes by Location</h4>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Query the Copernicus archive by interactive map coordinates, date ranges, and cloud cover bounds.
            </p>
          </div>
        </div>
        {setActiveTab && (
          <button
            onClick={() => setActiveTab('satellite-explorer')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 flex items-center space-x-1.5 transition-all self-start sm:self-auto"
          >
            <span>Open Satellite Data Explorer</span>
            <Compass className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>

      {/* Active Observation Images Side-by-Side */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              Active Observations (Side-by-Side Analysis)
            </h3>
            <p className="text-xs text-slate-400">
              Synchronized multi-temporal satellite footprints currently loaded into memory
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
            {currentSession?.sensor || 'Sentinel-2 Multispectral'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Earlier Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Date 1 (Earlier): {currentSession?.date_earlier}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {currentSession?.image_info?.earlier?.dimensions || '512 x 512 px'}
              </span>
            </div>
            <div className="relative aspect-square rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner">
              <img
                src={currentSession?.earlier_image}
                alt="Earlier Satellite Observation"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                T1: {currentSession?.image_info?.earlier?.filename || 'earlier_capture.tif'}
              </div>
            </div>
          </div>

          {/* Later Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Date 2 (Later): {currentSession?.date_later}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {currentSession?.image_info?.later?.dimensions || '512 x 512 px'}
              </span>
            </div>
            <div className="relative aspect-square rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner">
              <img
                src={currentSession?.later_image}
                alt="Later Satellite Observation"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded text-[11px] font-semibold text-cyan-400 border border-cyan-500/30">
                T2: {currentSession?.image_info?.later?.filename || 'later_capture.tif'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload New Custom Satellite Images Form */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Upload className="w-5 h-5 text-emerald-400" />
          Upload New Satellite Imagery Pair
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Provide two observations of the same geographical bounding box. Supports GeoTIFF, multi-spectral TIFF (with NIR), PNG, or high-res JPG.
        </p>

        {uploadError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-6">
          {/* Metadata Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Geographical Region / Study Area Name
              </label>
              <input
                type="text"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-geo-dark border border-geo-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="e.g., Western Ghats Reserve"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Earlier Observation Date (T1)
              </label>
              <input
                type="date"
                value={dateEarlier}
                onChange={(e) => setDateEarlier(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-geo-dark border border-geo-border text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Later Observation Date (T2)
              </label>
              <input
                type="date"
                value={dateLater}
                onChange={(e) => setDateLater(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-geo-dark border border-geo-border text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Upload Dropzones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earlier Image Dropzone */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400">
                Earlier Satellite Image (T1)
              </span>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-geo-border hover:border-emerald-500/50 rounded-xl p-6 bg-geo-dark/50 cursor-pointer transition-all">
                {previewEarlier ? (
                  <div className="text-center space-y-2">
                    <img src={previewEarlier} alt="T1 Preview" className="h-28 rounded object-cover mx-auto" />
                    <p className="text-xs text-emerald-300 font-semibold">{fileEarlier?.name}</p>
                    <p className="text-[11px] text-slate-500">Click to change file</p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto w-fit">
                      <FileImage className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">
                      Click to upload Earlier Image
                    </p>
                    <p className="text-[11px] text-slate-500">
                      PNG, JPG, TIFF, GeoTIFF up to 50MB
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  onChange={handleEarlierChange}
                  accept=".png,.jpg,.jpeg,.tif,.tiff,.geotiff"
                  className="hidden"
                />
              </label>
            </div>

            {/* Later Image Dropzone */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-cyan-400">
                Later Satellite Image (T2)
              </span>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-geo-border hover:border-cyan-500/50 rounded-xl p-6 bg-geo-dark/50 cursor-pointer transition-all">
                {previewLater ? (
                  <div className="text-center space-y-2">
                    <img src={previewLater} alt="T2 Preview" className="h-28 rounded object-cover mx-auto" />
                    <p className="text-xs text-cyan-300 font-semibold">{fileLater?.name}</p>
                    <p className="text-[11px] text-slate-500">Click to change file</p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 mx-auto w-fit">
                      <FileImage className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">
                      Click to upload Later Image
                    </p>
                    <p className="text-[11px] text-slate-500">
                      PNG, JPG, TIFF, GeoTIFF up to 50MB
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  onChange={handleLaterChange}
                  accept=".png,.jpg,.jpeg,.tif,.tiff,.geotiff"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !fileEarlier || !fileLater}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing & Ingesting Satellite Data...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload & Run Multi-Temporal Analysis</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
