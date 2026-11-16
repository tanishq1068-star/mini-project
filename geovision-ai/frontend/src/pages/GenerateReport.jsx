import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Globe2,
  Trees,
  Droplets,
  Layers,
  Sparkles,
  Printer,
  BookOpen,
  RefreshCw,
  Award
} from 'lucide-react';
import { generatePdfReport } from '../services/api';

export default function GenerateReport({ currentSession }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  const deforest = currentSession?.deforestation || {};
  const water = currentSession?.water || {};
  const change = currentSession?.change_detection || {};
  const stats = change.statistics || {};

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      setDownloadError(null);
      setDownloadSuccess(null);

      const res = await generatePdfReport();
      if (res.download_url) {
        const link = document.createElement('a');
        link.href = res.download_url;
        link.download = res.filename || 'GeoVision_Environmental_Report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadSuccess(`Official Report "${res.filename}" compiled and downloaded successfully!`);
      }
    } catch (err) {
      setDownloadError(err.message || 'Failed to generate PDF report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-geo-border pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Feature 3: Automatic Scientific PDF Generator
            </span>
            <span className="text-xs text-slate-400 font-mono">
              12-Section Research Standard • ReportLab Engine
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            Advanced Scientific Assessment Reports
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Generates a publication-quality environmental impact PDF document with running headers, footers, page numbering, and statistical charts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-geo-card hover:bg-slate-800 border border-geo-border text-xs font-semibold text-slate-300 flex items-center space-x-2 transition-all"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print View</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Compiling 12-Section PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Scientific PDF Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {downloadError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* 12-Section Scientific Document Paper Preview */}
      <div className="bg-white text-slate-900 rounded-2xl p-8 sm:p-12 shadow-2xl border border-slate-300 space-y-8 font-['Inter',sans-serif]">
        {/* 1. COVER PAGE / HEADER */}
        <div className="border-b-2 border-emerald-700 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-widest mb-1">
                <Award className="w-4 h-4 text-emerald-700" />
                <span>Section 1: Official Assessment Cover</span>
              </div>
              <h1 className="text-2xl font-black text-emerald-900 tracking-tight">
                GeoVision AI
              </h1>
              <p className="text-sm font-bold text-teal-800 mt-0.5">
                Change Detection of Deforestation and Water Resources Using Multi-Temporal Satellite Images
              </p>
              <p className="text-xs text-slate-600 mt-1">
                B.Tech CSE Project • Automated Remote Sensing & Environmental Impact Assessment
              </p>
            </div>
            <div className="text-right text-xs text-slate-600 font-mono">
              <p className="font-bold text-slate-900">{currentSession?.id || 'GV-2026-001'}</p>
              <p>{currentSession?.sensor || 'Sentinel-2 MSI Level-2A'}</p>
              <p>{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* 2. ABSTRACT */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            2. Abstract
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed italic">
            Automated multi-temporal remote sensing investigation over <strong>{currentSession?.region_name}</strong> between observation dates <strong>{currentSession?.date_earlier}</strong> and <strong>{currentSession?.date_later}</strong>. Utilizing European Space Agency (ESA) Copernicus Sentinel-2 MSI Level-2A surface reflectance data at 10-meter spatial resolution, the GeoVision AI algorithmic engine quantified canopy degradation and surface water dynamics. Through feature-based spatial registration, Normalized Difference Vegetation Index (NDVI), and McFeeters Normalized Difference Water Index (NDWI), the pipeline revealed a net vegetation change of <strong>{deforest.percentage_vegetation_change}%</strong> ({deforest.total_vegetation_loss_ha} ha loss) and water body alteration of <strong>{water.percentage_water_change}%</strong>.
          </p>
        </div>

        {/* 3. STUDY AREA */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            3. Study Area & Geographic Bounds
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            Geographical zone: <strong>{currentSession?.region_name}</strong>. Bounding box coordinates: [
            {currentSession?.bounds ? `${currentSession.bounds[0]}°N, ${currentSession.bounds[1]}°E to ${currentSession.bounds[2]}°N, ${currentSession.bounds[3]}°E` : '12.1500°N, 75.7800°E to 12.3800°N, 76.0500°E'}].
            Total analyzed area: <strong>{deforest.total_area_ha || 2621.44} hectares</strong>.
          </p>
        </div>

        {/* 4. SATELLITE DATA INFORMATION */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            4. Satellite Platform & Sensor Specifications
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100 p-3 rounded-lg text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">Spacecraft</span>
              <span className="font-semibold text-slate-900">Sentinel-2A / 2B</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">Instrument</span>
              <span className="font-semibold text-slate-900">MSI Level-2A BOA</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">Resolution</span>
              <span className="font-semibold text-slate-900">10 meters / pixel</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">Spectral Bands</span>
              <span className="font-semibold text-slate-900">B02, B03, B04, B08, B11</span>
            </div>
          </div>
        </div>

        {/* 5. METHODOLOGY */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            5. Scientific Methodology
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            The workflow applies sub-pixel ORB feature matching and homography warping to eliminate misregistration bias. High-frequency speckle is suppressed using non-linear bilateral filtering. Spectral indices are computed as:
            <br />• <strong>NDVI:</strong> (B08 - B04) / (B08 + B04) for cellular mesophyll canopy backscatter.
            <br />• <strong>NDWI:</strong> (B03 - B08) / (B03 + B08) for open water delineation.
            <br />• <strong>Spectral Differencing:</strong> ΔI = ||I(t2) - I(t1)|| combined with multi-class thresholding.
          </p>
        </div>

        {/* 6. DEFORESTATION ANALYSIS */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            6. Deforestation & Vegetation Health Analysis
          </h2>
          <table className="w-full text-xs text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-emerald-900 text-white">
                <th className="p-2 border border-slate-300">Forest Metric</th>
                <th className="p-2 border border-slate-300">Coverage (Hectares)</th>
                <th className="p-2 border border-slate-300">Impact Ratio</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2 font-medium">Initial Forest Canopy (T1)</td>
                <td className="p-2 font-mono">{deforest.vegetation_area_before_ha?.toLocaleString()} ha</td>
                <td className="p-2">100.0% Baseline</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-2 font-medium">Post-Observation Forest Canopy (T2)</td>
                <td className="p-2 font-mono">{deforest.vegetation_area_after_ha?.toLocaleString()} ha</td>
                <td className="p-2 font-semibold text-emerald-800">{100 + (deforest.percentage_vegetation_change || 0)}% of baseline</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 font-medium text-rose-800">Canopy Loss / Deforestation Detected</td>
                <td className="p-2 font-mono font-bold text-rose-800">{deforest.total_vegetation_loss_ha?.toLocaleString()} ha</td>
                <td className="p-2 font-bold text-rose-800">-{deforest.loss_percentage_of_initial || 0}% Loss</td>
              </tr>
            </tbody>
          </table>
          {deforest.change_map_image && (
            <div className="aspect-[16/7] max-h-56 rounded overflow-hidden border border-slate-300 bg-black">
              <img src={deforest.change_map_image} alt="Deforestation Map" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        {/* 7. WATER RESOURCE ANALYSIS */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            7. Water Resource & Surface Hydrology Dynamics
          </h2>
          <table className="w-full text-xs text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-sky-900 text-white">
                <th className="p-2 border border-slate-300">Hydrological Metric</th>
                <th className="p-2 border border-slate-300">Coverage (Hectares)</th>
                <th className="p-2 border border-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2 font-medium">Initial Water Body Area (T1)</td>
                <td className="p-2 font-mono">{water.water_area_before_ha?.toLocaleString()} ha</td>
                <td className="p-2">Baseline Reservoir Volume</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-2 font-medium">Post-Period Water Body Area (T2)</td>
                <td className="p-2 font-mono">{water.water_area_after_ha?.toLocaleString()} ha</td>
                <td className="p-2 font-semibold text-sky-800">Monitored Surface Area</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 font-medium text-amber-800">Water Desiccation / Shoreline Retreat</td>
                <td className="p-2 font-mono font-bold text-amber-800">{water.water_area_decreased_ha?.toLocaleString()} ha</td>
                <td className="p-2 text-amber-800">Exposed Lakebed / Desiccated</td>
              </tr>
            </tbody>
          </table>
          {water.change_map_image && (
            <div className="aspect-[16/7] max-h-56 rounded overflow-hidden border border-slate-300 bg-black">
              <img src={water.change_map_image} alt="Water Change Map" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        {/* 8. VISUAL COMPARISON */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            8. Visual Satellite Comparison
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="aspect-square rounded border border-slate-300 bg-black overflow-hidden">
                <img src={currentSession?.earlier_image} alt="T1" className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] text-center text-slate-600 font-semibold">T1 ({currentSession?.date_earlier})</p>
            </div>
            <div className="space-y-1">
              <div className="aspect-square rounded border border-slate-300 bg-black overflow-hidden">
                <img src={currentSession?.later_image} alt="T2" className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] text-center text-slate-600 font-semibold">T2 ({currentSession?.date_later})</p>
            </div>
          </div>
        </div>

        {/* 9. STATISTICAL ANALYSIS */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            9. Statistical Synthesis
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            The multi-temporal differencing detected a net altered footprint of <strong>{stats.total_changed_ha} ha</strong> ({stats.change_percentage}% of total landscape). <strong>{stats.total_stable_ha} ha</strong> ({stats.stability_percentage}%) remained preserved as stable terrestrial surface.
          </p>
        </div>

        {/* 10. RESULTS & DISCUSSION */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            10. Results and Discussion
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            Canopy clearing corresponds with road corridors and logging clearings. The substantial drop in NDVI values demonstrates severe biological biomass reduction rather than seasonal foliage fluctuation. Concurrently, surface water loss illustrates hydrological deficit in the regional catchment basin.
          </p>
        </div>

        {/* 11. CONCLUSION */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            11. Environmental Conclusion
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            Multi-temporal satellite monitoring with GeoVision AI successfully detected and quantified deforestation and water resource shrinkage in <strong>{currentSession?.region_name}</strong>. Immediate conservation zone demarcation and catchment afforestation are recommended.
          </p>
        </div>

        {/* 12. REFERENCES */}
        <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-300 pt-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
            12. References
          </h2>
          <p>1. European Space Agency (ESA). Copernicus Sentinel-2 MSI Technical Handbook, 2023.</p>
          <p>2. McFeeters, S. K. (1996). The use of the Normalized Difference Water Index (NDWI). Int. J. Remote Sens.</p>
          <p>3. Rouse, J. W., et al. (1974). Monitoring vegetation systems with ERTS. NASA SP-351.</p>
        </div>
      </div>
    </div>
  );
}
