import axios from 'axios'
import { FALLBACK_METRICS, FALLBACK_EDA } from './fallbackData'

const DEFAULT_BACKEND = 'http://localhost:8000'
export const API_BASE = import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND

const client = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
})

// Quick health check with roundtrip latency
export async function checkHealth() {
  const start = performance.now()
  try {
    const { data } = await client.get('/health')
    const latency = Math.round(performance.now() - start)
    return { ok: true, latency, data }
  } catch (err) {
    // Also try relative /health in case Vite proxy is in play
    try {
      const { data } = await axios.get('/health', { timeout: 3000 })
      const latency = Math.round(performance.now() - start)
      return { ok: true, latency, data }
    } catch {
      return { ok: false, error: err?.message || 'Backend unreachable' }
    }
  }
}

export async function predictRisk(payload, modelName = 'calibrated_random_forest') {
  try {
    const { data } = await client.post(`/predict?model_name=${encodeURIComponent(modelName)}`, payload)
    return { ...data, isOfflineDemo: false }
  } catch (err) {
    // If backend is not running, provide simulation fallback with notice
    if (!err.response) {
      return simulateOfflinePrediction(payload, modelName)
    }
    throw new Error(err?.response?.data?.detail || err.message || 'Prediction failed')
  }
}

export async function predictConsensus(payload) {
  try {
    const { data } = await client.post('/predict-all', payload)
    return { ...data, isOfflineDemo: false }
  } catch (err) {
    if (!err.response) {
      return simulateOfflineConsensus(payload)
    }
    throw new Error(err?.response?.data?.detail || err.message || 'Consensus prediction failed')
  }
}

export async function fetchModelInfo() {
  try {
    const { data } = await client.get('/model-info')
    return data
  } catch (err) {
    console.warn('API unreachable, using offline cached metrics:', err.message)
    return FALLBACK_METRICS
  }
}

export async function fetchModelsList() {
  try {
    const { data } = await client.get('/models')
    return data
  } catch {
    // Build list from fallback metrics
    const list = Object.entries(FALLBACK_METRICS.models || {}).map(([key, item]) => ({
      key,
      name: item.name,
      is_primary: key === 'calibrated_random_forest',
      is_calibrated: key.startsWith('calibrated'),
      accuracy: item.metrics?.accuracy || 0,
      precision: item.metrics?.precision || 0,
      recall: item.metrics?.recall || 0,
      f1_score: item.metrics?.f1_score || 0,
      roc_auc: item.metrics?.roc_auc || 0,
      cv_f1_score: item.cv_f1_score,
    }))
    return {
      primary_model: FALLBACK_METRICS.primary_model || 'Calibrated Random Forest',
      models: list,
    }
  }
}

export async function fetchEdaInfo() {
  try {
    const { data } = await client.get('/eda-info')
    return data
  } catch (err) {
    console.warn('API unreachable, using offline cached EDA summary:', err.message)
    return FALLBACK_EDA
  }
}

// ---------------------------------------------------------------------------
// Client-side simulation fallback when backend is offline
// ---------------------------------------------------------------------------
function simulateOfflinePrediction(values, modelName) {
  // Clinically weighted logistic approximation derived from dataset weights
  const glucose = Number(values.glucose || 120)
  const bmi = Number(values.bmi || 27)
  const age = Number(values.age || 33)
  const dpf = Number(values.diabetes_pedigree_function || 0.5)
  const pregnancies = Number(values.pregnancies || 1)
  const insulin = Number(values.insulin || 80)
  const bp = Number(values.blood_pressure || 72)
  const skin = Number(values.skin_thickness || 20)

  // Weighted z-score calculation
  let z = -4.8
  z += (glucose - 120) * 0.038
  z += (bmi - 27.5) * 0.082
  z += (age - 33) * 0.032
  z += (dpf - 0.47) * 0.95
  z += (pregnancies - 1) * 0.12
  z += (insulin > 150 ? (insulin - 150) * 0.005 : 0)

  const proba = Math.max(0.04, Math.min(0.96, 1 / (1 + Math.exp(-z))))
  const isHigh = proba >= 0.5

  const factors = [
    {
      feature: 'Glucose',
      display_name: 'Glucose (mg/dL)',
      value: glucose,
      shap_value: Number(((glucose - 120) * 0.0022).toFixed(4)),
      impact: glucose >= 120 ? 'increases_risk' : 'decreases_risk',
    },
    {
      feature: 'BMI',
      display_name: 'BMI',
      value: bmi,
      shap_value: Number(((bmi - 27.5) * 0.0035).toFixed(4)),
      impact: bmi >= 27.5 ? 'increases_risk' : 'decreases_risk',
    },
    {
      feature: 'Age',
      display_name: 'Age (years)',
      value: age,
      shap_value: Number(((age - 33) * 0.0018).toFixed(4)),
      impact: age >= 33 ? 'increases_risk' : 'decreases_risk',
    },
    {
      feature: 'DiabetesPedigreeFunction',
      display_name: 'Diabetes Pedigree Function',
      value: dpf,
      shap_value: Number(((dpf - 0.47) * 0.04).toFixed(4)),
      impact: dpf >= 0.47 ? 'increases_risk' : 'decreases_risk',
    },
    {
      feature: 'Pregnancies',
      display_name: 'Pregnancies',
      value: pregnancies,
      shap_value: Number(((pregnancies - 1) * 0.008).toFixed(4)),
      impact: pregnancies >= 2 ? 'increases_risk' : 'decreases_risk',
    },
    {
      feature: 'Insulin',
      display_name: 'Insulin (mu U/mL)',
      value: insulin,
      shap_value: Number(((insulin - 80) * 0.0004).toFixed(4)),
      impact: insulin >= 80 ? 'increases_risk' : 'decreases_risk',
    },
    {
      feature: 'BloodPressure',
      display_name: 'Blood Pressure (mm Hg)',
      value: bp,
      shap_value: Number(((bp - 72) * 0.0006).toFixed(4)),
      impact: bp >= 72 ? 'increases_risk' : 'decreases_risk',
    },
    {
      feature: 'SkinThickness',
      display_name: 'Skin Thickness (mm)',
      value: skin,
      shap_value: Number(((skin - 23) * 0.0002).toFixed(4)),
      impact: skin >= 23 ? 'increases_risk' : 'decreases_risk',
    },
  ]

  const sorted = [...factors].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))

  return {
    model_key: modelName,
    model_used: modelName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ' (Offline Simulation)',
    risk_label: isHigh ? 'HIGH' : 'LOW',
    risk_probability: Number(proba.toFixed(4)),
    confidence: Math.abs(proba - 0.5) > 0.25 ? 'high' : 'moderate',
    top_factors: sorted.slice(0, 4),
    all_factors: sorted,
    disclaimer:
      'DiabetesSense is an educational/research screening tool, not a medical device. Please start the backend service for live model inference.',
    isOfflineDemo: true,
  }
}

function simulateOfflineConsensus(values) {
  const base = simulateOfflinePrediction(values, 'calibrated_random_forest')
  const modelKeys = [
    'calibrated_random_forest',
    'calibrated_xgboost',
    'random_forest',
    'xgboost',
    'logistic_regression',
    'decision_tree',
    'svm',
    'knn',
  ]

  const predictions = modelKeys.map((key, i) => {
    // slight variance per model
    const jitter = ((i % 3) - 1) * 0.04
    const p = Math.max(0.02, Math.min(0.98, base.risk_probability + jitter))
    return {
      model_key: key,
      model_name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      risk_label: p >= 0.5 ? 'HIGH' : 'LOW',
      risk_probability: Number(p.toFixed(4)),
      confidence: Math.abs(p - 0.5) > 0.25 ? 'high' : 'moderate',
      is_calibrated: key.startsWith('calibrated'),
    }
  })

  const highCount = predictions.filter((p) => p.risk_label === 'HIGH').length
  const lowCount = predictions.length - highCount

  return {
    consensus_label: base.risk_label,
    consensus_probability: base.risk_probability,
    consensus_confidence: base.confidence,
    high_risk_count: highCount,
    low_risk_count: lowCount,
    total_models: predictions.length,
    model_predictions: predictions,
    top_factors: base.top_factors,
    all_factors: base.all_factors,
    disclaimer: base.disclaimer,
    isOfflineDemo: true,
  }
}
