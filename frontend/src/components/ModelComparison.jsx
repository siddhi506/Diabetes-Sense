import { useEffect, useState } from 'react'
import { fetchModelInfo } from '../lib/api'
import './ModelComparison.css'

export default function ModelComparison({ activeModel, onSelectModel }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('benchmark') // 'benchmark' | 'resampling'

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const data = await fetchModelInfo()
        setInfo(data)
      } catch (err) {
        setError(err?.response?.data?.detail || err.message || 'Failed to fetch model info')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="mc-loading">
        <div className="mc-spinner" />
        <p>Loading model evaluation & benchmark metrics...</p>
      </div>
    )
  }

  if (error) {
    return <div className="mc-error">Error loading metrics: {error}</div>
  }

  if (!info || !info.models) {
    return <div className="mc-error">No model metrics available. Please train the model suite.</div>
  }

  const modelsList = Object.entries(info.models).map(([key, data]) => ({
    key,
    ...data,
  }))

  // Helper to check max metric value
  const getBestKey = (metricKey) => {
    let maxVal = -1
    let bestKey = ''
    modelsList.forEach((m) => {
      const val = m.metrics ? m.metrics[metricKey] : m[metricKey]
      if (val > maxVal) {
        maxVal = val
        bestKey = m.key
      }
    })
    return bestKey
  }

  const bestAcc = getBestKey('accuracy')
  const bestF1 = getBestKey('f1_score')
  const bestAuc = getBestKey('roc_auc')

  return (
    <div className="model-comparison">
      <div className="mc-header">
        <div>
          <h2 className="mc-title">ML Model Suite & Benchmark Analytics</h2>
          <p className="mc-subtitle">
            Evaluated on UCI Pima Dataset (80/20 train/test split with 5-Fold Stratified CV & SMOTE)
          </p>
        </div>
        <div className="mc-mode-toggle">
          <button
            className={`mc-toggle-btn ${viewMode === 'benchmark' ? 'active' : ''}`}
            onClick={() => setViewMode('benchmark')}
          >
            Model Suite Benchmark
          </button>
          <button
            className={`mc-toggle-btn ${viewMode === 'resampling' ? 'active' : ''}`}
            onClick={() => setViewMode('resampling')}
          >
            SMOTE Imbalance Impact
          </button>
        </div>
      </div>

      {/* Dataset Summary Metrics */}
      <div className="mc-stats-grid">
        <div className="mc-stat-card">
          <span className="mc-stat-label">Dataset Records</span>
          <span className="mc-stat-value">{info.dataset?.n_records || 768}</span>
          <span className="mc-stat-sub">8 Clinical Features</span>
        </div>
        <div className="mc-stat-card">
          <span className="mc-stat-label">SMOTE Resampled Train</span>
          <span className="mc-stat-value">{info.dataset?.resampled_train_size || 800}</span>
          <span className="mc-stat-sub">Balanced 50/50 Class Ratio</span>
        </div>
        <div className="mc-stat-card">
          <span className="mc-stat-label">Validation Strategy</span>
          <span className="mc-stat-value">5-Fold CV</span>
          <span className="mc-stat-sub">Stratified K-Fold</span>
        </div>
        <div className="mc-stat-card">
          <span className="mc-stat-label">Probability Calibration</span>
          <span className="mc-stat-value">Platt Scaling</span>
          <span className="mc-stat-sub">Sigmoid Calibrated</span>
        </div>
      </div>

      {viewMode === 'benchmark' ? (
        <div className="mc-table-container">
          <table className="mc-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1-Score</th>
                <th>ROC-AUC</th>
                <th>5-Fold CV F1</th>
                <th>Action / Status</th>
              </tr>
            </thead>
            <tbody>
              {modelsList.map((m) => {
                const isSelected = activeModel === m.key
                const met = m.metrics || {}

                return (
                  <tr key={m.key} className={isSelected ? 'mc-row--active' : ''}>
                    <td className="mc-model-cell">
                      <span className="mc-model-name">{m.name}</span>
                      {m.key.startsWith('calibrated') && (
                        <span className="mc-badge mc-badge--calibrated">Calibrated</span>
                      )}
                    </td>
                    <td>
                      <span className={`mc-metric-val ${m.key === bestAcc ? 'mc-best' : ''}`}>
                        {(met.accuracy * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>{(met.precision * 100).toFixed(1)}%</td>
                    <td>{(met.recall * 100).toFixed(1)}%</td>
                    <td>
                      <span className={`mc-metric-val ${m.key === bestF1 ? 'mc-best' : ''}`}>
                        {met.f1_score?.toFixed(3)}
                      </span>
                    </td>
                    <td>
                      <span className={`mc-metric-val ${m.key === bestAuc ? 'mc-best' : ''}`}>
                        {met.roc_auc?.toFixed(3)}
                      </span>
                    </td>
                    <td>
                      <span className="mc-cv-tag">{m.cv_f1_score ? m.cv_f1_score.toFixed(3) : 'N/A'}</span>
                    </td>
                    <td>
                      <button
                        className={`mc-select-btn ${isSelected ? 'mc-select-btn--active' : ''}`}
                        onClick={() => onSelectModel(m.key)}
                      >
                        {isSelected ? 'Active Model' : 'Use Model'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mc-table-container">
          <div className="mc-resample-note">
            Comparison showing model test performance <strong>before SMOTE</strong> vs <strong>after SMOTE resampling</strong>. Notice the significant improvement in <strong>Recall</strong> and <strong>F1-Score</strong> on imbalanced data.
          </div>
          <table className="mc-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>SMOTE State</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall (Sens.)</th>
                <th>F1-Score</th>
                <th>ROC-AUC</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(info.resampling_comparison || {}).map(([key, data]) => {
                const pre = data.pre_smote || {}
                const post = data.post_smote || {}
                return (
                  <tr key={key} className="mc-resample-group">
                    <td className="mc-model-cell" rowSpan="2">
                      <span className="mc-model-name">{data.name}</span>
                    </td>
                    <td><span className="mc-tag mc-tag--pre">Before SMOTE</span></td>
                    <td>{(pre.accuracy * 100).toFixed(1)}%</td>
                    <td>{(pre.precision * 100).toFixed(1)}%</td>
                    <td>{(pre.recall * 100).toFixed(1)}%</td>
                    <td>{pre.f1_score?.toFixed(3)}</td>
                    <td>{pre.roc_auc?.toFixed(3)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Hyperparameter details expandable card */}
      <div className="mc-params-card">
        <h3>Hyperparameter Tuning Results (GridSearchCV)</h3>
        <div className="mc-params-grid">
          {modelsList.map((m) => (
            <div key={m.key} className="mc-param-item">
              <div className="mc-param-title">{m.name}</div>
              <div className="mc-param-code">
                {m.best_params ? JSON.stringify(m.best_params, null, 2) : 'Default settings'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
