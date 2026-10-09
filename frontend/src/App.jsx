import { useState, useEffect, useCallback, useRef } from 'react'
import Logo from './components/Logo'
import HomePage from './components/HomePage'
import PatientForm from './components/PatientForm'
import ResultPanel from './components/ResultPanel'
import ModelComparison from './components/ModelComparison'
import EdaDashboard from './components/EdaDashboard'
import { DEFAULT_VALUES } from './lib/fields'
import { predictRisk, checkHealth, fetchModelsList } from './lib/api'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('home') // 'home' | 'all' | 'predictor' | 'models' | 'eda'
  const [activeModel, setActiveModel] = useState('calibrated_random_forest')
  const [availableModels, setAvailableModels] = useState([])
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoUpdate, setAutoUpdate] = useState(true)

  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('diabetessense_theme') || 'light'
  })

  // API Health status
  const [apiStatus, setApiStatus] = useState({ checked: false, online: false, latency: 0 })
  const [checkingApi, setCheckingApi] = useState(false)

  // Refs for scrolling in all-in-one view
  const predictorRef = useRef(null)
  const modelsRef = useRef(null)
  const edaRef = useRef(null)

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('diabetessense_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

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

    // Run initial prediction immediately so data is ready when navigating to predictor
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollToSection(ref) {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="app" data-theme={theme}>
      {/* Header & Sticky Menu Bar */}
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__brand" onClick={() => handleTabClick('home')} style={{ cursor: 'pointer' }}>
            <Logo size={36} className="app__brand-logo" />
            <div>
              <div className="app__brand-title-row">
                <h1>DiabetesSense</h1>
                <span className="app__version-badge">v2.1 XAI</span>
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
                  ? 'Pinging…'
                  : apiStatus.online
                  ? `API: Live (${apiStatus.latency}ms)`
                  : 'API: Offline'}
              </span>
              <span className="api-refresh-icon">↺</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Light/Dark Theme"
            >
              {theme === 'light' ? (
                <span className="theme-toggle-inner">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span>Dark</span>
                </span>
              ) : (
                <span className="theme-toggle-inner">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span>Light</span>
                </span>
              )}
            </button>

            {/* Navigation Menu Bar */}
            <nav className="app__nav">
              <button
                className={`app__nav-btn ${activeTab === 'home' ? 'app__nav-btn--active' : ''}`}
                onClick={() => handleTabClick('home')}
              >
                🏠 Home
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
                📊 Models
              </button>
              <button
                className={`app__nav-btn ${activeTab === 'eda' ? 'app__nav-btn--active' : ''}`}
                onClick={() => handleTabClick('eda')}
              >
                📈 Analytics & EDA
              </button>
              <button
                className={`app__nav-btn ${activeTab === 'all' ? 'app__nav-btn--active' : ''}`}
                onClick={() => handleTabClick('all')}
              >
                🌟 All-in-One View
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Top Disclaimer */}
      {activeTab !== 'home' && (
        <div className="app__disclaimer">
          <span>
            ⚠️ <strong>Notice:</strong> Educational & research prototype. Predictions based on UCI Pima calibrated models & SHAP interpretability.
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
      )}

      {/* 1. HOME PAGE VIEW */}
      {activeTab === 'home' && <HomePage onNavigate={setActiveTab} />}

      {/* 2. ALL-IN-ONE VIEW */}
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

      {/* 3. FOCUSED RISK PREDICTOR TAB */}
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

      {/* 4. FOCUSED MODEL BENCHMARKS TAB */}
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

      {/* 5. FOCUSED EDA TAB */}
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
          <div className="footer-brand-row">
            <Logo size={22} />
            <span className="footer-title">DiabetesSense Clinical Intelligence</span>
          </div>
          <span>
            Powered by FastAPI, scikit-learn, XGBoost, SHAP & React • UCI Pima Indians Diabetes Database
          </span>
          <span className="footer-sub">
            Educational & Research Screening MVP — Not a Medical Device
          </span>
        </div>
      </footer>
    </div>
  )
}
