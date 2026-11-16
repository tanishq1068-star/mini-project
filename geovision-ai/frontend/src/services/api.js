// API Client for GeoVision AI Backend

// Vercel production uses the same domain for frontend and backend.
// Local development uses the Vite proxy.

export const BASE_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_BASE_URL || ""
  : "";

// =====================================================
// BASIC API OPERATIONS
// =====================================================

export async function fetchCurrentResults() {
  const res = await fetch(`${BASE_URL}/api/results`);
  if (!res.ok) throw new Error("Failed to fetch current results");
  return res.json();
}

export async function fetchSamples() {
  const res = await fetch(`${BASE_URL}/api/samples`);
  if (!res.ok) throw new Error("Failed to fetch samples");
  return res.json();
}

export async function loadSampleScenario(scenario) {
  const res = await fetch(`${BASE_URL}/api/load-sample/${scenario}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to load ${scenario} scenario`);
  return res.json();
}

export async function uploadCustomImages(formData) {
  const res = await fetch(`${BASE_URL}/api/upload-images`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Image upload failed");
  }

  return res.json();
}

export async function searchSentinelScenes(searchParams) {
  const res = await fetch(`${BASE_URL}/api/sentinel/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(searchParams),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to search Sentinel-2 imagery");
  }

  return res.json();
}

export async function processSentinelScenes(processParams) {
  const res = await fetch(`${BASE_URL}/api/sentinel/process-scenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(processParams),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to process Sentinel-2 scenes");
  }

  return res.json();
}

// =====================================================
// FEATURE 1: CLOUD DETECTION AND MASKING
// =====================================================

export async function runCloudMasking(
  params = {
    target_image: "later",
    cloud_threshold: 0.38,
    shadow_threshold: 0.12,
  },
) {
  const res = await fetch(`${BASE_URL}/api/cloud-masking/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Cloud masking analysis failed");
  return res.json();
}

// =====================================================
// FEATURE 2: MULTI-YEAR ENVIRONMENTAL ANALYSIS
// =====================================================

export async function fetchMultiYearRegions() {
  const res = await fetch(`${BASE_URL}/api/multi-year/regions`);
  if (!res.ok) throw new Error("Failed to fetch multi-year regions");
  return res.json();
}

export async function fetchMultiYearHistory(regionId = "western_ghats") {
  const res = await fetch(
    `${BASE_URL}/api/multi-year/history?region_id=${regionId}`,
  );

  if (!res.ok) throw new Error("Failed to fetch multi-year history");
  return res.json();
}

export async function analyzeMultiYearTimeline(params) {
  const res = await fetch(`${BASE_URL}/api/multi-year/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Multi-year analysis failed");
  return res.json();
}

// =====================================================
// FEATURE 3: ACCURACY ASSESSMENT
// =====================================================

export async function evaluateAccuracy(
  params = { sample_points_per_class: 50 },
) {
  const res = await fetch(`${BASE_URL}/api/accuracy/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Accuracy assessment failed");
  return res.json();
}

export async function uploadCustomValidationPoints(points) {
  const res = await fetch(`${BASE_URL}/api/accuracy/upload-validation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points }),
  });

  if (!res.ok) throw new Error("Validation evaluation failed");
  return res.json();
}

// =====================================================
// FEATURE 4: LAND USE AND LAND COVER CLASSIFICATION
// =====================================================

export async function runLULCClassification(params = {}) {
  const res = await fetch(`${BASE_URL}/api/lulc/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("LULC classification failed");
  return res.json();
}

export async function fetchLULCResults() {
  const res = await fetch(`${BASE_URL}/api/lulc/results`);
  if (!res.ok) throw new Error("Failed to fetch LULC results");
  return res.json();
}

// =====================================================
// FEATURE 5: ENVIRONMENTAL ALERT SYSTEM
// =====================================================

export async function fetchAlerts() {
  const res = await fetch(`${BASE_URL}/api/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function acknowledgeAlert(params) {
  const res = await fetch(`${BASE_URL}/api/alerts/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Failed to update alert");
  return res.json();
}

export async function updateAlertThresholds(thresholds) {
  const res = await fetch(`${BASE_URL}/api/alerts/thresholds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thresholds }),
  });

  if (!res.ok) throw new Error("Failed to update thresholds");
  return res.json();
}

// =====================================================
// CORE OPERATIONS
// =====================================================

export async function runDeforestationAnalysis() {
  const res = await fetch(`${BASE_URL}/api/analyze/deforestation`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Deforestation analysis failed");
  return res.json();
}

export async function runWaterAnalysis() {
  const res = await fetch(`${BASE_URL}/api/analyze/water`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Water analysis failed");
  return res.json();
}

export async function runChangeDetection() {
  const res = await fetch(`${BASE_URL}/api/analyze/change-detection`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Change detection failed");
  return res.json();
}

export async function generatePdfReport() {
  const res = await fetch(`${BASE_URL}/api/generate-report`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Report generation failed");

  const data = await res.json();

  if (data?.download_url && !data.download_url.startsWith("http") && BASE_URL) {
    data.download_url = `${BASE_URL}${data.download_url}`;
  }

  return data;
}

export async function fetchHistory() {
  const res = await fetch(`${BASE_URL}/api/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

// =====================================================
// CUSTOM AOI, HOTSPOTS AND EXTENDED HISTORY APIs
// =====================================================

export async function analyzeCustomAOI(polygonCoords) {
  const res = await fetch(`${BASE_URL}/api/aoi/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ polygon: polygonCoords }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "AOI polygon analysis failed");
  }

  return res.json();
}

export async function fetchDeforestationHotspots() {
  const res = await fetch(`${BASE_URL}/api/hotspots/deforestation`);
  if (!res.ok) throw new Error("Failed to fetch deforestation hotspots");
  return res.json();
}

export async function fetchWaterDepletionHotspots() {
  const res = await fetch(`${BASE_URL}/api/hotspots/water`);
  if (!res.ok) throw new Error("Failed to fetch water depletion hotspots");
  return res.json();
}

export async function saveAnalysisHistory(name, notes) {
  const res = await fetch(`${BASE_URL}/api/history/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, notes }),
  });

  if (!res.ok) throw new Error("Failed to save analysis session to history");
  return res.json();
}

export async function loadAnalysisHistory(recordId) {
  const res = await fetch(`${BASE_URL}/api/history/load/${recordId}`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to load historical session");
  return res.json();
}

export async function deleteAnalysisHistory(recordId) {
  const res = await fetch(`${BASE_URL}/api/history/${recordId}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Failed to delete analysis session");
  return res.json();
}

export async function compareAnalysisHistory(id1, id2) {
  const res = await fetch(`${BASE_URL}/api/history/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id1, id2 }),
  });

  if (!res.ok) throw new Error("Failed to compare historical sessions");
  return res.json();
}

// =====================================================
// AI SATELLITE ASSISTANT / CHATBOT APIs
// =====================================================

export async function analyzeChatbotSingleImage(formData) {
  const res = await fetch(`${BASE_URL}/api/chatbot/analyze-single`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Single satellite image analysis failed");
  }
  return res.json();
}

export async function analyzeChatbotDualImages(formData) {
  const res = await fetch(`${BASE_URL}/api/chatbot/analyze-dual`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Dual satellite image comparison failed");
  }
  return res.json();
}

export async function sendChatbotQuery(params) {
  const res = await fetch(`${BASE_URL}/api/chatbot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Chatbot query failed");
  }
  return res.json();
}

export async function generateChatbotReport(sessionId) {
  const res = await fetch(`${BASE_URL}/api/chatbot/generate-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate AI Assistant report");
  }

  const data = await res.json();
  if (data?.download_url && !data.download_url.startsWith("http") && BASE_URL) {
    data.download_url = `${BASE_URL}${data.download_url}`;
  }
  return data;
}

export async function loadChatbotSample(scenario = "forest") {
  const res = await fetch(`${BASE_URL}/api/chatbot/sample/${scenario}`, {
    method: "POST",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to load ${scenario} sample`);
  }
  return res.json();
}
