import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { runCloudMasking } from '../services/api';
import MetricCard from '../components/MetricCard';

export default function CloudMasking({ currentSession }) {
  const [targetImage, setTargetImage] = useState('later');
  const [cloudThresh, setCloudThresh] = useState(0.38);
  const [shadowThresh, setShadowThresh] = useState(0.12);
  const [loading, setLoading] = useState(false);
  const [cloudData, setCloudData] = useState(null);
  const [error, setError] = useState(null);

  const fetchCloudAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await runCloudMasking({
        target_image: targetImage,
        cloud_threshold: parseFloat(cloudThresh),
        shadow_threshold: parseFloat(shadowThresh)
      });
      setCloudData(res);
    } catch (err) {
      setError(err.message || 'Failed to execute cloud masking analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudAnalysis();
  }, [targetImage]);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
              Sentinel-2 QA Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Scene Classification Layer (SCL) • Radiometric Cloud & Shadow Masking
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Cloud className="w-6 h-6 text-sky-400" />
            Cloud Detection & Quality Masking
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Delineate opaque clouds, thin cirrus, and shadow projections to eliminate radiometric distortion from NDVI & NDWI indices.
          </p>
        </div>

        {/* Observation Target Switcher */}
        <div className="flex items-center space-x-2 bg-geo-card p-1.5 rounded-xl border border-geo-border text-xs">
          <span className="text-slate-400 font-semibold px-2">Analyze Image:</span>
          <button
            onClick={() => setTargetImage('earlier')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              targetImage === 'earlier' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Earlier ({currentSession?.date_earlier || 'T1'})
          </button>
          <button
            onClick={() => setTargetImage('later')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              targetImage === 'later' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Later ({currentSession?.date_later || 'T2'})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold hover:underline">✕</button>
        </div>
      )}

      {/* KPI Cards Row */}
      {cloudData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Cloud Coverage"
            value={`${cloudData.cloud_coverage_percentage}%`}
            subtitle={`${cloudData.area_metrics?.cloud_area_ha} ha masked`}
            icon={Cloud}
            accentColor={cloudData.cloud_coverage_percentage > 10 ? 'amber' : 'emerald'}
          />

          <MetricCard
            title="Cloud Shadow Coverage"
            value={`${cloudData.shadow_coverage_percentage}%`}
            subtitle={`${cloudData.area_metrics?.shadow_area_ha} ha affected`}
            icon={CloudRain}
            accentColor={cloudData.shadow_coverage_percentage > 5 ? 'rose' : 'blue'}
          />

          <MetricCard
            title="Valid Clear Surface"
            value={`${cloudData.clear_surface_percentage}%`}
            subtitle={`${cloudData.area_metrics?.clear_area_ha} ha usable`}
            icon={Sun}
            accentColor="emerald"
          />

          <MetricCard
            title="NDVI Quality Correction"
            value={`${cloudData.spectral_impact?.ndvi_correction_delta >= 0 ? '+' : ''}${cloudData.spectral_impact?.ndvi_correction_delta}`}
            subtitle={`Masked: ${cloudData.spectral_impact?.mean_ndvi_cloud_masked} vs Raw: ${cloudData.spectral_impact?.mean_ndvi_unmasked}`}
            icon={ShieldCheck}
            accentColor="cyan"
          />
        </div>
      )}

      {/* Side-by-Side Visual Inspection Required: Original vs Cloud-Masked */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-geo-border gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-400" />
              Side-by-Side Radiometric & Quality Mask Comparison
            </h3>
            <p className="text-xs text-slate-400">
              Comparing raw optical input alongside the classified cloud mask and the filtered cloud-masked surface.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border border-slate-700 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-white"></span> Opaque Cloud
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border border-slate-700 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-[#93c5fd]"></span> Cirrus / Thin Cloud
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border border-slate-700 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-[#451a03]"></span> Cloud Shadow
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border border-slate-700 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-[#1e293b]"></span> Clear Surface
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-72 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
            <p className="text-xs text-slate-400">Running multi-spectral cloud & shadow classification...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Original Optical Image */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">1. Raw Sentinel-2 Image</span>
                <span className="text-slate-500 font-mono">RGB BOA</span>
              </div>
              <div className="aspect-square rounded-xl overflow-hidden border border-geo-border bg-black shadow-inner relative">
                <img
                  src={cloudData?.images?.original_image}
                  alt="Original"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md text-[11px] font-semibold text-slate-300 border border-slate-700">
                  Unprocessed Scene
                </div>
              </div>
            </div>

            {/* 2. Classified Cloud Mask */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-sky-400">2. Classified Cloud Mask</span>
                <span className="text-sky-300 font-mono">{cloudData?.cloud_coverage_percentage}% Clouds</span>
              </div>
              <div className="aspect-square rounded-xl overflow-hidden border border-sky-500/40 bg-black shadow-inner relative">
                <img
                  src={cloudData?.images?.cloud_mask_image}
                  alt="Cloud Mask"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md text-[11px] font-semibold text-sky-300 border border-sky-500/30">
                  SCL Mask Array
                </div>
              </div>
            </div>

            {/* 3. Cloud-Masked Composite */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-400">3. Filtered Surface Overlay</span>
                <span className="text-emerald-300 font-mono">{cloudData?.clear_surface_percentage}% Clear</span>
              </div>
              <div className="aspect-square rounded-xl overflow-hidden border border-emerald-500/40 bg-black shadow-inner relative">
                <img
                  src={cloudData?.images?.masked_composite_image}
                  alt="Masked Surface"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                  Valid Clean Footprint
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Threshold Controls and Scientific Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Sensitivity Tuning */}
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Detection Threshold Calibration
          </h3>
          <p className="text-xs text-slate-400">
            Tune optical albedo sensitivity to detect opaque clouds or subtle cirrus veil across different atmospheric conditions.
          </p>

          <div className="space-y-4 text-xs pt-2">
            <div>
              <div className="flex justify-between mb-1 text-slate-300 font-semibold">
                <span>Cloud Brightness Threshold</span>
                <span className="font-mono text-emerald-400">{cloudThresh}</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="0.60"
                step="0.01"
                value={cloudThresh}
                onChange={(e) => setCloudThresh(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-300 font-semibold">
                <span>Cloud Shadow Darkening Threshold</span>
                <span className="font-mono text-cyan-400">{shadowThresh}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.25"
                step="0.01"
                value={shadowThresh}
                onChange={(e) => setShadowThresh(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <button
              onClick={fetchCloudAnalysis}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-run Cloud Masking</span>
            </button>
          </div>
        </div>

        {/* Spectral Accuracy Impact */}
        <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Atmospheric Correction & Index Integrity
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unmasked clouds introduce high visible reflectance that severely contaminates NDVI and NDWI computations. Cloud masking eliminates spurious false positive deforestation or phantom water bodies.
          </p>

          {cloudData?.spectral_impact && (
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Mean NDVI (Raw with Clouds)</span>
                <span className="font-mono font-bold text-slate-300">{cloudData.spectral_impact.mean_ndvi_unmasked}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Mean NDVI (Cloud-Masked Clear Surface)</span>
                <span className="font-mono font-bold text-emerald-400">{cloudData.spectral_impact.mean_ndvi_cloud_masked}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Mean NDWI (Raw with Clouds)</span>
                <span className="font-mono font-bold text-slate-300">{cloudData.spectral_impact.mean_ndwi_unmasked}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Mean NDWI (Cloud-Masked Clear Surface)</span>
                <span className="font-mono font-bold text-cyan-400">{cloudData.spectral_impact.mean_ndwi_cloud_masked}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
