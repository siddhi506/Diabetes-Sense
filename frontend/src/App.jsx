import { useState, useEffect, useCallback, useRef } from 'react'
import PatientForm from './components/PatientForm'
import ResultPanel from './components/ResultPanel'
import ModelComparison from './components/ModelComparison'
import EdaDashboard from './components/EdaDashboard'
import { DEFAULT_VALUES } from './lib/fields'
import { predictRisk, checkHealth, fetchModelsList } from './lib/api'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'predictor' | 'models' | 'eda'
  const [activeModel, setActiveModel] = useState('calibrated_random_forest')
  const [availableModels, setAvailableModels] = useState([])
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoUpdate, setAutoUpdate] = useState(true)

  // API Health status
  const [apiStatus, setApiStatus] = useState({ checked: false, online: false, latency: 0 })
  const [checkingApi, setCheckingApi] = useState(false)

  // Refs for scrolling in all-in-one view
  const predictorRef = useRef(null)
  const modelsRef = useRef(null)
  const edaRef = useRef(null)

  const verifyApiHealth = useCallback(async () => {
    setCheckingApi(true)
    const health = await checkHealth()
    if (health.ok) {
      setApiStatus({ checked: true, online: true, latency: health.latency })
    } else {
      setApiStatus({ checked: true, online: false, latency: 0 })
    }
    setCheckingApi(false)
  }, [])

  const executePrediction = useCallback(async (currentValues, modelKey) => {
    setLoading(true)
    setError(null)
    try {
      const payload = {}
      for (const [key, val] of Object.entries(currentValues)) {
        payload[key] = val === '' ? 0 : val
      }
      const data = await predictRisk(payload, modelKey)
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Something went wrong.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load: verify health, load models, run initial prediction
  useEffect(() => {
    verifyApiHealth()
    async function loadModels() {
      try {
        const meta = await fetchModelsList()
        if (meta?.models) {
          setAvailableModels(meta.models)
        }
      } catch (e) {
        console.warn('Could not load models list:', e)
      }
    }
    loadModels()

    // Auto-run initial prediction immediately on page load
    executePrediction(values, activeModel)

    // Run health check every 15 seconds
    const interval = setInterval(verifyApiHealth, 15000)
    return () => clearInterval(interval)
  }, [verifyApiHealth, executePrediction])

  // Debounced live assessment on values or model change when autoUpdate is enabled
  useEffect(() => {
    if (!autoUpdate) return
    const timer = setTimeout(() => {
      executePrediction(values, activeModel)
    }, 280)
    return () => clearTimeout(timer)
  }, [values, activeModel, autoUpdate, executePrediction])

  function handleTabClick(tabKey) {
    setActiveTab(tabKey)
    if (tabKey === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function scrollToSection(ref) {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="app">
      {/* Header Bar */}
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__brand">
            <span className="app__brand-mark" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 26 26" fill="none">
                <path
                  d="M13 2C13 2 5 11.5 5 16.5C5 21.1944 8.58172 24 13 24C17.4183 24 21 21.1944 21 16.5C21 11.5 13 2 13 2Z"
                  fill="var(--brand, #2e6f6b)"
                />
                <circle cx="13" cy="16" r="3.5" fill="#ffffff" opacity="0.9" />
              </svg>
            </span>
            <div>
              <div className="app__brand-title-row">
                <h1>DiabetesSense</h1>
                <span className="app__version-badge">v2.1 XAI</span>
                <span className="app__live-badge">⚡ Real-Time Suite</span>
              </div>
              <p className="app__tagline">
                Clinical Screening & Explainable Machine Learning Intelligence
              </p>
            </div>
          </div>

          <div className="app__header-right">
            {/* Live API Health Status Badge */}
            <button
              type="button"
              className={`api-status-pill ${
                apiStatus.online ? 'api-status-pill--online' : 'api-status-pill--offline'
              }`}
              onClick={verifyApiHealth}
              title={
                apiStatus.online
                  ? `Connected to FastAPI Backend (Ping: ${apiStatus.latency}ms). Click to re-check.`
                  : 'Backend offline or unreachable. Click to retry connection.'
              }
            >
              <span className="api-dot" />
              <span className="api-status-text">
                {checkingApi
                  ? 'Pinging API…'
                  : apiStatus.online
                  ? `API: Live (${apiStatus.latency}ms)`
                  : 'API: Offline (Demo Mode)'}
              </span>
              <span className="api-refresh-icon">↺</span>
            </button>

            {/* Navigation Tabs */}
            <nav className="app__nav">
              <button
                className={`app__nav-btn ${activeTab === 'all' ? 'app__nav-btn--active' : ''}`}
                onClick={() => handleTabClick('all')}
              >
                🌟 All-in-One Dashboard
              </button>
              <button
                className={`app__nav-btn ${activeTab === 'predictor' ? 'app__nav-btn--active' : ''}`}
                onClick={() => handleTabClick('predictor')}
              >
                🔬 Risk Predictor
              </button>
              <button
                className={`app__nav-btn ${activeTab === 'models' ? 'app__nav-btn--active' : ''}`}
                onClick={() => handleTabClick('models')}
              >
                📊 Model Benchmarks
              </button>
              <button
                className={`app__nav-btn ${activeTab === 'eda' ? 'app__nav-btn--active' : ''}`}
                onClick={() => handleTabClick('eda')}
              >
                📈 Data Analytics & EDA
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Top Disclaimer & Jump Bar */}
      <div className="app__disclaimer">
        <span>
          ⚠️ <strong>Educational / Research Tool:</strong> Not a certified medical device. Real-time predictions based on UCI Pima calibrated models & SHAP interpretability.
        </span>
        {activeTab === 'all' && (
          <div className="app__jump-links">
            <span className="jump-title">Jump to:</span>
            <button type="button" onClick={() => scrollToSection(predictorRef)} className="jump-btn">
              ↓ 1. Risk Assessment
            </button>
            <button type="button" onClick={() => scrollToSection(modelsRef)} className="jump-btn">
              ↓ 2. Model Suite
            </button>
            <button type="button" onClick={() => scrollToSection(edaRef)} className="jump-btn">
              ↓ 3. Data Analytics & EDA
            </button>
          </div>
        )}
      </div>

      {/* 1. ALL-IN-ONE VIEW: Everything working at once on one unified page */}
      {activeTab === 'all' && (
        <main className="app__main-dashboard">
          {/* SECTION 1: Patient Predictor & Risk Assessment */}
          <section ref={predictorRef} className="dashboard-section">
            <div className="section-super-title">
              <span className="section-num">SECTION 01</span>
              <h3>Patient Parameters & Explainable Risk Screening</h3>
            </div>
            <div className="app__grid-2col">
              <div className="app__panel app__panel--form">
                <div className="panel-header-row">
                  <div>
                    <h2>Clinical Patient Biomarkers</h2>
                    <p className="app__panel-subtitle">
                      Adjust biomarkers or click a clinical preset — predictions update in real-time.
                    </p>
                  </div>
                </div>
                <PatientForm
                  values={values}
                  onChange={setValues}
                  onSubmit={() => executePrediction(values, activeModel)}
                  loading={loading}
                  activeModel={activeModel}
                  onModelChange={setActiveModel}
                  availableModels={availableModels}
                  autoUpdate={autoUpdate}
                  onToggleAutoUpdate={() => setAutoUpdate(!autoUpdate)}
                />
              </div>

              <div className="app__panel app__panel--result">
                <div className="panel-header-row">
                  <div>
                    <h2>Explainable Risk Assessment</h2>
                    <p className="app__panel-subtitle">
                      Calibrated risk gauge, SHAP biomarker explanations & What-If simulator.
                    </p>
                  </div>
                </div>
                <ResultPanel
                  result={result}
                  loading={loading}
                  error={error}
                  patientValues={values}
                  activeModel={activeModel}
                />
              </div>
            </div>
          </section>

          {/* SECTION 2: Model Suite & Benchmarks */}
          <section ref={modelsRef} className="dashboard-section">
            <div className="section-super-title">
              <span className="section-num">SECTION 02</span>
              <h3>ML Model Suite, Benchmarks & Confusion Matrix</h3>
            </div>
            <div className="app__panel">
              <ModelComparison
                activeModel={activeModel}
                onSelectModel={(modelKey) => {
                  setActiveModel(modelKey)
                  executePrediction(values, modelKey)
                  scrollToSection(predictorRef)
                }}
              />
            </div>
          </section>

          {/* SECTION 3: EDA Analytics & Insights */}
          <section ref={edaRef} className="dashboard-section">
            <div className="section-super-title">
              <span className="section-num">SECTION 03</span>
              <h3>Exploratory Data Analytics (EDA) & Global Insights</h3>
            </div>
            <div className="app__panel">
              <EdaDashboard />
            </div>
          </section>
        </main>
      )}

      {/* 2. TABBED VIEWS: Individual focused view modes */}
      {activeTab === 'predictor' && (
        <main className="app__main">
          <section className="app__panel app__panel--form">
            <div className="panel-header-row">
              <div>
                <h2>Clinical Patient Biomarkers</h2>
                <p className="app__panel-subtitle">
                  Configure patient values or choose a clinical preset, then run risk screening.
                </p>
              </div>
            </div>
            <PatientForm
              values={values}
              onChange={setValues}
              onSubmit={() => executePrediction(values, activeModel)}
              loading={loading}
              activeModel={activeModel}
              onModelChange={setActiveModel}
              availableModels={availableModels}
              autoUpdate={autoUpdate}
              onToggleAutoUpdate={() => setAutoUpdate(!autoUpdate)}
            />
          </section>

          <section className="app__panel app__panel--result">
            <div className="panel-header-row">
              <div>
                <h2>Explainable Risk Assessment</h2>
                <p className="app__panel-subtitle">
                  Calibrated probability score with TreeExplainer SHAP factor decomposition.
                </p>
              </div>
            </div>
            <ResultPanel
              result={result}
              loading={loading}
              error={error}
              patientValues={values}
              activeModel={activeModel}
            />
          </section>
        </main>
      )}

      {activeTab === 'models' && (
        <main className="app__main app__main--full">
          <section className="app__panel">
            <ModelComparison
              activeModel={activeModel}
              onSelectModel={(modelKey) => {
                setActiveModel(modelKey)
                executePrediction(values, modelKey)
                setActiveTab('predictor')
              }}
            />
          </section>
        </main>
      )}

      {activeTab === 'eda' && (
        <main className="app__main app__main--full">
          <section className="app__panel">
            <EdaDashboard />
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className="app__footer">
        <div className="footer-content">
          <span>
            <strong>DiabetesSense XAI Prototype</strong> • Powered by FastAPI, scikit-learn, XGBoost, SHAP & React
          </span>
          <span>
            Dataset: UCI Pima Indians Diabetes Database • 5-Fold Stratified Cross-Validation with SMOTE Resampling
          </span>
        </div>
      </footer>
    </div>
  )
}
