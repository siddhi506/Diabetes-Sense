"""
DiabetesSense API
==================
FastAPI service that serves the trained ML model suite, return
SHAP-based explanations alongside each prediction, and provides
EDA dataset insights & global feature importance.

Run:  uvicorn api:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

import json
from pathlib import Path

import joblib
import numpy as np
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
            models[key] = joblib.load(path)
            
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
    model_used: str
    risk_label: str
    risk_probability: float
    confidence: str
    top_factors: list[FeatureContribution]
    all_factors: list[FeatureContribution]
    disclaimer: str


DISCLAIMER = (
    "DiabetesSense is an educational/research screening tool, not a medical device. "
    "It does not diagnose diabetes. Please consult a qualified healthcare professional "
    "for any medical concerns."
)


def _row_from_input(p: PatientInput) -> tuple[np.ndarray, dict]:
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
    return np.array([[raw[f] for f in FEATURE_NAMES]]), raw


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/model-info")
def model_info():
    return metrics


@app.get("/eda-info")
def eda_info():
    return eda_summary


@app.post("/predict", response_model=PredictionResponse)
def predict(
    patient: PatientInput,
    model_name: str = Query("calibrated_random_forest", description="Model key to use for prediction")
):
    try:
        raw_row, raw_dict = _row_from_input(patient)
        scaled_row = scaler.transform(raw_row)

        target_model = models.get(model_name, primary_model)

        if hasattr(target_model, "predict_proba"):
            proba = float(target_model.predict_proba(scaled_row)[0][1])
        elif hasattr(target_model, "decision_function"):
            score = float(target_model.decision_function(scaled_row)[0])
            proba = 1 / (1 + np.exp(-score))
        else:
            proba = float(target_model.predict(scaled_row)[0])

        label = "HIGH" if proba >= 0.5 else "LOW"
        confidence = "high" if abs(proba - 0.5) > 0.25 else "moderate"

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
                    display_name=FEATURE_DISPLAY[fname],
                    value=round(float(raw_dict[fname]), 2),
                    shap_value=round(sv, 4),
                    impact="increases_risk" if sv > 0 else "decreases_risk",
                )
            )

        contributions_sorted = sorted(contributions, key=lambda c: abs(c.shap_value), reverse=True)
        display_model_name = metrics.get("models", {}).get(model_name, {}).get("name", model_name)

        return PredictionResponse(
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
