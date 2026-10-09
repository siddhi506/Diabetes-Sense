"""
DiabetesSense API
==================
FastAPI service that serves the trained ML model suite, returns
SHAP-based explanations alongside each prediction, and provides
EDA dataset insights & global feature importance.

Run:  uvicorn api:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

HERE = Path(__file__).parent
ARTIFACTS = HERE / "artifacts"

app = FastAPI(
    title="DiabetesSense API",
    description="Explainable ML API for diabetes risk prediction (educational/research use only — not a medical device).",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Load artifacts once at startup
# ---------------------------------------------------------------------------
models = {}
primary_model = None

try:
    scaler = joblib.load(ARTIFACTS / "scaler.joblib")
    explainer = joblib.load(ARTIFACTS / "shap_explainer.joblib")

    # Load model suite
    model_files = {
        "calibrated_random_forest": "model_calibrated_random_forest.joblib",
        "calibrated_xgboost": "model_calibrated_xgboost.joblib",
        "random_forest": "model_random_forest.joblib",
        "xgboost": "model_xgboost.joblib",
        "logistic_regression": "model_logistic_regression.joblib",
        "decision_tree": "model_decision_tree.joblib",
        "svm": "model_svm.joblib",
        "knn": "model_knn.joblib",
    }

    for key, filename in model_files.items():
        path = ARTIFACTS / filename
        if path.exists():
            loaded_model = joblib.load(path)
            # Ensure multi_class backwards compatibility on unpickled LogisticRegression
            if hasattr(loaded_model, "__class__") and "LogisticRegression" in loaded_model.__class__.__name__:
                if not hasattr(loaded_model, "multi_class"):
                    loaded_model.multi_class = "auto"
            models[key] = loaded_model

    primary_model = models.get("calibrated_random_forest") or models.get("random_forest")

    with open(ARTIFACTS / "feature_names.json") as f:
        feat_meta = json.load(f)
    with open(ARTIFACTS / "medians.json") as f:
        medians = json.load(f)
    with open(ARTIFACTS / "metrics.json") as f:
        metrics = json.load(f)
    with open(ARTIFACTS / "eda_summary.json") as f:
        eda_summary = json.load(f)

except FileNotFoundError as e:
    raise RuntimeError(
        "Model artifacts not found. Run `python train.py` before starting the API."
    ) from e

FEATURE_NAMES = feat_meta["features"]
FEATURE_DISPLAY = feat_meta["display"]
ZERO_AS_MISSING = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------
class PatientInput(BaseModel):
    pregnancies: int = Field(..., ge=0, le=20, description="Number of pregnancies")
    glucose: float = Field(..., ge=0, le=300, description="Plasma glucose concentration (mg/dL)")
    blood_pressure: float = Field(..., ge=0, le=200, description="Diastolic blood pressure (mm Hg)")
    skin_thickness: float = Field(..., ge=0, le=100, description="Triceps skin fold thickness (mm)")
    insulin: float = Field(..., ge=0, le=900, description="2-hour serum insulin (mu U/mL)")
    bmi: float = Field(..., ge=0, le=70, description="Body mass index")
    diabetes_pedigree_function: float = Field(..., ge=0, le=3, description="Diabetes pedigree function score")
    age: int = Field(..., ge=1, le=120, description="Age in years")
    model_name: str | None = Field(None, description="Optional model key override")

    class Config:
        json_schema_extra = {
            "example": {
                "pregnancies": 2,
                "glucose": 150,
                "blood_pressure": 78,
                "skin_thickness": 28,
                "insulin": 100,
                "bmi": 31.5,
                "diabetes_pedigree_function": 0.55,
                "age": 45,
            }
        }


class FeatureContribution(BaseModel):
    feature: str
    display_name: str
    value: float
    shap_value: float
    impact: str  # "increases_risk" | "decreases_risk"


class PredictionResponse(BaseModel):
    model_key: str
    model_used: str
    risk_label: str
    risk_probability: float
    confidence: str
    top_factors: list[FeatureContribution]
    all_factors: list[FeatureContribution]
    disclaimer: str


class ModelPredictionSummary(BaseModel):
    model_key: str
    model_name: str
    risk_label: str
    risk_probability: float
    confidence: str
    is_calibrated: bool


class ConsensusPredictionResponse(BaseModel):
    consensus_label: str
    consensus_probability: float
    consensus_confidence: str
    high_risk_count: int
    low_risk_count: int
    total_models: int
    model_predictions: list[ModelPredictionSummary]
    top_factors: list[FeatureContribution]
    all_factors: list[FeatureContribution]
    disclaimer: str


DISCLAIMER = (
    "DiabetesSense is an educational/research screening tool, not a medical device. "
    "It does not diagnose diabetes. Please consult a qualified healthcare professional "
    "for any medical concerns."
)


def _row_from_input(p: PatientInput) -> tuple[pd.DataFrame, dict]:
    raw = {
        "Pregnancies": p.pregnancies,
        "Glucose": p.glucose,
        "BloodPressure": p.blood_pressure,
        "SkinThickness": p.skin_thickness,
        "Insulin": p.insulin,
        "BMI": p.bmi,
        "DiabetesPedigreeFunction": p.diabetes_pedigree_function,
        "Age": p.age,
    }
    for col in ZERO_AS_MISSING:
        if raw[col] == 0:
            raw[col] = medians[col]

    df_row = pd.DataFrame([[raw[f] for f in FEATURE_NAMES]], columns=FEATURE_NAMES)
    return df_row, raw


def _compute_model_probability(model, scaled_row: np.ndarray) -> float:
    if hasattr(model, "predict_proba"):
        return float(model.predict_proba(scaled_row)[0][1])
    elif hasattr(model, "decision_function"):
        score = float(model.decision_function(scaled_row)[0])
        return float(1 / (1 + np.exp(-score)))
    else:
        return float(model.predict(scaled_row)[0])


def _compute_shap_contributions(scaled_row: np.ndarray, raw_dict: dict) -> list[FeatureContribution]:
    shap_raw = explainer.shap_values(scaled_row)
    shap_arr = np.array(shap_raw)
    if shap_arr.ndim == 3:
        shap_vals = shap_arr[0, :, 1]
    else:
        shap_vals = shap_arr[0]

    contributions = []
    for i, fname in enumerate(FEATURE_NAMES):
        sv = float(shap_vals[i])
        contributions.append(
            FeatureContribution(
                feature=fname,
                display_name=FEATURE_DISPLAY.get(fname, fname),
                value=round(float(raw_dict[fname]), 2),
                shap_value=round(sv, 4),
                impact="increases_risk" if sv > 0 else "decreases_risk",
            )
        )
    return sorted(contributions, key=lambda c: abs(c.shap_value), reverse=True)


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {
        "service": "DiabetesSense API",
        "version": "2.1.0",
        "status": "operational",
        "models_count": len(models),
        "primary_model": "Calibrated Random Forest",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "predict_all": "/predict-all",
            "model_info": "/model-info",
            "models": "/models",
            "eda_info": "/eda-info",
            "docs": "/docs",
        },
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.1.0",
        "models_loaded": len(models),
        "available_models": list(models.keys()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/model-info")
def model_info():
    return metrics


@app.get("/models")
def list_models():
    summaries = []
    for key, model_data in metrics.get("models", {}).items():
        met = model_data.get("metrics", {})
        summaries.append({
            "key": key,
            "name": model_data.get("name", key),
            "is_primary": key == "calibrated_random_forest",
            "is_calibrated": key.startswith("calibrated"),
            "accuracy": met.get("accuracy", 0.0),
            "precision": met.get("precision", 0.0),
            "recall": met.get("recall", 0.0),
            "f1_score": met.get("f1_score", 0.0),
            "roc_auc": met.get("roc_auc", 0.0),
            "cv_f1_score": model_data.get("cv_f1_score"),
        })
    return {
        "primary_model": metrics.get("primary_model", "Calibrated Random Forest"),
        "models": summaries,
    }


@app.get("/eda-info")
def eda_info():
    return eda_summary


@app.post("/predict", response_model=PredictionResponse)
def predict(
    patient: PatientInput,
    model_name: str = Query(default="calibrated_random_forest", description="Model key to use for prediction"),
):
    try:
        # Determine model key safely from parameter or body
        selected_key = patient.model_name or (
            getattr(model_name, "default", model_name) if not isinstance(model_name, str) else model_name
        )
        if not selected_key or selected_key not in models:
            selected_key = "calibrated_random_forest"

        raw_df, raw_dict = _row_from_input(patient)
        scaled_row = scaler.transform(raw_df)

        target_model = models.get(selected_key, primary_model)
        proba = _compute_model_probability(target_model, scaled_row)
        proba = max(0.0, min(1.0, proba))

        label = "HIGH" if proba >= 0.5 else "LOW"
        confidence = "high" if abs(proba - 0.5) > 0.25 else "moderate"

        contributions_sorted = _compute_shap_contributions(scaled_row, raw_dict)
        display_model_name = metrics.get("models", {}).get(selected_key, {}).get("name", selected_key)

        return PredictionResponse(
            model_key=selected_key,
            model_used=display_model_name,
            risk_label=label,
            risk_probability=round(proba, 4),
            confidence=confidence,
            top_factors=contributions_sorted[:4],
            all_factors=contributions_sorted,
            disclaimer=DISCLAIMER,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-all", response_model=ConsensusPredictionResponse)
def predict_all(patient: PatientInput):
    """
    Runs patient parameters through all 8 models in the suite and computes
    ensemble consensus, disagreement metrics, and SHAP factor contributions.
    """
    try:
        raw_df, raw_dict = _row_from_input(patient)
        scaled_row = scaler.transform(raw_df)

        summaries = []
        high_count = 0
        low_count = 0
        all_probas = []

        for key, model in models.items():
            proba = _compute_model_probability(model, scaled_row)
            proba = max(0.0, min(1.0, proba))
            all_probas.append(proba)

            lbl = "HIGH" if proba >= 0.5 else "LOW"
            if lbl == "HIGH":
                high_count += 1
            else:
                low_count += 1

            conf = "high" if abs(proba - 0.5) > 0.25 else "moderate"
            disp_name = metrics.get("models", {}).get(key, {}).get("name", key)

            summaries.append(
                ModelPredictionSummary(
                    model_key=key,
                    model_name=disp_name,
                    risk_label=lbl,
                    risk_probability=round(proba, 4),
                    confidence=conf,
                    is_calibrated=key.startswith("calibrated"),
                )
            )

        avg_proba = float(np.mean(all_probas)) if all_probas else 0.5
        consensus_lbl = "HIGH" if avg_proba >= 0.5 else "LOW"
        consensus_conf = "high" if (high_count >= 6 or low_count >= 6) else "moderate"

        contributions_sorted = _compute_shap_contributions(scaled_row, raw_dict)

        return ConsensusPredictionResponse(
            consensus_label=consensus_lbl,
            consensus_probability=round(avg_proba, 4),
            consensus_confidence=consensus_conf,
            high_risk_count=high_count,
            low_risk_count=low_count,
            total_models=len(summaries),
            model_predictions=summaries,
            top_factors=contributions_sorted[:4],
            all_factors=contributions_sorted,
            disclaimer=DISCLAIMER,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
