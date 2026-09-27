import RiskGauge from './RiskGauge'
import FactorChart from './FactorChart'
import { generatePatientReport } from '../lib/reportGenerator'
import './ResultPanel.css'

export default function ResultPanel({ result, loading, error, patientValues }) {
  if (error) {
    return (
      <div className="result-panel result-panel--empty">
        <p className="result-panel__error-title">Couldn't reach the model</p>
        <p className="result-panel__error-detail">{error}</p>
        <p className="result-panel__error-hint">
          Make sure the FastAPI backend is running (<code>uvicorn api:app --reload</code>) and
          <code>VITE_API_BASE_URL</code> points to it.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="result-panel result-panel--empty">
        <div className="result-panel__spinner" />
        <p>Running the prediction model and computing SHAP contributions…</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="result-panel result-panel--empty">
        <p className="result-panel__empty-title">No assessment yet</p>
        <p className="result-panel__empty-detail">
          Enter the patient's parameters on the left and select <strong>Assess risk</strong> to see a
          prediction with SHAP-based factor explanations.
        </p>
      </div>
    )
  }

  const bandClass =
    result.risk_probability >= 0.5 ? 'high' : result.risk_probability >= 0.3 ? 'moderate' : 'low'

  return (
    <div className="result-panel">
      <div className={`result-panel__headline result-panel__headline--${bandClass}`}>
        <RiskGauge probability={result.risk_probability} label={result.risk_label} />
        <div className="result-panel__headline-text">
          <p className="result-panel__band">
            {bandClass === 'high' ? 'High predicted risk' : bandClass === 'moderate' ? 'Moderate predicted risk' : 'Low predicted risk'}
          </p>
          <p className="result-panel__confidence">
            Model: <strong>{result.model_used || 'Calibrated Random Forest'}</strong> | Confidence: {result.confidence}
          </p>
        </div>
      </div>

      <div className="result-panel__actions">
        <button
          className="result-panel__pdf-btn"
          onClick={() => generatePatientReport(result, patientValues)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Patient Screening PDF
        </button>
      </div>

      <div className="result-panel__section">
        <h3>Top contributing factors</h3>
        <ul className="result-panel__top-factors">
          {result.top_factors.map((f) => (
            <li key={f.feature} className={f.shap_value > 0 ? 'is-up' : 'is-down'}>
              <span className="result-panel__factor-name">{f.display_name}</span>
              <span className="result-panel__factor-value">{f.value}</span>
              <span className="result-panel__factor-arrow">{f.shap_value > 0 ? '↑' : '↓'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="result-panel__section">
        <h3>All factor contributions (SHAP)</h3>
        <FactorChart factors={result.all_factors} />
      </div>

      <p className="result-panel__disclaimer">{result.disclaimer}</p>
    </div>
  )
}
