import { useEffect, useState } from 'react'
import { fetchEdaInfo } from '../lib/api'
import './EdaDashboard.css'

export default function EdaDashboard() {
  const [eda, setEda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFeature, setSelectedFeature] = useState('Glucose')
  const [selectedCell, setSelectedCell] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const data = await fetchEdaInfo()
        setEda(data)
      } catch (err) {
        setError(err?.response?.data?.detail || err.message || 'Failed to load EDA data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="eda-loading">
        <div className="eda-spinner" />
        <p>Loading Exploratory Data Analytics (EDA)...</p>
      </div>
    )
  }

  if (error || !eda) {
    return <div className="eda-error">Error loading EDA metrics: {error || 'No data found'}</div>
  }

  const { correlation_matrix, distributions, boxplots, global_shap, feature_display } = eda
  const selectedDist = distributions[selectedFeature] || []
  const selectedBox = boxplots[selectedFeature] || {}

  // Max count for distribution scaling
  const maxCount = Math.max(
    ...selectedDist.flatMap((d) => [d.non_diabetic, d.diabetic]),
    1
  )

  // Max SHAP for bar scaling
  const maxShap = Math.max(...global_shap.map((s) => s.importance), 0.01)

  // Helper for Correlation Heatmap Color
  const getCorrBg = (val) => {
    if (val === 1) return 'var(--bg-subtle)'
    const absVal = Math.abs(val)
    if (val > 0) {
      // Teal for positive correlation
      return `rgba(13, 148, 136, ${Math.min(absVal * 1.5, 0.85)})`
    } else {
      // Rose for negative correlation
      return `rgba(225, 29, 72, ${Math.min(absVal * 1.5, 0.85)})`
    }
  }

  const getCorrTextColor = (val) => {
    if (val === 1) return 'var(--ink-soft)'
    return Math.abs(val) > 0.35 ? '#ffffff' : 'var(--ink)'
  }

  return (
    <div className="eda-dashboard">
      <div className="eda-header">
        <div>
          <h2 className="eda-title">Exploratory Data Analysis & Global Model Insights</h2>
          <p className="eda-subtitle">
            Statistical distributions, Pearson correlation matrices, outlier analysis, and global TreeExplainer SHAP rankings
          </p>
        </div>
      </div>

      {/* Clinical Insights Executive Summary */}
      <div className="eda-insights-grid">
        <div className="eda-insight-card">
          <span className="insight-badge">#1 Clinical Predictor</span>
          <h4>Plasma Glucose</h4>
          <p>Highest SHAP global importance (0.106) and highest positive linear correlation (+0.47) with diabetes outcome.</p>
        </div>
        <div className="eda-insight-card">
          <span className="insight-badge">Strongest Inter-Correlation</span>
          <h4>Age & Pregnancies</h4>
          <p>Strong positive co-linearity (r = 0.54). Older patients in the cohort exhibit higher parity counts.</p>
        </div>
        <div className="eda-insight-card">
          <span className="insight-badge">Data Imbalance Handling</span>
          <h4>SMOTE Resampling</h4>
          <p>Pima baseline had 65.1% non-diabetic vs 34.9% diabetic. SMOTE balanced training classes to 50/50 ratio.</p>
        </div>
        <div className="eda-insight-card">
          <span className="insight-badge">Physiological Imputation</span>
          <h4>Zero-As-Missing Median</h4>
          <p>Zeros in Glucose, BP, Skin, Insulin, and BMI represent unrecorded measurements replaced with cohort medians.</p>
        </div>
      </div>

      {/* 1. Global SHAP Feature Importance */}
      <div className="eda-card">
        <div className="eda-card-header">
          <div>
            <h3>Global SHAP Feature Importance</h3>
            <p className="eda-card-desc">
              Mean absolute SHAP value across all 768 patient records quantifying each biomarker's global predictive leverage.
            </p>
          </div>
          <span className="eda-badge">TreeExplainer Mean |SHAP|</span>
        </div>

        <div className="eda-shap-list">
          {global_shap.map((item, idx) => {
            const pct = (item.importance / maxShap) * 100
            return (
              <div key={item.feature} className="eda-shap-item">
                <div className="eda-shap-label">
                  <span className="eda-shap-rank">#{idx + 1}</span>
                  <span className="eda-shap-name">{item.display_name}</span>
                </div>
                <div className="eda-shap-bar-wrapper">
                  <div className="eda-shap-bar" style={{ width: `${pct}%` }} />
                  <span className="eda-shap-val">{item.importance.toFixed(4)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Correlation Matrix Heatmap */}
      <div className="eda-card">
        <div className="eda-card-header">
          <div>
            <h3>Inter-Feature Pearson Correlation Heatmap</h3>
            <p className="eda-card-desc">
              Click any cell to examine pairwise statistical association between clinical variables.
            </p>
          </div>
          <span className="eda-badge">Normalized [-1.00 to +1.00]</span>
        </div>

        {selectedCell && (
          <div className="eda-cell-inspector">
            <strong>Pair:</strong> {selectedCell.row} ↔ {selectedCell.col} &nbsp;|&nbsp;{' '}
            <strong>Pearson r:</strong> {selectedCell.val.toFixed(3)} ({selectedCell.val > 0.4 ? 'Moderate-to-Strong Positive' : selectedCell.val > 0 ? 'Mild Positive' : 'Mild Negative'})
          </div>
        )}

        <div className="eda-heatmap-wrapper">
          <table className="eda-heatmap">
            <thead>
              <tr>
                <th>Feature</th>
                {correlation_matrix.columns.map((col) => (
                  <th key={col}>{col === 'DiabetesPedigreeFunction' ? 'DPF' : col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {correlation_matrix.columns.map((rowCol, rIdx) => (
                <tr key={rowCol}>
                  <td className="eda-heatmap-row-header">
                    {rowCol === 'DiabetesPedigreeFunction' ? 'DPF' : rowCol}
                  </td>
                  {correlation_matrix.values[rIdx].map((val, cIdx) => (
                    <td
                      key={cIdx}
                      className="eda-heatmap-cell"
                      style={{
                        backgroundColor: getCorrBg(val),
                        color: getCorrTextColor(val),
                      }}
                      onClick={() =>
                        setSelectedCell({
                          row: rowCol,
                          col: correlation_matrix.columns[cIdx],
                          val,
                        })
                      }
                      title={`${rowCol} vs ${correlation_matrix.columns[cIdx]}: ${val.toFixed(2)}`}
                    >
                      {val.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Feature Distribution & Binned Visualizer */}
      <div className="eda-card">
        <div className="eda-card-header flex-between">
          <div>
            <h3>Feature Distribution (Diabetic vs Non-Diabetic Cohorts)</h3>
            <p className="eda-card-desc">
              Compare value frequency density between non-diabetic (Outcome=0) and diabetic (Outcome=1) patient cohorts.
            </p>
          </div>
          <div className="eda-selector-group">
            <label htmlFor="feat-select">Biomarker:</label>
            <select
              id="feat-select"
              className="eda-select"
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
            >
              {Object.keys(feature_display).map((f) => (
                <option key={f} value={f}>
                  {feature_display[f]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="eda-dist-chart">
          <div className="eda-legend">
            <span className="eda-legend-item">
              <span className="eda-dot eda-dot--non" /> Non-Diabetic Cohort (Outcome = 0)
            </span>
            <span className="eda-legend-item">
              <span className="eda-dot eda-dot--dia" /> Diabetic Cohort (Outcome = 1)
            </span>
          </div>

          <div className="eda-bars-container">
            {selectedDist.map((d, i) => {
              const nonPct = (d.non_diabetic / maxCount) * 100
              const diaPct = (d.diabetic / maxCount) * 100
              return (
                <div key={i} className="eda-bar-group">
                  <div className="eda-bars-pair">
                    <div
                      className="eda-bar eda-bar--non"
                      style={{ height: `${Math.max(nonPct, 2)}%` }}
                      title={`Non-diabetic: ${d.non_diabetic} patients`}
                    />
                    <div
                      className="eda-bar eda-bar--dia"
                      style={{ height: `${Math.max(diaPct, 2)}%` }}
                      title={`Diabetic: ${d.diabetic} patients`}
                    />
                  </div>
                  <span className="eda-bin-label">{d.bin}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Outlier & Boxplot Quartile Statistics */}
      <div className="eda-card">
        <div className="eda-card-header">
          <div>
            <h3>Quartile Spread & Outlier Analysis for {feature_display[selectedFeature]}</h3>
            <p className="eda-card-desc">
              Interquartile range (IQR), median, min-max boundaries, and extreme clinical outliers per cohort.
            </p>
          </div>
        </div>

        <div className="eda-stats-grid">
          <div className="eda-stat-box">
            <h4>Non-Diabetic Cohort (Outcome = 0)</h4>
            <div className="eda-stat-rows">
              <div>
                <span>Median:</span> <strong>{selectedBox['0']?.median}</strong>
              </div>
              <div>
                <span>Q1 (25th Percentile):</span> <strong>{selectedBox['0']?.q1}</strong>
              </div>
              <div>
                <span>Q3 (75th Percentile):</span> <strong>{selectedBox['0']?.q3}</strong>
              </div>
              <div>
                <span>Min – Max Range:</span>{' '}
                <strong>
                  {selectedBox['0']?.min} – {selectedBox['0']?.max}
                </strong>
              </div>
              <div>
                <span>Outliers Flagged:</span>{' '}
                <strong className="eda-outlier">{selectedBox['0']?.outlier_count} patients</strong>
              </div>
            </div>
          </div>

          <div className="eda-stat-box eda-stat-box--dia">
            <h4>Diabetic Cohort (Outcome = 1)</h4>
            <div className="eda-stat-rows">
              <div>
                <span>Median:</span> <strong>{selectedBox['1']?.median}</strong>
              </div>
              <div>
                <span>Q1 (25th Percentile):</span> <strong>{selectedBox['1']?.q1}</strong>
              </div>
              <div>
                <span>Q3 (75th Percentile):</span> <strong>{selectedBox['1']?.q3}</strong>
              </div>
              <div>
                <span>Min – Max Range:</span>{' '}
                <strong>
                  {selectedBox['1']?.min} – {selectedBox['1']?.max}
                </strong>
              </div>
              <div>
                <span>Outliers Flagged:</span>{' '}
                <strong className="eda-outlier">{selectedBox['1']?.outlier_count} patients</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
