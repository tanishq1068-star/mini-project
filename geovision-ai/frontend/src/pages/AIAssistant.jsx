import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Sparkles,
  Upload,
  Send,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Trees,
  Droplets,
  MoveHorizontal,
  Download,
  Info,
  Trash2,
  Calendar,
  Compass,
  ArrowRight,
  ShieldCheck,
  Eye,
  Sliders,
  ChevronRight,
  X
} from 'lucide-react';

import {
  analyzeChatbotSingleImage,
  analyzeChatbotDualImages,
  sendChatbotQuery,
  generateChatbotReport,
  loadChatbotSample
} from '../services/api';

import MetricCard from '../components/MetricCard';
import ImageSlider from '../components/ImageSlider';

export default function AIAssistant() {
  // Mode: 'single' (Single Image) or 'dual' (Before & After Comparison)
  const [analysisMode, setAnalysisMode] = useState('single');

  // Single Image State
  const [singleFile, setSingleFile] = useState(null);
  const [singlePreview, setSinglePreview] = useState(null);
  const [singleRegionName, setSingleRegionName] = useState('Tropical Biosphere Zone');

  // Dual Image State
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [previewA, setPreviewA] = useState(null);
  const [previewB, setPreviewB] = useState(null);
  const [dateA, setDateA] = useState('2021-06-15');
  const [dateB, setDateB] = useState('2024-07-20');
  const [dualRegionName, setDualRegionName] = useState('Western Ghats Eco-Corridor');

  // Analysis Result State
  const [sessionData, setSessionData] = useState(null);
  const [activeVisualTab, setActiveVisualTab] = useState('overlay'); // 'overlay', 'heatmap', 'lulc', 'mask', 'original', 'slider'
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Chat Conversation State
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to **GeoVision AI Satellite Assistant**! I specialize in autonomous remote sensing analysis for **deforestation, canopy health, and water resource monitoring**.\n\n' +
        '**How to start:**\n' +
        '1. Upload a single satellite image to inspect current canopy density & detect suspicious clearings.\n' +
        '2. Or switch to **Image Comparison Mode** to compare historical vs recent observations.\n' +
        '3. Ask me any question below about your uploaded imagery!',
      mode: 'GeoVision AI Remote Sensing Engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'Does this image show deforestation?',
        'What percentage of the image is vegetation?',
        'Where are the suspicious cleared areas?',
        'Explain the analysis in simple language'
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [querying, setQuerying] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputSingleRef = useRef(null);
  const fileInputARef = useRef(null);
  const fileInputBRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, querying]);

  // Handle Single Image File Selection
  const handleSingleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSingleFile(file);
      setAnalysisError(null);
      const reader = new FileReader();
      reader.onload = () => setSinglePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle Dual Image File Selection
  const handleFileAChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileA(file);
      setAnalysisError(null);
      const reader = new FileReader();
      reader.onload = () => setPreviewA(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFileBChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileB(file);
      setAnalysisError(null);
      const reader = new FileReader();
      reader.onload = () => setPreviewB(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Run AI Analysis
  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setAnalysisError(null);

      if (analysisMode === 'single') {
        if (!singleFile) {
          setAnalysisError('Please select or drag-and-drop a satellite image first.');
          setAnalyzing(false);
          return;
        }
        const formData = new FormData();
        formData.append('image', singleFile);
        formData.append('region_name', singleRegionName);

        const res = await analyzeChatbotSingleImage(formData);
        setSessionData(res);
        setActiveVisualTab('overlay');

        // Append assistant message announcing completed analysis
        const m = res.metrics || {};
        const isTrueNdvi = res.is_true_ndvi;
        const newMsg = {
          id: `analysis-${Date.now()}`,
          role: 'assistant',
          content:
            `### 🛰️ Satellite Image Analysis Completed\n\n` +
            `- **Forest Canopy**: **${m.forest_percentage}%** (${m.forest_area_ha} ha)\n` +
            `- **Suspicious Cleared Areas**: **${m.suspicious_clearing_percentage}%** (${m.suspicious_clearing_area_ha} ha across **${m.suspicious_patches_count} clusters**)\n` +
            `- **Surface Water**: **${m.water_percentage}%** (${m.water_area_ha} ha)\n` +
            `- **Vegetation Index**: ${res.vegetation_index_type} = **${res.mean_vegetation_index}** (${res.vegetation_condition})\n` +
            `- **Analysis Sensor**: ${res.sensor} (${res.confidence_score}% Confidence)\n\n` +
            (isTrueNdvi
              ? `*True multispectral NDVI calculated using Sentinel-2 NIR band.*`
              : `*RGB visible-spectrum analysis used (VARI). Check the model limitations card for spectral details.*`),
          mode: 'GeoVision AI Computer Vision Engine',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: [
            'Where are the suspicious cleared areas?',
            'How much forest is present?',
            'What environmental risks are visible?',
            'Explain the analysis in simple language'
          ]
        };
        setMessages((prev) => [...prev, newMsg]);
      } else {
        // Dual Image Comparison Mode
        if (!fileA || !fileB) {
          setAnalysisError('Please upload both Historical Image A and Recent Image B for comparison.');
          setAnalyzing(false);
          return;
        }
        const formData = new FormData();
        formData.append('image_a', fileA);
        formData.append('image_b', fileB);
        formData.append('date_a', dateA);
        formData.append('date_b', dateB);
        formData.append('region_name', dualRegionName);

        const res = await analyzeChatbotDualImages(formData);
        setSessionData(res);
        setActiveVisualTab('slider');

        const m = res.metrics || {};
        const newMsg = {
          id: `comparison-${Date.now()}`,
          role: 'assistant',
          content:
            `### 🛰️ Multi-Temporal Comparison Completed (${res.date_a} vs ${res.date_b})\n\n` +
            `- **Vegetation Loss (Deforestation)**: **${m.vegetation_loss_ha} ha** (**${m.vegetation_loss_percentage}%** of baseline canopy)\n` +
            `- **Forest Cover Shift**: Dropped from **${m.forest_before_percentage}%** to **${m.forest_after_percentage}%**\n` +
            `- **Water Shift**: **${m.water_decreased_ha} ha** change (${m.water_before_percentage}% $\\rightarrow$ ${m.water_after_percentage}%)\n` +
            `- **Deforestation Hotspots**: **${m.hotspots_count} active clusters** detected\n\n` +
            `*Use the interactive comparison slider on the left to visually inspect canopy changes.*`,
          mode: 'GeoVision AI Remote Sensing Engine',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: [
            'How much forest area was lost?',
            'Where are the high-priority deforestation hotspots?',
            'Are water bodies expanding or shrinking?',
            'Explain the analysis in simple language'
          ]
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err) {
      setAnalysisError(err.message || 'Analysis failed. Please check image format.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Load Quick Demonstration Scenarios
  const handleLoadSample = async (scenario = 'forest') => {
    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysisMode('dual');
      const res = await loadChatbotSample(scenario);
      setSessionData(res);
      setActiveVisualTab('slider');

      const m = res.metrics || {};
      const newMsg = {
        id: `sample-${Date.now()}`,
        role: 'assistant',
        content:
          `### 🛰️ Loaded Demonstration Scenario: ${res.region_name}\n\n` +
          `Comparing satellite observations from **${res.date_a}** to **${res.date_b}**:\n\n` +
          `- **Vegetation Loss**: **${m.vegetation_loss_ha} ha** (${m.vegetation_loss_percentage}% loss)\n` +
          `- **Forest Canopy**: Shifted from **${m.forest_before_percentage}%** to **${m.forest_after_percentage}%**\n` +
          `- **Water Depletion**: **${m.water_decreased_ha} ha**\n` +
          `- **High-Severity Hotspots**: **${m.hotspots_count} spatial clusters**\n\n` +
          `*Loaded Sentinel-2 4-band calibrated demonstration dataset.*`,
        mode: 'GeoVision AI Sentinel-2 Multi-Spectral Engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Does this comparison show deforestation?',
          'How much forest area was lost?',
          'Where are the high-priority hotspots?',
          'Explain the analysis in simple language'
        ]
      };
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      setAnalysisError(err.message || 'Failed to load sample demonstration.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle Send Chat Query
  const handleSendQuery = async (queryText = inputQuery) => {
    const text = queryText.trim();
    if (!text || querying) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setQuerying(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await sendChatbotQuery({
        query: text,
        session_id: sessionData?.session_id,
        session_data: sessionData,
        chat_history: chatHistory
      });

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        mode: res.mode || 'GeoVision AI Computer Vision Engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: res.suggestions || []
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Sorry, I encountered an issue processing your query: ${err.message}. Please try again.`,
        mode: 'System Alert',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setQuerying(false);
    }
  };

  // Download PDF Report
  const handleDownloadPdf = async () => {
    if (!sessionData?.session_id) {
      setAnalysisError('Run an analysis first before generating a report.');
      return;
    }
    try {
      setGeneratingPdf(true);
      const res = await generateChatbotReport(sessionData.session_id);
      if (res.download_url) {
        const link = document.createElement('a');
        link.href = res.download_url;
        link.download = res.filename || `GeoVision_Report_${sessionData.session_id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setAnalysisError(`Report download failed: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Download Current Visual Image
  const handleDownloadVisual = () => {
    const vis = sessionData?.visualizations || {};
    let targetUri = null;
    let label = 'visualization';

    if (activeVisualTab === 'overlay') {
      targetUri = vis.processed_overlay;
      label = 'analysis_overlay';
    } else if (activeVisualTab === 'heatmap') {
      targetUri = vis.clearing_heatmap || vis.deforestation_heatmap;
      label = 'clearing_heatmap';
    } else if (activeVisualTab === 'lulc') {
      targetUri = vis.lulc_map;
      label = 'lulc_classification';
    } else if (activeVisualTab === 'mask') {
      targetUri = vis.segmentation_mask;
      label = 'segmentation_mask';
    } else if (activeVisualTab === 'original') {
      targetUri = vis.original_preview || vis.before_image;
      label = 'original_satellite';
    }

    if (targetUri) {
      const link = document.createElement('a');
      link.href = targetUri;
      link.download = `GeoVision_${label}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Format assistant markdown simple paragraphs and bullets
  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-sm text-emerald-400 mt-2 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('- ')) {
        const itemText = trimmed.replace('- ', '');
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(itemText) }} />
          </div>
        );
      }
      if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ')) {
        return (
          <div key={idx} className="ml-1 my-1 text-xs text-slate-200">
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }} />
          </div>
        );
      }
      if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
        return (
          <p key={idx} className="text-[11px] text-slate-400 italic my-1">
            {trimmed.slice(1, -1)}
          </p>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-xs text-slate-300 leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }} />
      );
    });
  };

  const formatInlineMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[10px]">$1</code>');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-geo-border">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-geo-darker rounded-[14px] flex items-center justify-center">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                AI Satellite Assistant
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Vision Agent
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive ChatGPT-style assistant specialized in satellite image analysis & deforestation detection
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-mono text-[11px]">Sentinel & Optical Engine Active</span>
          </div>

          {sessionData && (
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
            >
              {generatingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download Assessment PDF</span>
            </button>
          )}

          <button
            onClick={() => {
              setSessionData(null);
              setSingleFile(null);
              setSinglePreview(null);
              setFileA(null);
              setFileB(null);
              setPreviewA(null);
              setPreviewB(null);
              setMessages([
                {
                  id: 'reset',
                  role: 'assistant',
                  content: 'Session reset. Upload a new satellite image or click a demonstration scenario below.',
                  mode: 'GeoVision AI Remote Sensing Engine',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  suggestions: [
                    'Does this image show deforestation?',
                    'What percentage of the image is vegetation?',
                    'Where are the suspicious cleared areas?'
                  ]
                }
              ]);
            }}
            className="p-2 rounded-xl bg-geo-card hover:bg-slate-800 text-slate-400 hover:text-white border border-geo-border text-xs transition-all"
            title="Clear Analysis & Chat History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Panel (Dashboard & Upload) + Right Panel (Chatbot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =================================================================== */}
        {/* LEFT COLUMN: Satellite Upload & Analysis Dashboard (5 Cols)         */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* Analysis Mode Switcher */}
          <div className="p-1 rounded-xl bg-geo-card border border-geo-border flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setAnalysisMode('single');
                setAnalysisError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                analysisMode === 'single'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Single Image Analysis</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAnalysisMode('dual');
                setAnalysisError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                analysisMode === 'dual'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-700/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MoveHorizontal className="w-3.5 h-3.5" />
              <span>Before & After Comparison</span>
            </button>
          </div>

          {/* Demonstration Quick-Load Bar */}
          <div className="px-4 py-3 rounded-xl bg-geo-card/60 border border-geo-border flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Try Demo Data:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLoadSample('forest')}
                disabled={analyzing}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1"
              >
                <Trees className="w-3 h-3" />
                Deforestation
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('water')}
                disabled={analyzing}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1"
              >
                <Droplets className="w-3 h-3" />
                Water Loss
              </button>
            </div>
          </div>

          {/* Upload Card */}
          <div className="p-4 rounded-2xl bg-geo-card border border-geo-border shadow-xl space-y-4">
            {analysisMode === 'single' ? (
              /* Single Image Upload Box */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    Upload Satellite Image
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">JPG, PNG, GeoTIFF</span>
                </div>

                {singlePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-geo-border group">
                    <img
                      src={singlePreview}
                      alt="Uploaded Satellite"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <button
                        onClick={() => fileInputSingleRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
                      >
                        Replace
                      </button>
                      <button
                        onClick={() => {
                          setSingleFile(null);
                          setSinglePreview(null);
                        }}
                        className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-300">
                      {singleFile?.name} ({(singleFile.size / 1024).toFixed(1)} KB)
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputSingleRef.current?.click()}
                    className="h-40 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-geo-darker/60 hover:bg-slate-800/40 flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center group"
                  >
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mb-2 transition-all" />
                    <p className="text-xs font-semibold text-slate-300 group-hover:text-white">
                      Click to upload or drag & drop satellite file
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      GeoTIFF, TIFF, JPG, PNG (Max 50MB)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputSingleRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.tif,.tiff,.geotiff"
                  onChange={handleSingleFileChange}
                  className="hidden"
                />

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Study Region Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={singleRegionName}
                    onChange={(e) => setSingleRegionName(e.target.value)}
                    placeholder="e.g. Coorg Biosphere Reserve"
                    className="w-full px-3 py-1.5 rounded-lg bg-geo-darker border border-geo-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              /* Dual Image Upload Box */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MoveHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    Upload Multi-Temporal Pair
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Baseline vs Recent</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Image A (Historical) */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      1. Earlier Satellite Image
                    </span>
                    {previewA ? (
                      <div className="relative rounded-lg overflow-hidden border border-geo-border h-28 group">
                        <img src={previewA} alt="Historical" className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            setFileA(null);
                            setPreviewA(null);
                          }}
                          className="absolute top-1 right-1 p-1 rounded bg-black/70 text-rose-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputARef.current?.click()}
                        className="h-28 rounded-lg border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-geo-darker/60 flex flex-col items-center justify-center cursor-pointer p-2 text-center"
                      >
                        <Upload className="w-5 h-5 text-slate-500 mb-1" />
                        <span className="text-[10px] text-slate-400 font-semibold">Image A (Earlier)</span>
                      </div>
                    )}
                    <input
                      ref={fileInputARef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.tif,.tiff,.geotiff"
                      onChange={handleFileAChange}
                      className="hidden"
                    />
                    <input
                      type="date"
                      value={dateA}
                      onChange={(e) => setDateA(e.target.value)}
                      className="w-full mt-1 px-2 py-1 rounded bg-geo-darker border border-geo-border text-[10px] text-slate-300"
                    />
                  </div>

                  {/* Image B (Recent) */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      2. Later Satellite Image
                    </span>
                    {previewB ? (
                      <div className="relative rounded-lg overflow-hidden border border-geo-border h-28 group">
                        <img src={previewB} alt="Recent" className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            setFileB(null);
                            setPreviewB(null);
                          }}
                          className="absolute top-1 right-1 p-1 rounded bg-black/70 text-rose-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputBRef.current?.click()}
                        className="h-28 rounded-lg border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-geo-darker/60 flex flex-col items-center justify-center cursor-pointer p-2 text-center"
                      >
                        <Upload className="w-5 h-5 text-slate-500 mb-1" />
                        <span className="text-[10px] text-slate-400 font-semibold">Image B (Recent)</span>
                      </div>
                    )}
                    <input
                      ref={fileInputBRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.tif,.tiff,.geotiff"
                      onChange={handleFileBChange}
                      className="hidden"
                    />
                    <input
                      type="date"
                      value={dateB}
                      onChange={(e) => setDateB(e.target.value)}
                      className="w-full mt-1 px-2 py-1 rounded bg-geo-darker border border-geo-border text-[10px] text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Study Region Name
                  </label>
                  <input
                    type="text"
                    value={dualRegionName}
                    onChange={(e) => setDualRegionName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-geo-darker border border-geo-border text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {analysisError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Run Button */}
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                analysisMode === 'single'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/30'
              } disabled:opacity-50`}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Satellite Bands & Models...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {analysisMode === 'single' ? 'Analyze Satellite Image' : 'Run Change Detection Comparison'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Results Display (If Available) */}
          {sessionData && (
            <div className="space-y-4">
              {/* Visual Artifacts Gallery Card */}
              <div className="p-4 rounded-2xl bg-geo-card border border-geo-border shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Processed Satellite Visualizations
                  </span>
                  <button
                    onClick={handleDownloadVisual}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all text-[11px] flex items-center gap-1 px-2"
                    title="Download active visualization"
                  >
                    <Download className="w-3 h-3" />
                    <span>Save PNG</span>
                  </button>
                </div>

                {/* Visual Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                  {sessionData.mode === 'dual_image_comparison' ? (
                    <>
                      <button
                        onClick={() => setActiveVisualTab('slider')}
                        className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          activeVisualTab === 'slider'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'bg-geo-darker text-slate-400 hover:text-white'
                        }`}
                      >
                        Comparison Slider
                      </button>
                      <button
                        onClick={() => setActiveVisualTab('change_map')}
                        className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          activeVisualTab === 'change_map'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'bg-geo-darker text-slate-400 hover:text-white'
                        }`}
                      >
                        Difference Map
                      </button>
                      <button
                        onClick={() => setActiveVisualTab('heatmap')}
                        className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          activeVisualTab === 'heatmap'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'bg-geo-darker text-slate-400 hover:text-white'
                        }`}
                      >
                        Loss Heatmap
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setActiveVisualTab('overlay')}
                        className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          activeVisualTab === 'overlay'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-geo-darker text-slate-400 hover:text-white'
                        }`}
                      >
                        Analysis Overlay
                      </button>
                      <button
                        onClick={() => setActiveVisualTab('heatmap')}
                        className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          activeVisualTab === 'heatmap'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-geo-darker text-slate-400 hover:text-white'
                        }`}
                      >
                        Clearing Heatmap
                      </button>
                      <button
                        onClick={() => setActiveVisualTab('lulc')}
                        className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          activeVisualTab === 'lulc'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-geo-darker text-slate-400 hover:text-white'
                        }`}
                      >
                        5-Class LULC
                      </button>
                      <button
                        onClick={() => setActiveVisualTab('mask')}
                        className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          activeVisualTab === 'mask'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-geo-darker text-slate-400 hover:text-white'
                        }`}
                      >
                        Mask
                      </button>
                      <button
                        onClick={() => setActiveVisualTab('original')}
                        className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          activeVisualTab === 'original'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-geo-darker text-slate-400 hover:text-white'
                        }`}
                      >
                        Original
                      </button>
                    </>
                  )}
                </div>

                {/* Visual Viewport */}
                <div className="rounded-xl overflow-hidden border border-geo-border bg-black/60 min-h-[220px] flex items-center justify-center">
                  {sessionData.mode === 'dual_image_comparison' && activeVisualTab === 'slider' ? (
                    <div className="w-full h-64">
                      <ImageSlider
                        beforeImage={sessionData.visualizations.before_image}
                        afterImage={sessionData.visualizations.after_image}
                        beforeDate={sessionData.date_a}
                        afterDate={sessionData.date_b}
                        regionName={sessionData.region_name}
                      />
                    </div>
                  ) : activeVisualTab === 'change_map' ? (
                    <img
                      src={sessionData.visualizations.change_difference_map}
                      alt="Change Difference Map"
                      className="w-full max-h-72 object-contain"
                    />
                  ) : activeVisualTab === 'heatmap' ? (
                    <img
                      src={
                        sessionData.visualizations.clearing_heatmap ||
                        sessionData.visualizations.deforestation_heatmap
                      }
                      alt="Heatmap"
                      className="w-full max-h-72 object-contain"
                    />
                  ) : activeVisualTab === 'lulc' ? (
                    <img
                      src={sessionData.visualizations.lulc_map}
                      alt="LULC Map"
                      className="w-full max-h-72 object-contain"
                    />
                  ) : activeVisualTab === 'mask' ? (
                    <img
                      src={sessionData.visualizations.segmentation_mask}
                      alt="Segmentation Mask"
                      className="w-full max-h-72 object-contain"
                    />
                  ) : activeVisualTab === 'original' ? (
                    <img
                      src={sessionData.visualizations.original_preview}
                      alt="Original Satellite"
                      className="w-full max-h-72 object-contain"
                    />
                  ) : (
                    <img
                      src={sessionData.visualizations.processed_overlay}
                      alt="Processed Overlay"
                      className="w-full max-h-72 object-contain"
                    />
                  )}
                </div>

                {/* Legend Chips */}
                {sessionData.mode === 'single_image' ? (
                  <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Forest Canopy
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Suspicious Clearing
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-cyan-500"></span> Water Bodies
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Canopy Loss
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Stable Vegetation
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-cyan-500"></span> Water Change
                    </span>
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2">
                {sessionData.mode === 'single_image' ? (
                  <>
                    <MetricCard
                      title="Forest Canopy"
                      value={`${sessionData.metrics.forest_percentage}%`}
                      subtitle={`${sessionData.metrics.forest_area_ha} hectares`}
                      trend="neutral"
                      icon={Trees}
                      color="emerald"
                    />
                    <MetricCard
                      title="Suspicious Clearing"
                      value={`${sessionData.metrics.suspicious_clearing_percentage}%`}
                      subtitle={`${sessionData.metrics.suspicious_clearing_area_ha} ha (${sessionData.metrics.suspicious_patches_count} clusters)`}
                      trend={sessionData.metrics.suspicious_clearing_percentage > 2 ? 'negative' : 'neutral'}
                      icon={AlertTriangle}
                      color="rose"
                    />
                    <MetricCard
                      title="Water Coverage"
                      value={`${sessionData.metrics.water_percentage}%`}
                      subtitle={`${sessionData.metrics.water_area_ha} hectares`}
                      trend="neutral"
                      icon={Droplets}
                      color="cyan"
                    />
                    <MetricCard
                      title={sessionData.vegetation_index_type}
                      value={sessionData.mean_vegetation_index}
                      subtitle={sessionData.vegetation_condition}
                      trend="neutral"
                      icon={Compass}
                      color="emerald"
                    />
                  </>
                ) : (
                  <>
                    <MetricCard
                      title="Vegetation Loss"
                      value={`${sessionData.metrics.vegetation_loss_ha} ha`}
                      subtitle={`${sessionData.metrics.vegetation_loss_percentage}% of canopy`}
                      trend="negative"
                      icon={Trees}
                      color="rose"
                    />
                    <MetricCard
                      title="Net Forest Shift"
                      value={`${sessionData.metrics.forest_net_change_percentage}%`}
                      subtitle={`${sessionData.metrics.forest_before_percentage}% → ${sessionData.metrics.forest_after_percentage}%`}
                      trend="negative"
                      icon={AlertTriangle}
                      color="amber"
                    />
                    <MetricCard
                      title="Water Change"
                      value={`${sessionData.metrics.water_decreased_ha} ha`}
                      subtitle={`${sessionData.metrics.water_before_percentage}% → ${sessionData.metrics.water_after_percentage}%`}
                      trend="neutral"
                      icon={Droplets}
                      color="cyan"
                    />
                    <MetricCard
                      title="Hotspot Clusters"
                      value={sessionData.metrics.hotspots_count}
                      subtitle="High-priority targets"
                      trend={sessionData.metrics.hotspots_count > 0 ? 'negative' : 'neutral'}
                      icon={Layers}
                      color="rose"
                    />
                  </>
                )}
              </div>

              {/* Model Disclosures & Limitations */}
              <div className="p-3.5 rounded-xl bg-geo-card/60 border border-amber-500/30 text-xs space-y-1">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Model Transparency & Limitations (Confidence: {sessionData.confidence_score}%)
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {sessionData.model_limitations ||
                    'Standard computer-vision geospatial processing applied.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: Modern ChatGPT-Style Interactive Conversation Thread  */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 flex flex-col h-[750px] rounded-2xl border border-geo-border bg-geo-card shadow-2xl overflow-hidden">
          {/* Chat Header Bar */}
          <div className="px-5 py-3.5 bg-geo-darker border-b border-geo-border flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">GeoVision Remote Sensing Assistant</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {sessionData ? `Session: ${sessionData.session_id}` : 'Awaiting Satellite Data'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400 border border-slate-700">
                AI Vision Q&A
              </span>
            </div>
          </div>

          {/* Chat Messages Scroll Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs shadow-md space-y-2 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-br-none'
                      : 'bg-geo-darker border border-geo-border text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="leading-relaxed">
                    {msg.role === 'assistant' ? (
                      renderMessageContent(msg.content)
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Operational Mode Tag / Timestamp */}
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono border-t border-slate-700/40">
                    <span>{msg.mode || (msg.role === 'user' ? 'Analyst Query' : 'System')}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Interactive Query Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendQuery(sug)}
                          disabled={querying}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/50 transition-all flex items-center gap-1"
                        >
                          <span>{sug}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Thinking / Processing Spinner */}
            {querying && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-geo-darker border border-geo-border text-xs text-slate-400 flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Synthesizing remote sensing metrics & spectral indices...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions Bar (Above Input) */}
          <div className="px-4 py-2 bg-geo-darker/60 border-t border-geo-border flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold whitespace-nowrap">
              Suggestions:
            </span>
            <button
              onClick={() => handleSendQuery('Does this image show deforestation?')}
              disabled={querying}
              className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap transition-all"
            >
              Deforestation status?
            </button>
            <button
              onClick={() => handleSendQuery('How much forest area is visible?')}
              disabled={querying}
              className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap transition-all"
            >
              Forest coverage %?
            </button>
            <button
              onClick={() => handleSendQuery('Where are the suspicious cleared areas?')}
              disabled={querying}
              className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap transition-all"
            >
              Suspicious areas?
            </button>
            <button
              onClick={() => handleSendQuery('Explain the analysis in simple language')}
              disabled={querying}
              className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap transition-all"
            >
              Explain simply
            </button>
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-geo-darker border-t border-geo-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask a question about the satellite image (e.g. 'How much forest was lost?')..."
                  disabled={querying}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-geo-card border border-geo-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={!inputQuery.trim() || querying}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-700/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
