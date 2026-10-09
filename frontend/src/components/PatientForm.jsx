import { FIELDS, CLINICAL_PRESETS, DEFAULT_VALUES } from '../lib/fields'
import './PatientForm.css'

export default function PatientForm({
  values,
  onChange,
  onSubmit,
  loading,
  activeModel,
  onModelChange,
  availableModels = [],
  autoUpdate = true,
  onToggleAutoUpdate,
}) {
  function handleFieldChange(key, raw) {
    const num = raw === '' ? '' : Number(raw)
    onChange({ ...values, [key]: num })
  }

  function handlePresetClick(preset) {
    onChange({ ...preset.values })
  }

  function handleRandomize() {
    const randomVals = {}
    FIELDS.forEach((f) => {
      const step = f.step || 1
      const count = Math.floor((f.max - f.min) / step)
      const randIdx = Math.floor(Math.random() * count)
      const val = Number((f.min + randIdx * step).toFixed(f.step < 1 ? 2 : 0))
      randomVals[f.key] = val
    })
    onChange(randomVals)
  }

  function handleReset() {
    onChange({ ...DEFAULT_VALUES })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form className="patient-form" onSubmit={handleSubmit}>
      {/* Quick Clinical Presets & Live Evaluation Toggle */}
      <div className="patient-form__presets">
        <div className="presets-label">
          <span>⚡ Clinical Quick Profiles:</span>
          {onToggleAutoUpdate && (
            <button
              type="button"
              className={`live-eval-toggle ${autoUpdate ? 'live-eval-toggle--on' : 'live-eval-toggle--off'}`}
              onClick={onToggleAutoUpdate}
              title="Toggle automatic real-time assessment as sliders change"
            >
              <span className="live-eval-dot" />
              {autoUpdate ? 'Live Auto-Update: ON' : 'Live Auto-Update: OFF'}
            </button>
          )}
        </div>
        <div className="presets-buttons">
          {CLINICAL_PRESETS.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`preset-pill preset-pill--${p.tone}`}
              onClick={() => handlePresetClick(p)}
              title={p.desc}
            >
              {p.title}
            </button>
          ))}
          <button
            type="button"
            className="preset-pill preset-pill--action"
            onClick={handleRandomize}
            title="Generate random realistic clinical values"
          >
            🎲 Randomize
          </button>
          <button
            type="button"
            className="preset-pill preset-pill--action"
            onClick={handleReset}
            title="Reset to standard medians"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Model Selector Bar */}
      {availableModels.length > 0 && (
        <div className="patient-form__model-select">
          <label htmlFor="model-select-dropdown">Inference Engine Model:</label>
          <select
            id="model-select-dropdown"
            value={activeModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="model-select-input"
          >
            {availableModels.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name} {m.is_primary ? '★ (Primary Recommended)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Inputs Grid */}
      <div className="patient-form__grid">
        {FIELDS.map((field) => {
          const val = values[field.key]
          const status = field.getStatus ? field.getStatus(val) : null

          return (
            <div className="field-card" key={field.key}>
              <div className="field-card__header">
                <div className="field-card__title">
                  <label htmlFor={field.key}>{field.label}</label>
                  {field.unit && <span className="field-card__unit">({field.unit})</span>}
                </div>
                {status && (
                  <span className={`status-badge status-badge--${status.tone}`}>
                    {status.label}
                  </span>
                )}
              </div>

              {field.hint && <p className="field-card__hint">{field.hint}</p>}

              <div className="field-card__controls">
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={values[field.key] ?? field.default}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="field-card__slider"
                  aria-label={`${field.label} slider`}
                />
                <input
                  id={field.key}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={values[field.key] ?? ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="field-card__number"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit Action */}
      <button type="submit" className="patient-form__submit" disabled={loading}>
        {loading ? (
          <span className="submit-spinner-wrap">
            <span className="btn-spinner" /> Computing Risk & SHAP Explanations…
          </span>
        ) : (
          <span>{autoUpdate ? '⚡ Re-Calculate Risk & Explanations' : 'Run Clinical Risk Assessment →'}</span>
        )}
      </button>
    </form>
  )
}
