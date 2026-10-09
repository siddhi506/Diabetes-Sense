# DiabetesSense v2.1 (XAI)

An explainable machine learning system for diabetes risk screening with multi-model benchmarking, TreeExplainer SHAP interpretability, counterfactual "What-If" intervention simulation, and clinical EDA analytics.

> **Disclaimer:** DiabetesSense is an educational and research prototype, not a medical device. It does not provide formal diagnosis or replace certified physician guidance.

---

## Architecture Overview

| Layer | Technology | Key Features |
|---|---|---|
| **Dataset** | UCI Pima Indians Diabetes Database (768 records) | 8 physiological biomarkers, zero-as-missing median imputation |
| **Resampling** | SMOTE (Synthetic Minority Over-sampling) | Balances class distribution 50/50 to boost Recall / Sensitivity |
| **Model Suite** | 8 Models (scikit-learn + XGBoost) | Calibrated RF, Calibrated XGBoost, RF, XGBoost, LogReg, Decision Tree, SVM, KNN |
| **Probability Calibration** | Platt Scaling (CalibratedClassifierCV) | Ensures output probabilities represent authentic empirical risk |
| **Explainability (XAI)** | SHAP (`TreeExplainer`) | Local patient contribution factors + Global cohort biomarker ranking |
| **Backend API** | FastAPI (Python 3.11 - 3.13) | REST endpoints, Pydantic validation, `/predict-all` consensus voting |
| **Frontend UI** | React 19 + Vite 8 + Recharts + jsPDF | Clinical presets, What-If simulation, Confusion matrix inspector, PDF report |

---

## Key Features

1. **Patient Risk Predictor & Explainability**:
   - Real-time prediction with calibrated probabilities and risk triage categorization (Low, Moderate, High).
   - Local **SHAP contribution breakdown** displaying which biomarkers push risk up or down.
   - **4 Quick Clinical Presets**: *Healthy Baseline*, *Pre-Diabetic Risk*, *High-Risk Symptomatic*, and *Multiparity & Genetics*.
   - **Dynamic Clinical Range Chips**: Live categorization (e.g. Glucose *Normal* vs *Pre-diabetic* vs *Elevated Risk*).

2. **Counterfactual "What-If" Lifestyle Intervention Simulator**:
   - Test how targeted clinical changes (e.g. lowering Glucose by -30 mg/dL or reducing BMI by -4 kg/m²) alter predicted risk.
   - Shows instantaneous risk reduction percentages.

3. **Multi-Model Consensus & Ensemble Agreement**:
   - Compare all 8 models simultaneously on the same patient profile with consensus voting ("7 of 8 models agree: HIGH RISK").

4. **Interactive Model Suite Benchmarks**:
   - Filter and sort models by Accuracy, Precision, Recall, F1-Score, ROC-AUC, and 5-Fold Stratified CV scores.
   - **SMOTE Impact Mode**: Side-by-side comparison of test metrics before vs after SMOTE resampling.
   - **Interactive Confusion Matrix Inspector**: 2x2 grid displaying TN, FP, FN, TP with calculated Sensitivity and Specificity.
   - Switch active prediction model with one click.

5. **Exploratory Data Analytics (EDA) Dashboard**:
   - Global SHAP feature ranking across the entire cohort.
   - Interactive Pearson Correlation heatmap with cell inspector.
   - Binned biomarker distribution visualizer (Diabetic vs Non-Diabetic cohorts).
   - Outlier detection and quartile statistics (IQR, Medians, Outlier counts).

6. **Screening PDF Report Generator**:
   - Clean, professional screening summary report with patient values, SHAP explanations, and personalized lifestyle recommendations.

7. **Zero-Friction Offline Resilience**:
   - Header connection pill automatically tests API health and roundtrip latency (`● API: Live (15ms)`).
   - If the backend is not started, frontend seamlessly displays demo heuristics and cached benchmark data without crashing.

---

## API Endpoints Reference

Base URL: `http://localhost:8000` (Interactive docs at `/docs`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status, operational health, and service catalog |
| `GET` | `/health` | Live health probe, loaded model count, latency, and timestamp |
| `GET` | `/models` | Complete list of all 8 models with their test benchmark metrics |
| `GET` | `/model-info` | Detailed benchmark results, CV scores, and GridSearchCV hyperparams |
| `GET` | `/eda-info` | Statistical distributions, correlation matrix, and outlier metadata |
| `POST` | `/predict` | Predicts diabetes risk and returns local SHAP feature explanations |
| `POST` | `/predict-all` | Runs prediction across all 8 models simultaneously with consensus metrics |

### Example Request (`POST /predict`):
```json
{
  "pregnancies": 2,
  "glucose": 150,
  "blood_pressure": 78,
  "skin_thickness": 28,
  "insulin": 100,
  "bmi": 31.5,
  "diabetes_pedigree_function": 0.55,
  "age": 45
}
```

---

## Quick Start Guide

### 1. One-Click Launch (Windows)
Double-click `start_all.bat` in the project root:
- Automatically starts the FastAPI backend on `http://localhost:8000`
- Automatically starts the Vite frontend on `http://localhost:5173`

### 2. Manual Startup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 3. Retraining the Models (Optional)
If you wish to re-execute the training, cross-validation, and EDA computation pipeline:
```bash
cd backend
python train.py
```
This regenerates all `.joblib` and `.json` artifacts inside `backend/artifacts/`.
