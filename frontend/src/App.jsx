import { useState } from 'react'
import PatientForm from './components/PatientForm'
import ResultPanel from './components/ResultPanel'
import ModelComparison from './components/ModelComparison'
import EdaDashboard from './components/EdaDashboard'
import { DEFAULT_VALUES } from './lib/fields'
import { predictRisk } from './lib/api'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('predictor') // 'predictor' | 'models' | 'eda'
  const [activeModel, setActiveModel] = useState('calibrated_random_forest')
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const payload = {}
      for (const [key, val] of Object.entries(values)) {
        payload[key] = val === '' ? 0 : val
      }
      const data = await predictRisk(payload, activeModel)
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Something went wrong.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__brand">
            <span className="app__brand-mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path
                  d="M13 2C13 2 5 11.5 5 16.5C5 21.1944 8.58172 24 13 24C17.4183 24 21 21.1944 21 16.5C21 11.5 13 2 13 2Z"
                  fill="var(--brand)"
                />
              </svg>
            </span>
            <div>
              <h1>DiabetesSense</h1>
              <p className="app__tagline">Explainable diabetes risk screening</p>
            </div>
          </div>

          <nav className="app__nav">
            <button
              className={`app__nav-btn ${activeTab === 'predictor' ? 'app__nav-btn--active' : ''}`}
              onClick={() => setActiveTab('predictor')}
            >
              Risk Predictor
            </button>
            <button
              className={`app__nav-btn ${activeTab === 'models' ? 'app__nav-btn--active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              Model Benchmarks
            </button>
            <button
              className={`app__nav-btn ${activeTab === 'eda' ? 'app__nav-btn--active' : ''}`}
              onClick={() => setActiveTab('eda')}
            >
              Data Analytics & EDA
            </button>
          </nav>
        </div>
      </header>

      <div className="app__disclaimer">
        For education and research only — not a medical device, and not a substitute for professional
        diagnosis or advice.
      </div>

      {activeTab === 'predictor' && (
        <main className="app__main">
          <section className="app__panel app__panel--form">
            <h2>Patient parameters</h2>
            <p className="app__panel-subtitle">
              Adjust the values below, then run the assessment. Active Model: <strong>{activeModel}</strong>
            </p>
            <PatientForm values={values} onChange={setValues} onSubmit={handleSubmit} loading={loading} />
          </section>

          <section className="app__panel app__panel--result">
            <h2>Risk assessment</h2>
            <ResultPanel result={result} loading={loading} error={error} patientValues={values} />
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

      <footer className="app__footer">
        DiabetesSense — an educational/research project. Dataset: UCI Pima Indians Diabetes Database.
      </footer>
    </div>
  )
}
