import React from 'react';
import {
  Info,
  GraduationCap,
  Layers,
  Cpu,
  Code2,
  Trees,
  Droplets,
  Satellite,
  Compass,
  FileCheck2,
  BookOpen,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export default function AboutProject() {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-geo-border pb-6">
        <div className="flex items-center space-x-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            B.Tech CSE Mini Project
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Department of Computer Science & Engineering
          </span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-emerald-400" />
          Project Overview & Scientific Methodology
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          "Change Detection of Deforestation and Water Resources Using Multi-Temporal Satellite Images"
        </p>
      </div>

      {/* Project Identity Card */}
      <div className="rounded-2xl border border-geo-border bg-gradient-to-br from-geo-card to-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-geo-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Satellite className="w-5 h-5 text-cyan-400" />
              GeoVision AI — Remote Sensing System
            </h3>
            <p className="text-xs text-slate-400">
              Automated multi-spectral change detection platform for environmental governance and ecological monitoring
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 w-fit">
            Working Production Prototype
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-3 rounded-xl bg-geo-dark/60 border border-geo-border">
            <span className="text-slate-500 font-bold block text-[10px] uppercase">Primary Focus</span>
            <span className="text-slate-200 font-semibold">Deforestation & Hydrological Depletion</span>
          </div>
          <div className="p-3 rounded-xl bg-geo-dark/60 border border-geo-border">
            <span className="text-slate-500 font-bold block text-[10px] uppercase">Primary Satellite</span>
            <span className="text-slate-200 font-semibold">ESA Sentinel-2 Multi-Spectral (10m)</span>
          </div>
          <div className="p-3 rounded-xl bg-geo-dark/60 border border-geo-border">
            <span className="text-slate-500 font-bold block text-[10px] uppercase">Supported Formats</span>
            <span className="text-slate-200 font-semibold">GeoTIFF, Multi-Band TIFF, PNG, JPG</span>
          </div>
        </div>
      </div>

      {/* Mathematical Formulations & Remote Sensing Theory */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-geo-border pb-3">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          Remote Sensing Formulations & Spectral Indices
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NDVI Card */}
          <div className="p-5 rounded-xl bg-geo-dark/80 border border-emerald-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <Trees className="w-4 h-4" />
              <span>Normalized Difference Vegetation Index (NDVI)</span>
            </div>
            <div className="p-3 rounded-lg bg-black/60 border border-emerald-500/20 text-center font-mono text-sm text-emerald-300">
              NDVI = (NIR - RED) / (NIR + RED)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Chlorophyll in healthy plant leaves absorbs visible Red light (0.66 μm) for photosynthesis while reflecting up to 50% of Near-Infrared (0.84 μm) through spongy mesophyll cell structure. Dense forests yield NDVI between +0.50 and +0.85, whereas deforested bare soil drops below +0.20.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <strong>RGB Fallback:</strong> VARI = (G - R) / (G + R - B) is deployed when NIR is absent, with explicit scientific caveats.
            </div>
          </div>

          {/* NDWI Card */}
          <div className="p-5 rounded-xl bg-geo-dark/80 border border-cyan-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
              <Droplets className="w-4 h-4" />
              <span>Normalized Difference Water Index (McFeeters NDWI)</span>
            </div>
            <div className="p-3 rounded-lg bg-black/60 border border-cyan-500/20 text-center font-mono text-sm text-cyan-300">
              NDWI = (GREEN - NIR) / (GREEN + NIR)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Water absorbs almost 100% of Near-Infrared electromagnetic radiation while showing moderate reflection in the Green band (0.56 μm). McFeeters NDWI isolates open water bodies (lakes, reservoirs, rivers) where NDWI &gt; 0, while terrestrial vegetation and dry soil register negative values.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <strong>RGB Fallback:</strong> Normalized Blue-Red Difference Index coupled with brightness albedo thresholding.
            </div>
          </div>
        </div>

        {/* Multi-Temporal Differencing Pipeline */}
        <div className="p-5 rounded-xl bg-geo-dark/80 border border-geo-border space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Multi-Temporal Image Registration & Change Differencing Pipeline
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Satellite observations captured at different dates $T_1$ and $T_2$ often experience slight angular orientation offsets. GeoVision AI applies:
          </p>
          <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1">
            <li><strong>ORB Feature Matching:</strong> Detects key tie points and computes homography matrix $H$ with RANSAC outlier suppression.</li>
            <li><strong>Bilateral Denoising:</strong> Filters high-frequency speckle noise while preserving sharp forest boundaries and lake coastlines.</li>
            <li><strong>Euclidean Spectral Differencing:</strong> Computes $\Delta I = \sqrt{(R_2 - R_1)^2 + (G_2 - G_1)^2 + (B_2 - B_1)^2}$ across corresponding pixels.</li>
            <li><strong>Multi-Class Decision Engine:</strong> Couples $\Delta I$ with NDVI canopy drops and NDWI shoreline shifts to synthesize the final environmental change map.</li>
          </ol>
        </div>
      </div>

      {/* Technology Stack Specifications */}
      <div className="rounded-2xl border border-geo-border bg-geo-card p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-geo-border pb-3">
          <Code2 className="w-5 h-5 text-emerald-400" />
          Full-Stack Technology Architecture
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-geo-dark/60 border border-geo-border space-y-2">
            <p className="font-bold text-emerald-400">Frontend</p>
            <ul className="text-slate-300 space-y-1 text-[11px]">
              <li>• React.js (v18) + Vite</li>
              <li>• Tailwind CSS (Dark/Emerald)</li>
              <li>• Lucide React Icons</li>
              <li>• Responsive Split-Screen View</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-geo-dark/60 border border-geo-border space-y-2">
            <p className="font-bold text-cyan-400">Geospatial & Visual</p>
            <ul className="text-slate-300 space-y-1 text-[11px]">
              <li>• Leaflet.js + React-Leaflet</li>
              <li>• Esri Satellite Tiles</li>
              <li>• Recharts Interactive Charts</li>
              <li>• Interactive Before/After Slider</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-geo-dark/60 border border-geo-border space-y-2">
            <p className="font-bold text-blue-400">Backend & API</p>
            <ul className="text-slate-300 space-y-1 text-[11px]">
              <li>• Python FastAPI (Async)</li>
              <li>• Uvicorn ASGI Server</li>
              <li>• Multipart File Ingestion</li>
              <li>• In-Memory Analysis Cache</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-geo-dark/60 border border-geo-border space-y-2">
            <p className="font-bold text-purple-400">Scientific Processing</p>
            <ul className="text-slate-300 space-y-1 text-[11px]">
              <li>• NumPy Matrix Computations</li>
              <li>• OpenCV (cv2) Homography</li>
              <li>• Tifffile GeoTIFF Reader</li>
              <li>• ReportLab PDF Engine</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
