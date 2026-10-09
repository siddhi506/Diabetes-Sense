import { useState } from 'react'
import RiskGauge from './RiskGauge'
import FactorChart from './FactorChart'
import { generatePatientReport } from '../lib/reportGenerator'
import { predictRisk, predictConsensus } from '../lib/api'
import './ResultPanel.css'

export default function ResultPanel({
  result,
  loading,
  error,
  patientValues,
  activeModel,
}) {
  const [whatIfAdjustments, setWhatIfAdjustments] = useState({ glucoseDelta: 0, bmiDelta: 0 })
  const [whatIfResult, setWhatIfResult] = useState(null)
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [consensusData, setConsensusData] = useState(null)
  const [consensusLoading, setConsensusLoading] = useState(false)
  const [showAllFactors, setShowAllFactors] = useState(false)

  if (error) {
    return (
      <div className="result-panel result-panel--empty">
        <div className="result-panel__error-icon">⚠️</div>
        <p className="result-panel__error-title">Couldn't reach the model</p>
        <p className="result-panel__error-detail">{error}</p>
        <p className="result-panel__error-hint">
          Ensure the FastAPI backend is running via <code>uvicorn api:app --reload</code> on port 8000.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="result-panel result-panel--empty">
        <div className="result-panel__spinner" />
        <p className="result-panel__loading-text">
          Evaluating patient vectors & computing SHAP feature contributions…
        </p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="result-panel result-panel--empty">
        <div className="result-panel__empty-icon">🩺</div>
        <p className="result-panel__empty-title">Ready for Clinical Assessment</p>
        <p className="result-panel__empty-detail">
          Adjust the patient clinical parameters on the left or select a <strong>Clinical Profile</strong> preset, then click <strong>Run Clinical Risk Assessment</strong>.
        </p>
      </div>
    )
  }

  const prob = result.risk_probability
  const bandClass = prob >= 0.5 ? 'high' : prob >= 0.3 ? 'moderate' : 'low'

  // Counterfactual What-If calculation
  async function runWhatIfSimulation(newGlucoseDelta, newBmiDelta) {
    setWhatIfAdjustments({ glucoseDelta: newGlucoseDelta, bmiDelta: newBmiDelta })
    setWhatIfLoading(true)
    try {
      const simulatedValues = {
        ...patientValues,
        glucose: Math.max(40, (patientValues.glucose || 110) + newGlucoseDelta),
        bmi: Math.max(15, Number(((patientValues.bmi || 27) + newBmiDelta).toFixed(1))),
      }
      const simRes = await predictRisk(simulatedValues, activeModel)
      setWhatIfResult(simRes)
    } catch {
      // ignore
    } finally {
      setWhatIfLoading(false)
    }
  }

  // Multi-model consensus trigger
  async function handleFetchConsensus() {
    setConsensusLoading(true)
    try {
      const data = await predictConsensus(patientValues)
      setConsensusData(data)
    } catch (err) {
      console.error('Consensus failed', err)
    } finally {
      setConsensusLoading(false)
    }
  }

  return (
    <div className="result-panel">
      {/* Offline Demo Warning Notice if backend was unreachable */}
      {result.isOfflineDemo && (
        <div className="result-panel__demo-banner">
          <span>ℹ️ <strong>Demo Simulation Mode:</strong> Backend not detected on port 8000. Displaying simulated clinical heuristics. Start Uvicorn for live machine learning inference.</span>
        </div>
      )}

      {/* Main Risk Gauge Banner */}
      <div className={`result-panel__headline result-panel__headline--${bandClass}`}>
        <RiskGauge probability={result.risk_probability} label={result.risk_label} />
        <div className="result-panel__headline-text">
          <span className={`result-tier-pill result-tier-pill--${bandClass}`}>
            {result.risk_label === 'HIGH' ? 'High Risk Tier (≥50%)' : bandClass === 'moderate' ? 'Moderate Risk Tier (30-49%)' : 'Low Risk Tier (<30%)'}
          </span>
          <p className="result-panel__band">
            {bandClass === 'high'
              ? 'Elevated Predicted Risk'
              : bandClass === 'moderate'
              ? 'Borderline / Moderate Risk'
              : 'Low Predicted Risk'}
          </p>
          <p className="result-panel__confidence">
            Engine: <strong>{result.model_used || 'Calibrated Random Forest'}</strong> &nbsp;•&nbsp; Confidence:{' '}
            <strong className="capitalize">{result.confidence}</strong>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="result-panel__actions">
        <button
          type="button"
          className="result-panel__pdf-btn"
          onClick={() => generatePatientReport(result, patientValues)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Screening PDF Report
        </button>

        <button
          type="button"
          className="result-panel__consensus-btn"
          onClick={handleFetchConsensus}
          disabled={consensusLoading}
        >
          {consensusLoading ? 'Querying 8 Models…' : '⚖ Compare Across All 8 Models'}
        </button>
      </div>

      {/* Multi-Model Consensus Card (Expandable) */}
      {consensusData && (
        <div className="result-panel__consensus-card">
          <div className="consensus-card__header">
            <h4>Ensemble Agreement Across 8 Trained Models</h4>
            <span className="consensus-badge">
              {consensusData.high_risk_count} of {consensusData.total_models} models predict HIGH risk
            </span>
          </div>
          <div className="consensus-bar-wrapper">
            <div
              className="consensus-bar consensus-bar--high"
              style={{ width: `${(consensusData.high_risk_count / consensusData.total_models) * 100}%` }}
              title={`High Risk: ${consensusData.high_risk_count}`}
            />
            <div
              className="consensus-bar consensus-bar--low"
              style={{ width: `${(consensusData.low_risk_count / consensusData.total_models) * 100}%` }}
              title={`Low Risk: ${consensusData.low_risk_count}`}
            />
          </div>
          <div className="consensus-models-grid">
            {consensusData.model_predictions.map((mp) => (
              <div key={mp.model_key} className="consensus-model-item">
                <span className="consensus-m-name">{mp.model_name}</span>
                <span className={`consensus-m-val ${mp.risk_label === 'HIGH' ? 'is-high' : 'is-low'}`}>
                  {(mp.risk_probability * 100).toFixed(1)}% ({mp.risk_label})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top SHAP Contributing Factors */}
      <div className="result-panel__section">
        <div className="section-title-row">
          <h3>Key Clinical Drivers for this Patient</h3>
          <span className="section-sub-tag">Local SHAP Values</span>
        </div>
        <ul className="result-panel__top-factors">
          {result.top_factors.map((f) => {
            const isUp = f.shap_value > 0
            return (
              <li key={f.feature} className={isUp ? 'is-up' : 'is-down'}>
                <div className="factor-info">
                  <span className="result-panel__factor-name">{f.display_name}</span>
                  <span className="result-panel__factor-value">Observed: {f.value}</span>
                </div>
                <div className="factor-badge-group">
                  <span className={`factor-impact-tag ${isUp ? 'impact-up' : 'impact-down'}`}>
                    {isUp ? `+${f.shap_value.toFixed(3)} (Pushes Risk Up)` : `${f.shap_value.toFixed(3)} (Pushes Risk Down)`}
                  </span>
                  <span className="result-panel__factor-arrow">{isUp ? '▲' : '▼'}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* What-If Counterfactual Intervention Simulator */}
      <div className="result-panel__what-if-card">
        <div className="what-if-header">
          <div>
            <h4>💡 "What-If" Counterfactual Intervention Simulation</h4>
            <p>Simulate how targeted clinical lifestyle interventions would alter this patient's predicted risk:</p>
          </div>
        </div>

        <div className="what-if-buttons">
          <button
            type="button"
            className={`what-if-btn ${whatIfAdjustments.glucoseDelta === -30 ? 'active' : ''}`}
            onClick={() => runWhatIfSimulation(-30, 0)}
          >
            📉 Lower Glucose by -30 mg/dL
          </button>
          <button
            type="button"
            className={`what-if-btn ${whatIfAdjustments.bmiDelta === -4 ? 'active' : ''}`}
            onClick={() => runWhatIfSimulation(0, -4)}
          >
            🏃 Reduce BMI by -4 kg/m²
          </button>
          <button
            type="button"
            className={`what-if-btn ${whatIfAdjustments.glucoseDelta === -30 && whatIfAdjustments.bmiDelta === -4 ? 'active' : ''}`}
            onClick={() => runWhatIfSimulation(-30, -4)}
          >
            ⭐ Combined Lifestyle Intervention
          </button>
          {(whatIfAdjustments.glucoseDelta !== 0 || whatIfAdjustments.bmiDelta !== 0) && (
            <button
              type="button"
              className="what-if-btn what-if-btn--reset"
              onClick={() => {
                setWhatIfAdjustments({ glucoseDelta: 0, bmiDelta: 0 })
                setWhatIfResult(null)
              }}
            >
              ↺ Reset
            </button>
          )}
        </div>

        {whatIfLoading && <p className="what-if-sub">Recalculating intervention probability…</p>}

        {whatIfResult && !whatIfLoading && (
          <div className="what-if-result-box">
            <span className="what-if-label">Projected Outcome After Intervention:</span>
            <div className="what-if-stats">
              <span className="what-if-old">Current: {(result.risk_probability * 100).toFixed(1)}%</span>
              <span className="what-if-arrow">➜</span>
              <span className="what-if-new">
                Simulated: <strong>{(whatIfResult.risk_probability * 100).toFixed(1)}%</strong>
              </span>
              <span className="what-if-delta">
                ({(whatIfResult.risk_probability - result.risk_probability) * 100 <= 0 ? '' : '+'}
                {((whatIfResult.risk_probability - result.risk_probability) * 100).toFixed(1)}% change)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SHAP Chart Breakdown */}
      <div className="result-panel__section">
        <div className="section-title-row">
          <h3>Full SHAP Explanatory Profile</h3>
          <button
            type="button"
            className="toggle-all-factors-btn"
            onClick={() => setShowAllFactors(!showAllFactors)}
          >
            {showAllFactors ? 'Show Top 4' : 'View All 8 Clinical Features'}
          </button>
        </div>
        <FactorChart factors={showAllFactors ? result.all_factors : result.top_factors} />
      </div>

      {/* Clinical Guidance Box */}
      <div className="result-panel__guidance">
        <h4>Personalized Clinical Triage Guidance</h4>
        <ul>
          {prob >= 0.5 ? (
            <>
              <li>Schedule laboratory diagnostic HbA1c and oral glucose tolerance evaluation.</li>
              <li>Evaluate cardiovascular lipid panel and blood pressure history with physician.</li>
              <li>Establish structured nutritional plan targeting glycemic index reduction.</li>
            </>
          ) : prob >= 0.3 ? (
            <>
              <li>Conduct follow-up fasting plasma glucose test within 3 to 6 months.</li>
              <li>Adopt regular cardiovascular activity (target: 150 min/week moderate intensity).</li>
              <li>Maintain healthy BMI and monitor family pedigree predispositions.</li>
            </>
          ) : (
            <>
              <li>Parameters reflect low short-term predicted probability of diabetes.</li>
              <li>Maintain routine periodic screening and wholesome nutritional habits.</li>
            </>
          )}
        </ul>
      </div>

      <p className="result-panel__disclaimer">{result.disclaimer}</p>
    </div>
  )
}
