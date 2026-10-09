import { useEffect, useState, Fragment } from 'react'
import { fetchModelInfo } from '../lib/api'
import './ModelComparison.css'

export default function ModelComparison({ activeModel, onSelectModel }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('benchmark') // 'benchmark' | 'resampling' | 'confusion'
  const [selectedInspectKey, setSelectedInspectKey] = useState(activeModel || 'calibrated_random_forest')
  const [sortField, setSortField] = useState('f1_score')

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

  const rawModelsList = Object.entries(info.models).map(([key, data]) => ({
    key,
    ...data,
  }))

  // Sortable list
  const modelsList = [...rawModelsList].sort((a, b) => {
    const valA = a.metrics?.[sortField] ?? a[sortField] ?? 0
    const valB = b.metrics?.[sortField] ?? b[sortField] ?? 0
    return valB - valA
  })

  // Helper to check max metric value
  const getBestKey = (metricKey) => {
    let maxVal = -1
    let bestKey = ''
    rawModelsList.forEach((m) => {
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

  const inspectedModel = info.models[selectedInspectKey] || info.models['calibrated_random_forest'] || {}
  const cm = inspectedModel.metrics?.confusion_matrix || [[0, 0], [0, 0]]
  const tn = cm[0]?.[0] || 0
  const fp = cm[0]?.[1] || 0
  const fn = cm[1]?.[0] || 0
  const tp = cm[1]?.[1] || 0
  const totalCases = tn + fp + fn + tp || 1
  const sensitivity = tp / (tp + fn || 1)
  const specificity = tn / (tn + fp || 1)

  return (
    <div className="model-comparison">
      <div className="mc-header">
        <div>
          <h2 className="mc-title">ML Model Suite & Benchmark Analytics</h2>
          <p className="mc-subtitle">
            Comprehensive evaluation on UCI Pima Dataset (80/20 train/test split, 5-Fold Stratified CV, SMOTE Resampling)
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
          <button
            className={`mc-toggle-btn ${viewMode === 'confusion' ? 'active' : ''}`}
            onClick={() => setViewMode('confusion')}
          >
            Confusion Matrix Inspector
          </button>
        </div>
      </div>

      {/* Dataset Summary Metrics Cards */}
      <div className="mc-stats-grid">
        <div className="mc-stat-card">
          <span className="mc-stat-label">Dataset Records</span>
          <span className="mc-stat-value">{info.dataset?.n_records || 768}</span>
          <span className="mc-stat-sub">8 Clinical Features • UCI Pima</span>
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

      {viewMode === 'benchmark' && (
        <div className="mc-table-container">
          <div className="mc-table-toolbar">
            <span className="mc-sort-label">Sort By:</span>
            <div className="mc-sort-chips">
              {['f1_score', 'accuracy', 'roc_auc', 'recall', 'precision'].map((field) => (
                <button
                  key={field}
                  className={`mc-sort-chip ${sortField === field ? 'active' : ''}`}
                  onClick={() => setSortField(field)}
                >
                  {field === 'f1_score' ? 'F1-Score' : field === 'roc_auc' ? 'ROC-AUC' : field.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <table className="mc-table">
            <thead>
              <tr>
                <th>Model Name</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1-Score</th>
                <th>ROC-AUC</th>
                <th>5-Fold CV F1</th>
                <th>Action</th>
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
                      {m.key === 'calibrated_random_forest' && (
                        <span className="mc-badge mc-badge--primary">Primary</span>
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
                      <div className="mc-actions-cell">
                        <button
                          className={`mc-select-btn ${isSelected ? 'mc-select-btn--active' : ''}`}
                          onClick={() => onSelectModel(m.key)}
                        >
                          {isSelected ? '✓ Active' : 'Use in Predictor'}
                        </button>
                        <button
                          className="mc-inspect-btn"
                          title="Inspect Confusion Matrix"
                          onClick={() => {
                            setSelectedInspectKey(m.key)
                            setViewMode('confusion')
                          }}
                        >
                          🔍
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'resampling' && (
        <div className="mc-table-container">
          <div className="mc-resample-note">
            Comparison showing model test performance <strong>before SMOTE</strong> vs{' '}
            <strong>after SMOTE resampling</strong>. Notice the marked improvement in <strong>Recall (Sensitivity)</strong> and{' '}
            <strong>F1-Score</strong> on imbalanced medical cohorts.
          </div>
          <table className="mc-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>SMOTE State</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall (Sensitivity)</th>
                <th>F1-Score</th>
                <th>ROC-AUC</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(info.resampling_comparison || {}).map(([key, data]) => {
                const pre = data.pre_smote || {}
                const post = data.post_smote || {}
                return (
                  <Fragment key={key}>
                    <tr className="mc-resample-group">
                      <td className="mc-model-cell" rowSpan={2}>
                        <span className="mc-model-name">{data.name}</span>
                      </td>
                      <td>
                        <span className="mc-tag mc-tag--pre">Before SMOTE</span>
                      </td>
                      <td>{(pre.accuracy * 100).toFixed(1)}%</td>
                      <td>{(pre.precision * 100).toFixed(1)}%</td>
                      <td>{(pre.recall * 100).toFixed(1)}%</td>
                      <td>{pre.f1_score?.toFixed(3)}</td>
                      <td>{pre.roc_auc?.toFixed(3)}</td>
                    </tr>
                    <tr className="mc-resample-group mc-resample-group--post">
                      <td>
                        <span className="mc-tag mc-tag--post">After SMOTE</span>
                      </td>
                      <td>
                        <strong>{(post.accuracy * 100).toFixed(1)}%</strong>
                      </td>
                      <td>{(post.precision * 100).toFixed(1)}%</td>
                      <td>
                        <strong className="mc-highlight-gain">{(post.recall * 100).toFixed(1)}%</strong>
                      </td>
                      <td>
                        <strong className="mc-highlight-gain">{post.f1_score?.toFixed(3)}</strong>
                      </td>
                      <td>{post.roc_auc?.toFixed(3)}</td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'confusion' && (
        <div className="mc-confusion-container">
          <div className="mc-confusion-picker">
            <label htmlFor="inspect-select">Select Model to Inspect:</label>
            <select
              id="inspect-select"
              value={selectedInspectKey}
              onChange={(e) => setSelectedInspectKey(e.target.value)}
              className="mc-select-dropdown"
            >
              {rawModelsList.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mc-confusion-content">
            <div className="mc-matrix-card">
              <h4>Test Set Confusion Matrix (N = {totalCases})</h4>
              <div className="mc-matrix-grid">
                <div className="mc-matrix-header">Predicted Negative (0)</div>
                <div className="mc-matrix-header">Predicted Positive (1)</div>

                <div className="mc-matrix-cell mc-matrix-cell--tn">
                  <span className="cm-count">{tn}</span>
                  <span className="cm-label">True Negative (TN)</span>
                  <span className="cm-sub">{((tn / totalCases) * 100).toFixed(1)}%</span>
                </div>

                <div className="mc-matrix-cell mc-matrix-cell--fp">
                  <span className="cm-count">{fp}</span>
                  <span className="cm-label">False Positive (FP)</span>
                  <span className="cm-sub">{((fp / totalCases) * 100).toFixed(1)}%</span>
                </div>

                <div className="mc-matrix-cell mc-matrix-cell--fn">
                  <span className="cm-count">{fn}</span>
                  <span className="cm-label">False Negative (FN)</span>
                  <span className="cm-sub">{((fn / totalCases) * 100).toFixed(1)}%</span>
                </div>

                <div className="mc-matrix-cell mc-matrix-cell--tp">
                  <span className="cm-count">{tp}</span>
                  <span className="cm-label">True Positive (TP)</span>
                  <span className="cm-sub">{((tp / totalCases) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="mc-diag-stats">
              <h4>Clinical Diagnostic Statistics</h4>
              <div className="mc-diag-item">
                <span>Sensitivity / Recall:</span>
                <strong>{(sensitivity * 100).toFixed(1)}%</strong>
              </div>
              <div className="mc-diag-item">
                <span>Specificity:</span>
                <strong>{(specificity * 100).toFixed(1)}%</strong>
              </div>
              <div className="mc-diag-item">
                <span>Test Accuracy:</span>
                <strong>{((inspectedModel.metrics?.accuracy || 0) * 100).toFixed(1)}%</strong>
              </div>
              <div className="mc-diag-item">
                <span>ROC-AUC Score:</span>
                <strong>{(inspectedModel.metrics?.roc_auc || 0).toFixed(3)}</strong>
              </div>
              <div className="mc-diag-item">
                <span>F1-Score:</span>
                <strong>{(inspectedModel.metrics?.f1_score || 0).toFixed(3)}</strong>
              </div>
              <button
                type="button"
                className="mc-select-btn mc-select-btn--full"
                onClick={() => onSelectModel(selectedInspectKey)}
              >
                Set {inspectedModel.name} as Active Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hyperparameter details expandable card */}
      <div className="mc-params-card">
        <h3>Hyperparameter Tuning Results (5-Fold Stratified GridSearchCV)</h3>
        <div className="mc-params-grid">
          {rawModelsList.map((m) => (
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
