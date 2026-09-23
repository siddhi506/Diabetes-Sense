import RiskGauge from './RiskGauge'
import FactorChart from './FactorChart'
import './ResultPanel.css'

export default function ResultPanel({ result, loading, error }) {
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
        <p>Running the Random Forest model and computing SHAP contributions…</p>
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
          <p className="result-panel__confidence">Model confidence: {result.confidence}</p>
        </div>
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
