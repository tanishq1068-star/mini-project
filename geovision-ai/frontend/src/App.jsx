import React, { useState, useEffect } from 'react';
import {
  Satellite,
  RefreshCw,
  AlertCircle,
  Menu,
  X
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Dashboard from './pages/Dashboard';
import AIAssistant from './pages/AIAssistant';
import SatelliteDataExplorer from './pages/SatelliteDataExplorer';
import ComparisonSliderPage from './pages/ComparisonSliderPage';
import SatelliteImagery from './pages/SatelliteImagery';
import Deforestation from './pages/Deforestation';
import WaterResources from './pages/WaterResources';
import ChangeDetection from './pages/ChangeDetection';
import CloudMasking from './pages/CloudMasking';
import MultiYearAnalysis from './pages/MultiYearAnalysis';
import AccuracyAssessment from './pages/AccuracyAssessment';
import LULCClassification from './pages/LULCClassification';
import EnvironmentalAlerts from './pages/EnvironmentalAlerts';
import InteractiveMap from './pages/InteractiveMap';
import Analytics from './pages/Analytics';
import AnalysisHistory from './pages/AnalysisHistory';
import GenerateReport from './pages/GenerateReport';
import AboutProject from './pages/AboutProject';

import {
  fetchCurrentResults,
  loadSampleScenario,
  generatePdfReport,
  runChangeDetection,
  BASE_URL
} from './services/api';

// Canonical URL Route Mapping
export const ROUTE_MAP = {
  'dashboard': '/dashboard',
  'ai-assistant': '/ai-assistant',
  'satellite-explorer': '/satellite-explorer',
  'comparison-slider': '/comparison-slider',
  'satellite-imagery': '/satellite-imagery',
  'cloud-masking': '/cloud-masking',
  'deforestation': '/deforestation',
  'water': '/water-resources',
  'change-detection': '/change-detection',
  'lulc': '/lulc-classification',
  'multi-year': '/multi-year-analysis',
  'accuracy-assessment': '/accuracy-assessment',
  'alerts': '/alerts',
  'interactive-map': '/interactive-map',
  'analytics': '/analytics',
  'history': '/history',
  'generate-report': '/generate-report',
  'about': '/about'
};

export function getTabFromUrl() {
  if (typeof window === 'undefined') return 'dashboard';
  const p = (window.location.pathname || '').replace(/\/$/, '').toLowerCase();
  const h = (window.location.hash || '').replace(/^#\/?/, '').replace(/\/$/, '').toLowerCase();
  const target = p || h;

  if (target.includes('multi-year')) return 'multi-year';
  if (target.includes('lulc')) return 'lulc';
  if (target.includes('assistant') || target.includes('chatbot') || target.includes('ai-assistant')) return 'ai-assistant';
  if (target.includes('explorer') || target.includes('satellite-explorer')) return 'satellite-explorer';
  if (target.includes('comparison') || target.includes('slider')) return 'comparison-slider';
  if (target.includes('imagery') || target.includes('satellite-imagery')) return 'satellite-imagery';
  if (target.includes('cloud')) return 'cloud-masking';
  if (target.includes('deforest')) return 'deforestation';
  if (target.includes('water')) return 'water';
  if (target.includes('change')) return 'change-detection';
  if (target.includes('accuracy')) return 'accuracy-assessment';
  if (target.includes('alert')) return 'alerts';
  if (target.includes('interactive-map') || target.includes('map')) return 'interactive-map';
  if (target.includes('analytics')) return 'analytics';
  if (target.includes('history')) return 'history';
  if (target.includes('report') || target.includes('generate-report')) return 'generate-report';
  if (target.includes('about')) return 'about';

  return 'dashboard';
}

export default function App() {
  const [activeTab, setActiveTabState] = useState(() => getTabFromUrl());
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Seamless URL-synchronized tab navigation without full page reload
  const handleNavigateTab = (tabId, pushHistory = true) => {
    setActiveTabState(tabId);
    if (pushHistory && typeof window !== 'undefined') {
      const newPath = ROUTE_MAP[tabId] || `/${tabId}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({ tab: tabId }, '', newPath);
      }
    }
  };

  const setActiveTab = handleNavigateTab;

  // Sync with browser Back and Forward navigation buttons
  useEffect(() => {
    const handlePopState = (e) => {
      const tab = (e.state && e.state.tab) || getTabFromUrl();
      setActiveTabState(tab);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Tab titles lookup
  const tabTitles = {
    'dashboard': 'Executive Environmental Dashboard',
    'ai-assistant': 'GeoVision AI Satellite Image Analysis Chatbot',
    'satellite-explorer': 'Copernicus Sentinel-2 Data Explorer',
    'comparison-slider': 'Before & After Satellite Comparison Slider',
    'satellite-imagery': 'Satellite Imagery Management & Ingestion',
    'cloud-masking': 'Sentinel-2 Cloud Detection & Surface Masking',
    'deforestation': 'Deforestation & Canopy Loss Detection',
    'water': 'Water Resource & Reservoir Monitoring',
    'change-detection': 'Multi-Temporal Change Detection Map',
    'lulc': '5-Class Land Use and Land Cover (LULC) Classification',
    'multi-year': 'Multi-Year Environmental Analysis & Decadal Trends',
    'accuracy-assessment': 'Remote Sensing Classification Accuracy Assessment',
    'alerts': 'Autonomous Environmental Alerts & Incident Dispatcher',
    'interactive-map': 'Interactive GIS Satellite Map',
    'analytics': 'Environmental Analytics & Metrics',
    'history': 'Historical Analysis Sessions & Comparative Audit',
    'generate-report': 'Advanced Scientific Assessment Reports',
    'about': 'About Project & Methodology'
  };

  // Initial data load
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCurrentResults();
        setCurrentSession(data);
      } catch (err) {
        console.error('Error loading initial session:', err);
        setError(`Could not connect to GeoVision AI backend (${BASE_URL || 'http://127.0.0.1:8000'}). Please verify the backend service is active.`);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Handler to load pre-packaged demonstration datasets
  const handleLoadSample = async (scenario) => {
    try {
      setActionLoading(true);
      setError(null);
      const data = await loadSampleScenario(scenario);
      setCurrentSession(data);
    } catch (err) {
      setError(`Failed to load ${scenario} demonstration: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler to refresh/re-run analysis
  const handleRefreshAnalysis = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await runChangeDetection();
      const updated = await fetchCurrentResults();
      setCurrentSession(updated);
    } catch (err) {
      setError(`Analysis refresh failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Quick download report handler from top navbar
  const handleQuickDownloadReport = async () => {
    try {
      setActionLoading(true);
      const res = await generatePdfReport();
      if (res.download_url) {
        const link = document.createElement('a');
        link.href = res.download_url;
        link.download = res.filename || 'GeoVision_Environmental_Report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError(`Report generation error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSessionUpdated = (newSession) => {
    setCurrentSession(newSession);
  };

  return (
    <div className="flex h-screen bg-[#060e17] text-slate-100 overflow-hidden font-['Inter',sans-serif]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentSession={currentSession}
          onLoadSample={handleLoadSample}
          loadingSample={actionLoading}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative z-10 w-72 bg-geo-darker h-full shadow-2xl">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              currentSession={currentSession}
              onLoadSample={(s) => {
                handleLoadSample(s);
                setMobileMenuOpen(false);
              }}
              loadingSample={actionLoading}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header Bar */}
        <div className="lg:hidden h-14 bg-geo-darker border-b border-geo-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-geo-card border border-geo-border text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-sm text-emerald-400">GeoVision AI</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">v2.0</span>
        </div>

        {/* Global Navbar */}
        <Navbar
          currentSession={currentSession}
          onRefreshAnalysis={handleRefreshAnalysis}
          onDownloadReport={handleQuickDownloadReport}
          loadingAction={actionLoading}
          activeTabTitle={tabTitles[activeTab]}
        />

        {/* Global Error Notice */}
        {error && (
          <div className="m-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-semibold text-rose-300 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Body Pages */}
        <main className="flex-1 pb-16">
          {loading ? (
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
                <Satellite className="w-7 h-7 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-white">Initializing GeoVision AI Engine...</p>
                <p className="text-xs text-slate-400">Calibrating Sentinel-2 multi-spectral datasets</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  currentSession={currentSession}
                  setActiveTab={setActiveTab}
                  onLoadSample={handleLoadSample}
                />
              )}

              {activeTab === 'ai-assistant' && (
                <AIAssistant
                  currentSession={currentSession}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'satellite-explorer' && (
                <SatelliteDataExplorer
                  onSessionUpdated={handleSessionUpdated}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'comparison-slider' && (
                <ComparisonSliderPage
                  currentSession={currentSession}
                  onSessionUpdated={handleSessionUpdated}
                  onLoadSample={handleLoadSample}
                  loadingSample={actionLoading}
                />
              )}

              {activeTab === 'satellite-imagery' && (
                <SatelliteImagery
                  currentSession={currentSession}
                  onSessionUpdated={handleSessionUpdated}
                  onLoadSample={handleLoadSample}
                  loadingSample={actionLoading}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'cloud-masking' && (
                <CloudMasking currentSession={currentSession} />
              )}

              {activeTab === 'deforestation' && (
                <Deforestation currentSession={currentSession} />
              )}

              {activeTab === 'water' && (
                <WaterResources currentSession={currentSession} />
              )}

              {activeTab === 'change-detection' && (
                <ChangeDetection currentSession={currentSession} />
              )}

              {activeTab === 'lulc' && (
                <LULCClassification
                  currentSession={currentSession}
                  setActiveTab={setActiveTab}
                  onLoadSample={handleLoadSample}
                />
              )}

              {activeTab === 'multi-year' && (
                <MultiYearAnalysis
                  currentSession={currentSession}
                  setActiveTab={setActiveTab}
                  onLoadSample={handleLoadSample}
                />
              )}

              {activeTab === 'accuracy-assessment' && (
                <AccuracyAssessment currentSession={currentSession} />
              )}

              {activeTab === 'alerts' && (
                <EnvironmentalAlerts currentSession={currentSession} />
              )}

              {activeTab === 'interactive-map' && (
                <InteractiveMap
                  currentSession={currentSession}
                  onLoadSample={handleLoadSample}
                />
              )}

              {activeTab === 'analytics' && (
                <Analytics currentSession={currentSession} />
              )}

              {activeTab === 'history' && (
                <AnalysisHistory
                  currentSession={currentSession}
                  onSessionUpdated={handleSessionUpdated}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'generate-report' && (
                <GenerateReport currentSession={currentSession} />
              )}

              {activeTab === 'about' && (
                <AboutProject />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
