import { useState } from 'react'
import PatientForm from './components/PatientForm'
import ResultPanel from './components/ResultPanel'
import { DEFAULT_VALUES } from './lib/fields'
import { predictRisk } from './lib/api'
import './App.css'

export default function App() {
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
      const data = await predictRisk(payload)
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
        </div>
      </header>

      <div className="app__disclaimer">
        For education and research only — not a medical device, and not a substitute for professional
        diagnosis or advice.
      </div>

      <main className="app__main">
        <section className="app__panel app__panel--form">
          <h2>Patient parameters</h2>
          <p className="app__panel-subtitle">Adjust the values below, then run the assessment.</p>
          <PatientForm values={values} onChange={setValues} onSubmit={handleSubmit} loading={loading} />
        </section>

        <section className="app__panel app__panel--result">
          <h2>Risk assessment</h2>
          <ResultPanel result={result} loading={loading} error={error} />
        </section>
      </main>

      <footer className="app__footer">
        DiabetesSense — an educational/research project. Dataset: UCI Pima Indians Diabetes Database.
      </footer>
    </div>
  )
}
