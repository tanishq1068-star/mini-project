import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  MoveHorizontal,
  MoveVertical,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export default function ImageSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Earlier Observation',
  afterLabel = 'Later Observation',
  beforeDate = null,
  afterDate = null,
  regionName = null,
  className = '',
  initialOrientation = 'horizontal', // 'horizontal' or 'vertical'
  allowOrientationToggle = true,
  showControls = true,
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [orientation, setOrientation] = useState(initialOrientation); // 'horizontal' or 'vertical'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);

  // Reset comparison state
  const handleReset = useCallback(() => {
    setSliderPosition(50);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.35, 4.0));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.35, 1.0);
      if (next === 1.0) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Orientation switch
  const handleToggleOrientation = () => {
    setOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  };

  // Slider dragging calculations
  const updateSliderFromClientPos = useCallback(
    (clientX, clientY) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (orientation === 'horizontal') {
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
      } else {
        const y = clientY - rect.top;
        const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100));
        setSliderPosition(percentage);
      }
    },
    [orientation]
  );

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(prev + 0.2, 4.0));
    } else {
      setZoomLevel((prev) => {
        const next = Math.max(prev - 0.2, 1.0);
        if (next === 1.0) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Start panning (when zoomed and middle/right click or space pressed)
  const handleMouseDown = (e) => {
    // If clicking on or near the divider line, drag slider
    const rect = containerRef.current.getBoundingClientRect();
    const dividerCoord = orientation === 'horizontal'
      ? rect.left + (sliderPosition / 100) * rect.width
      : rect.top + (sliderPosition / 100) * rect.height;

    const clickCoord = orientation === 'horizontal' ? e.clientX : e.clientY;
    const distanceToDivider = Math.abs(clickCoord - dividerCoord);

    if (distanceToDivider < 24) {
      setIsDraggingSlider(true);
      return;
    }

    if (zoomLevel > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else {
      // Direct jump to position
      updateSliderFromClientPos(e.clientX, e.clientY);
      setIsDraggingSlider(true);
    }
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isDraggingSlider) {
        updateSliderFromClientPos(e.clientX, e.clientY);
      } else if (isPanning && zoomLevel > 1) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isDraggingSlider, isPanning, zoomLevel, panStart, updateSliderFromClientPos]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingSlider(false);
    setIsPanning(false);
  }, []);

  // Touch handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      updateSliderFromClientPos(e.touches[0].clientX, e.touches[0].clientY);
      setIsDraggingSlider(true);
    }
  };

  const handleTouchMove = useCallback(
    (e) => {
      if (isDraggingSlider && e.touches.length === 1) {
        updateSliderFromClientPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [isDraggingSlider, updateSliderFromClientPos]
  );

  useEffect(() => {
    if (isDraggingSlider || isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSlider, isPanning, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Dynamic CSS clip-path for Before image
  const clipPathStyle =
    orientation === 'horizontal'
      ? `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
      : `polygon(0 0, 100% 0, 100% ${sliderPosition}%, 0 ${sliderPosition}%)`;

  const transformStyle = {
    transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
    transition: isPanning ? 'none' : 'transform 0.15s ease-out',
    transformOrigin: 'center center',
  };

  return (
    <div className="space-y-3">
      {/* Top Header & Observation Dates Bar */}
      {(beforeDate || afterDate || regionName) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              {regionName || 'Selected Geographical Area'}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-slate-300">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
              <Calendar className="w-3 h-3" />
              <span>Before (T1): {beforeDate || 'Baseline'}</span>
            </div>
            <span className="text-slate-500">vs</span>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
              <Calendar className="w-3 h-3" />
              <span>After (T2): {afterDate || 'Monitoring'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Comparison Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`relative select-none overflow-hidden rounded-2xl border border-geo-border shadow-2xl bg-black ${
          zoomLevel > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : orientation === 'horizontal' ? 'cursor-ew-resize' : 'cursor-ns-resize'
        } ${className}`}
        style={{ minHeight: isFullscreen ? '100vh' : '420px' }}
      >
        {/* Layer 1: After Image (Background layer) */}
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
          <img
            src={afterImage}
            alt={afterLabel}
            style={transformStyle}
            className="w-full h-full object-cover block pointer-events-none"
          />
        </div>

        {/* Layer 2: Before Image (Synchronously transformed & clipped) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center"
          style={{ clipPath: clipPathStyle }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            style={transformStyle}
            className="w-full h-full object-cover block"
          />
        </div>

        {/* Labels overlay */}
        <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-md text-xs font-bold text-emerald-400 border border-emerald-500/30 pointer-events-none shadow-md">
          {beforeLabel} {beforeDate ? `(${beforeDate})` : ''}
        </div>
        <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-md text-xs font-bold text-cyan-400 border border-cyan-500/30 pointer-events-none shadow-md">
          {afterLabel} {afterDate ? `(${afterDate})` : ''}
        </div>

        {/* Orientation & Divider Line */}
        {orientation === 'horizontal' ? (
          <div
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.9)] pointer-events-none"
            style={{ left: `calc(${sliderPosition}% - 2px)` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900 border-2 border-emerald-400 shadow-2xl flex items-center justify-center text-emerald-400 pointer-events-auto cursor-ew-resize">
              <MoveHorizontal className="w-4 h-4" />
            </div>
          </div>
        ) : (
          <div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.9)] pointer-events-none"
            style={{ top: `calc(${sliderPosition}% - 2px)` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-2xl flex items-center justify-center text-cyan-400 pointer-events-auto cursor-ns-resize">
              <MoveVertical className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Floating Zoom & Toolbar Controls inside the canvas */}
        {showControls && (
          <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-geo-darker/90 backdrop-blur-md p-1.5 rounded-xl border border-geo-border shadow-2xl z-20">
            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Zoom Indicator */}
            {zoomLevel > 1 && (
              <span className="text-[10px] font-mono text-emerald-400 px-1 font-bold">
                {zoomLevel.toFixed(1)}x
              </span>
            )}

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              title="Reset Zoom & Position"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-700"></div>

            {/* Orientation Toggle */}
            {allowOrientationToggle && (
              <button
                type="button"
                onClick={handleToggleOrientation}
                className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-all"
                title={`Switch to ${orientation === 'horizontal' ? 'Vertical' : 'Horizontal'} split`}
              >
                {orientation === 'horizontal' ? (
                  <MoveVertical className="w-4 h-4" />
                ) : (
                  <MoveHorizontal className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-amber-400" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Helper caption */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>
          💡 <strong>Tip:</strong> Drag the center handle to compare. Use <strong>+ / -</strong> or mouse wheel to zoom in and drag to pan across the landscape.
        </span>
        <span className="font-mono text-slate-500">
          Split: {Math.round(sliderPosition)}% • {orientation.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
