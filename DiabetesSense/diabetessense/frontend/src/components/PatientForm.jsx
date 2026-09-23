import { FIELDS } from '../lib/fields'
import './PatientForm.css'

export default function PatientForm({ values, onChange, onSubmit, loading }) {
  function handleFieldChange(key, raw) {
    const num = raw === '' ? '' : Number(raw)
    onChange({ ...values, [key]: num })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form className="patient-form" onSubmit={handleSubmit}>
      <div className="patient-form__grid">
        {FIELDS.map((field) => (
          <div className="field" key={field.key}>
            <div className="field__label-row">
              <label htmlFor={field.key}>{field.label}</label>
              {field.unit && <span className="field__unit">{field.unit}</span>}
            </div>
            {field.hint && <p className="field__hint">{field.hint}</p>}
            <div className="field__controls">
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={values[field.key]}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                aria-label={`${field.label} slider`}
              />
              <input
                id={field.key}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={values[field.key]}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="field__number"
              />
            </div>
          </div>
        ))}
      </div>

      <button type="submit" className="patient-form__submit" disabled={loading}>
        {loading ? 'Analyzing…' : 'Assess risk'}
      </button>
    </form>
  )
}
