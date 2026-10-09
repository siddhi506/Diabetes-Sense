import Logo from './Logo'
import './HomePage.css'

export default function HomePage({ onNavigate }) {
  const biomarkers = [
    { name: 'Plasma Glucose', unit: 'mg/dL', desc: 'Primary glycemic control biomarker' },
    { name: 'Body Mass Index (BMI)', unit: 'kg/m²', desc: 'Adiposity and metabolic load metric' },
    { name: 'Patient Age', unit: 'years', desc: 'Chronological progression risk' },
    { name: 'Diastolic Blood Pressure', unit: 'mm Hg', desc: 'Cardiovascular resting pressure' },
    { name: 'Serum Insulin', unit: 'mu U/mL', desc: 'Pancreatic endocrine response' },
    { name: 'Diabetes Pedigree Function', unit: 'score', desc: 'Familial and genetic predisposition' },
    { name: 'Number of Pregnancies', unit: 'count', desc: 'Parity and gestational metabolic history' },
    { name: 'Triceps Skin Thickness', unit: 'mm', desc: 'Subcutaneous fat layer measurement' },
  ]

  const capabilities = [
    {
      icon: '🧠',
      title: '8-Model Machine Learning Suite',
      desc: 'Evaluates patient vectors using 8 distinct ML architectures: Calibrated Random Forest, Calibrated XGBoost, Support Vector Machines (SVM), Decision Trees, KNN, and Logistic Regression with Stratified 5-Fold Cross-Validation.',
    },
    {
      icon: '🔬',
      title: 'Explainable AI with TreeExplainer SHAP',
      desc: 'Every prediction is un-blackboxed with local SHAP feature contributions, revealing exactly which physiological biomarkers push risk higher or protect the patient.',
    },
    {
      icon: '💡',
      title: 'Counterfactual "What-If" Simulation',
      desc: 'Simulate targeted lifestyle modifications (e.g. lowering plasma glucose or reducing BMI) to quantify instantaneous projected risk mitigation percentages.',
    },
    {
      icon: '📊',
      title: 'Interactive Exploratory Data Analytics',
      desc: 'Deep-dive into cohort statistics across 768 patient records with interactive Pearson correlation heatmaps, binned distribution curves, and quartile outlier metrics.',
    },
  ]

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero__badge">
          <span className="hero-badge-dot" />
          <span>Explainable Clinical Decision-Support Prototype</span>
        </div>

        <div className="home-hero__brand">
          <Logo size={56} className="home-hero__logo" />
          <h1 className="home-hero__title">DiabetesSense</h1>
        </div>

        <p className="home-hero__tagline">
          Predictive Diabetes Risk Screening with Interpretable Machine Learning & Interactive Biomarker Simulation
        </p>

        <p className="home-hero__description">
          DiabetesSense is an educational and research-grade clinical intelligence system engineered to bridge
          physiological patient biomarkers and transparent, explainable AI. Leveraging the UCI Pima Indian
          Diabetes database with SMOTE class imbalance handling and Platt probability calibration, DiabetesSense
          delivers accurate risk stratification alongside real-time SHAP factor attribution.
        </p>

        {/* Hero Actions */}
        <div className="home-hero__actions">
          <button
            type="button"
            className="home-btn home-btn--primary"
            onClick={() => onNavigate('predictor')}
          >
            <span>Launch Risk Predictor</span>
            <span className="btn-arrow">→</span>
          </button>

          <button
            type="button"
            className="home-btn home-btn--secondary"
            onClick={() => onNavigate('all')}
          >
            <span>🌟 Open All-in-One Dashboard</span>
          </button>

          <button
            type="button"
            className="home-btn home-btn--outline"
            onClick={() => onNavigate('models')}
          >
            <span>📊 Model Benchmarks</span>
          </button>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section className="home-section">
        <div className="home-section__header">
          <span className="home-section__eyebrow">SYSTEM CAPABILITIES</span>
          <h2>Architected for Clinical Explainability & Accuracy</h2>
          <p>
            Bridging black-box predictive accuracy with actionable, physician-interpretable reasoning.
          </p>
        </div>

        <div className="capabilities-grid">
          {capabilities.map((c, idx) => (
            <div key={idx} className="capability-card">
              <div className="capability-icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8 Biomarkers Showcase */}
      <section className="home-section home-section--biomarkers">
        <div className="home-section__header">
          <span className="home-section__eyebrow">PHYSIOLOGICAL VECTORS</span>
          <h2>8 Standard Clinical Biomarkers Evaluated</h2>
          <p>Each patient profile is transformed through 8 physiological dimensions:</p>
        </div>

        <div className="biomarkers-grid">
          {biomarkers.map((b, idx) => (
            <div key={idx} className="biomarker-card">
              <div className="biomarker-card__top">
                <span className="biomarker-num">0{idx + 1}</span>
                <span className="biomarker-unit">{b.unit}</span>
              </div>
              <h4>{b.name}</h4>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Launch CTA Banner */}
      <section className="home-cta">
        <div className="home-cta__inner">
          <div className="home-cta__content">
            <h3>Ready to Explore Patient Risk Screening?</h3>
            <p>
              Load realistic patient presets, adjust biomarker sliders in real time, and inspect local SHAP explainability graphs.
            </p>
          </div>
          <div className="home-cta__actions">
            <button
              type="button"
              className="home-btn home-btn--primary"
              onClick={() => onNavigate('predictor')}
            >
              Start Risk Assessment →
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
