"""
DiabetesSense — Model training pipeline
=========================================
Dataset : UCI Pima Indians Diabetes Database (public, 768 records)
          https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv
Primary model : Random Forest (per project report, Section 6.1)
Baseline      : Logistic Regression (per project report, Section 6.2)
Explainability: SHAP TreeExplainer (per project report, Section 10)

Run:  python train.py
Produces everything under ./artifacts/ that api.py needs to serve predictions.
"""

import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

HERE = Path(__file__).parent
ARTIFACTS = HERE / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)

RANDOM_STATE = 42

COLUMNS = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age",
    "Outcome",
]

# These columns use 0 as a placeholder for "not recorded" in the raw dataset
# (a real patient cannot have 0 glucose, 0 BMI, 0 blood pressure, etc.)
ZERO_AS_MISSING = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]

FEATURE_NAMES = COLUMNS[:-1]

FEATURE_DISPLAY = {
    "Pregnancies": "Pregnancies",
    "Glucose": "Glucose (mg/dL)",
    "BloodPressure": "Blood Pressure (mm Hg)",
    "SkinThickness": "Skin Thickness (mm)",
    "Insulin": "Insulin (mu U/mL)",
    "BMI": "BMI",
    "DiabetesPedigreeFunction": "Diabetes Pedigree Function",
    "Age": "Age (years)",
}


def load_data() -> pd.DataFrame:
    df = pd.read_csv(HERE / "pima_raw.csv", names=COLUMNS)
    return df


def clean_data(df: pd.DataFrame, medians: dict | None = None):
    """Replace biologically-impossible zeros with NaN, then impute with the
    median. If `medians` is provided (inference time) reuse those values;
    otherwise compute them from this dataframe (training time) and return
    them for persistence."""
    df = df.copy()
    df[ZERO_AS_MISSING] = df[ZERO_AS_MISSING].replace(0, np.nan)

    if medians is None:
        medians = {col: float(df[col].median()) for col in ZERO_AS_MISSING}

    for col in ZERO_AS_MISSING:
        df[col] = df[col].fillna(medians[col])

    return df, medians


def evaluate(model, X_test, y_test, proba) -> dict:
    preds = model.predict(X_test)
    return {
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds), 4),
        "recall": round(recall_score(y_test, preds), 4),
        "f1_score": round(f1_score(y_test, preds), 4),
        "roc_auc": round(roc_auc_score(y_test, proba), 4),
        "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
    }


def main():
    print("Loading dataset ...")
    df = load_data()
    print(f"  {df.shape[0]} records, {df.shape[1] - 1} features")

    print("Cleaning data (median-imputing invalid zero readings) ...")
    df_clean, medians = clean_data(df)

    X = df_clean[FEATURE_NAMES]
    y = df_clean["Outcome"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f"  Train: {X_train.shape[0]}  Test: {X_test.shape[0]}")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ---- Baseline: Logistic Regression ----
    print("Training baseline Logistic Regression ...")
    logreg = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE)
    logreg.fit(X_train_scaled, y_train)
    logreg_metrics = evaluate(logreg, X_test_scaled, y_test, logreg.predict_proba(X_test_scaled)[:, 1])
    print(f"  LogReg  -> acc {logreg_metrics['accuracy']}  f1 {logreg_metrics['f1_score']}  auc {logreg_metrics['roc_auc']}")

    # ---- Primary model: Random Forest ----
    print("Training primary Random Forest model ...")
    rf = RandomForestClassifier(
        n_estimators=400,
        max_depth=6,
        min_samples_leaf=3,
        max_features="sqrt",
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    # Random Forest doesn't need scaled features, but we keep the same scaled
    # matrix so the API's preprocessing path is identical for every model.
    rf.fit(X_train_scaled, y_train)
    rf_metrics = evaluate(rf, X_test_scaled, y_test, rf.predict_proba(X_test_scaled)[:, 1])
    print(f"  RandForest -> acc {rf_metrics['accuracy']}  f1 {rf_metrics['f1_score']}  auc {rf_metrics['roc_auc']}")

    # ---- SHAP explainability (Section 10 of report) ----
    print("Building SHAP TreeExplainer ...")
    explainer = shap.TreeExplainer(rf)
    background_sample = X_train_scaled[:100]  # small background for fast, stable explanations

    # sanity check the explainer works on a batch before saving
    sv = explainer.shap_values(X_test_scaled[:5])
    print(f"  SHAP output shape check ok: {np.array(sv).shape}")

    # ---- Persist everything the API needs ----
    joblib.dump(rf, ARTIFACTS / "model_random_forest.joblib")
    joblib.dump(logreg, ARTIFACTS / "model_logreg_baseline.joblib")
    joblib.dump(scaler, ARTIFACTS / "scaler.joblib")
    joblib.dump(explainer, ARTIFACTS / "shap_explainer.joblib")
    joblib.dump(background_sample, ARTIFACTS / "shap_background.joblib")

    with open(ARTIFACTS / "medians.json", "w") as f:
        json.dump(medians, f, indent=2)

    with open(ARTIFACTS / "feature_names.json", "w") as f:
        json.dump({"features": FEATURE_NAMES, "display": FEATURE_DISPLAY}, f, indent=2)

    metrics = {
        "primary_model": "Random Forest",
        "random_forest": rf_metrics,
        "logistic_regression_baseline": logreg_metrics,
        "dataset": {
            "name": "UCI Pima Indians Diabetes Database",
            "n_records": int(df.shape[0]),
            "n_features": len(FEATURE_NAMES),
            "positive_rate": round(float(y.mean()), 4),
        },
    }
    with open(ARTIFACTS / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print("\nDone. Artifacts saved to", ARTIFACTS)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
