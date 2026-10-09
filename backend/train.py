"""
DiabetesSense — Advanced Multi-Model Training & EDA Pipeline
============================================================
1. Dataset        : UCI Pima Indians Diabetes Database (768 records)
2. Imbalance      : SMOTE (Synthetic Minority Over-sampling Technique)
3. Model Suite    : Logistic Regression, Decision Tree, Random Forest, SVM, XGBoost, KNN
4. Tuning & CV    : GridSearchCV with Stratified 5-Fold Cross-Validation
5. Calibration    : CalibratedClassifierCV (Platt Scaling)
6. Explainability : SHAP TreeExplainer (Local + Global Importance)
7. EDA Analytics  : Correlation Matrix, KDE Binned Distributions, Outlier Boxplots

Run:  python train.py
Produces model artifacts and eda_summary.json under ./artifacts/
"""

import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
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
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

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
    return pd.read_csv(HERE / "pima_raw.csv", names=COLUMNS)


def clean_data(df: pd.DataFrame, medians: dict | None = None):
    df = df.copy()
    df[ZERO_AS_MISSING] = df[ZERO_AS_MISSING].replace(0, np.nan)

    if medians is None:
        medians = {col: float(df[col].median()) for col in ZERO_AS_MISSING}

    for col in ZERO_AS_MISSING:
        df[col] = df[col].fillna(medians[col])

    return df, medians


def evaluate(model, X_test, y_test) -> dict:
    preds = model.predict(X_test)
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X_test)[:, 1]
    elif hasattr(model, "decision_function"):
        proba = model.decision_function(X_test)
    else:
        proba = preds

    return {
        "accuracy": round(float(accuracy_score(y_test, preds)), 4),
        "precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, preds, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, proba)), 4),
        "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
    }


def compute_eda_summary(df_clean: pd.DataFrame, X_train_scaled: np.ndarray, rf_model) -> dict:
    """Computes correlation matrix, distribution histograms split by outcome,
    boxplot summary statistics, and global SHAP importance for the EDA dashboard."""
    
    # 1. Pearson Correlation Matrix (all features + Outcome)
    corr = df_clean.corr().round(4)
    corr_matrix = {
        "columns": list(corr.columns),
        "values": corr.values.tolist()
    }

    # 2. Distributions (12 bins per feature for Outcome 0 vs Outcome 1)
    distributions = {}
    for feat in FEATURE_NAMES:
        feat_min = float(df_clean[feat].min())
        feat_max = float(df_clean[feat].max())
        bins = np.linspace(feat_min, feat_max, 13)
        bin_labels = [round(float((bins[i] + bins[i+1])/2), 2) for i in range(len(bins)-1)]
        
        non_diabetic_counts, _ = np.histogram(df_clean[df_clean["Outcome"] == 0][feat], bins=bins)
        diabetic_counts, _ = np.histogram(df_clean[df_clean["Outcome"] == 1][feat], bins=bins)
        
        binned_data = []
        for i in range(len(bin_labels)):
            binned_data.append({
                "bin": bin_labels[i],
                "non_diabetic": int(non_diabetic_counts[i]),
                "diabetic": int(diabetic_counts[i])
            })
        distributions[feat] = binned_data

    # 3. Boxplot & Summary Statistics per feature by Outcome
    boxplots = {}
    for feat in FEATURE_NAMES:
        stats_by_outcome = {}
        for outcome_val in [0, 1]:
            vals = df_clean[df_clean["Outcome"] == outcome_val][feat]
            q1 = float(vals.quantile(0.25))
            median = float(vals.median())
            q3 = float(vals.quantile(0.75))
            iqr = q3 - q1
            lower_whisker = float(max(vals.min(), q1 - 1.5 * iqr))
            upper_whisker = float(min(vals.max(), q3 + 1.5 * iqr))
            outliers = [float(v) for v in vals[(vals < lower_whisker) | (vals > upper_whisker)]]
            
            stats_by_outcome[str(outcome_val)] = {
                "min": round(float(vals.min()), 2),
                "q1": round(q1, 2),
                "median": round(median, 2),
                "q3": round(q3, 2),
                "max": round(float(vals.max()), 2),
                "lower_whisker": round(lower_whisker, 2),
                "upper_whisker": round(upper_whisker, 2),
                "outlier_count": len(outliers),
                "mean": round(float(vals.mean()), 2),
                "std": round(float(vals.std()), 2)
            }
        boxplots[feat] = stats_by_outcome

    # 4. Global SHAP Feature Importance (mean absolute SHAP values)
    explainer = shap.TreeExplainer(rf_model)
    shap_vals = explainer.shap_values(X_train_scaled)
    shap_arr = np.array(shap_vals)
    
    if shap_arr.ndim == 3:  # (n_samples, n_features, n_classes)
        mean_abs_shap = np.abs(shap_arr[:, :, 1]).mean(axis=0)
    else:  # (n_samples, n_features)
        mean_abs_shap = np.abs(shap_arr).mean(axis=0)

    global_shap = []
    for i, fname in enumerate(FEATURE_NAMES):
        global_shap.append({
            "feature": fname,
            "display_name": FEATURE_DISPLAY[fname],
            "importance": round(float(mean_abs_shap[i]), 4)
        })
    global_shap = sorted(global_shap, key=lambda x: x["importance"], reverse=True)

    return {
        "correlation_matrix": corr_matrix,
        "distributions": distributions,
        "boxplots": boxplots,
        "global_shap": global_shap,
        "feature_display": FEATURE_DISPLAY
    }


def main():
    print("==================================================")
    print(" DiabetesSense — Model Suite Training & Analytics")
    print("==================================================")

    print("\n1. Loading dataset ...")
    df = load_data()
    print(f"   Total records: {df.shape[0]} | Features: {len(FEATURE_NAMES)}")

    print("\n2. Preprocessing & Median Imputation ...")
    df_clean, medians = clean_data(df)

    X = df_clean[FEATURE_NAMES]
    y = df_clean["Outcome"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f"   Train set: {X_train.shape[0]} samples | Test set: {X_test.shape[0]} samples")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ----------------------------------------------------
    # 3. Resampling: SMOTE Class Imbalance Handling
    # ----------------------------------------------------
    print("\n3. Class Imbalance Resampling (SMOTE) ...")
    orig_dist = dict(pd.Series(y_train).value_counts())
    print(f"   Original train distribution: {orig_dist}")

    smote = SMOTE(random_state=RANDOM_STATE)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)
    resample_dist = dict(pd.Series(y_train_resampled).value_counts())
    print(f"   SMOTE train distribution   : {resample_dist}")

    # ----------------------------------------------------
    # 4. Model Grid Definitions & Hyperparameter Tuning
    # ----------------------------------------------------
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    model_configs = {
        "logistic_regression": {
            "name": "Logistic Regression (Baseline)",
            "estimator": LogisticRegression(random_state=RANDOM_STATE, max_iter=1000),
            "param_grid": {
                "C": [0.01, 0.1, 1.0, 10.0],
                "solver": ["lbfgs"],
            },
        },
        "decision_tree": {
            "name": "Decision Tree",
            "estimator": DecisionTreeClassifier(random_state=RANDOM_STATE),
            "param_grid": {
                "max_depth": [3, 5, 8, None],
                "min_samples_split": [2, 5, 10],
                "criterion": ["gini", "entropy"],
            },
        },
        "random_forest": {
            "name": "Random Forest",
            "estimator": RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1),
            "param_grid": {
                "n_estimators": [100, 200, 300],
                "max_depth": [4, 6, 8, None],
                "min_samples_leaf": [1, 2, 4],
            },
        },
        "svm": {
            "name": "Support Vector Machine (SVM)",
            "estimator": SVC(probability=True, random_state=RANDOM_STATE),
            "param_grid": {
                "C": [0.1, 1.0, 10.0],
                "kernel": ["rbf", "linear"],
                "gamma": ["scale", "auto"],
            },
        },
        "xgboost": {
            "name": "XGBoost",
            "estimator": XGBClassifier(random_state=RANDOM_STATE, eval_metric="logloss"),
            "param_grid": {
                "n_estimators": [50, 100, 200],
                "max_depth": [3, 5, 7],
                "learning_rate": [0.01, 0.1, 0.2],
            },
        },
        "knn": {
            "name": "K-Nearest Neighbors (KNN)",
            "estimator": KNeighborsClassifier(),
            "param_grid": {
                "n_neighbors": [3, 5, 7, 9, 11],
                "weights": ["uniform", "distance"],
                "metric": ["euclidean", "manhattan"],
            },
        },
    }

    results = {}
    resampling_comparison = {}
    fitted_models = {}

    print("\n4. Training & Hyperparameter Tuning (5-Fold Stratified CV) ...")
    for key, cfg in model_configs.items():
        print(f"\n   --> Training {cfg['name']} ...")

        base_model = cfg["estimator"]
        base_model.fit(X_train_scaled, y_train)
        pre_smote_metrics = evaluate(base_model, X_test_scaled, y_test)

        grid_search = GridSearchCV(
            estimator=cfg["estimator"],
            param_grid=cfg["param_grid"],
            cv=cv,
            scoring="f1",
            n_jobs=-1,
        )
        grid_search.fit(X_train_resampled, y_train_resampled)
        best_model = grid_search.best_estimator_

        post_smote_metrics = evaluate(best_model, X_test_scaled, y_test)

        best_cv_score = round(float(grid_search.best_score_), 4)
        best_params = {
            k: (float(v) if isinstance(v, (np.floating, float)) else v)
            for k, v in grid_search.best_params_.items()
        }

        print(f"       Best CV F1    : {best_cv_score}")
        print(
            f"       Test Acc      : {post_smote_metrics['accuracy']} | Test F1: {post_smote_metrics['f1_score']} | Test ROC-AUC: {post_smote_metrics['roc_auc']}"
        )

        fitted_models[key] = best_model
        results[key] = {
            "name": cfg["name"],
            "metrics": post_smote_metrics,
            "cv_f1_score": best_cv_score,
            "best_params": best_params,
        }
        resampling_comparison[key] = {
            "name": cfg["name"],
            "pre_smote": pre_smote_metrics,
            "post_smote": post_smote_metrics,
        }

    # ----------------------------------------------------
    # 5. Probability Calibration
    # ----------------------------------------------------
    print("\n5. Probability Calibration (CalibratedClassifierCV) ...")
    calibrated_rf = CalibratedClassifierCV(
        estimator=fitted_models["random_forest"], method="sigmoid", cv=5
    )
    calibrated_rf.fit(X_train_resampled, y_train_resampled)
    calibrated_rf_metrics = evaluate(calibrated_rf, X_test_scaled, y_test)

    calibrated_xgb = CalibratedClassifierCV(
        estimator=fitted_models["xgboost"], method="sigmoid", cv=5
    )
    calibrated_xgb.fit(X_train_resampled, y_train_resampled)
    calibrated_xgb_metrics = evaluate(calibrated_xgb, X_test_scaled, y_test)

    results["calibrated_random_forest"] = {
        "name": "Calibrated Random Forest (Primary)",
        "metrics": calibrated_rf_metrics,
        "cv_f1_score": results["random_forest"]["cv_f1_score"],
        "best_params": results["random_forest"]["best_params"],
    }
    results["calibrated_xgboost"] = {
        "name": "Calibrated XGBoost",
        "metrics": calibrated_xgb_metrics,
        "cv_f1_score": results["xgboost"]["cv_f1_score"],
        "best_params": results["xgboost"]["best_params"],
    }

    # ----------------------------------------------------
    # 6. SHAP & EDA Summaries
    # ----------------------------------------------------
    print("\n6. Building SHAP Explainer & Computing EDA Summaries ...")
    explainer = shap.TreeExplainer(fitted_models["random_forest"])
    background_sample = X_train_scaled[:100]

    eda_summary = compute_eda_summary(df_clean, X_train_scaled, fitted_models["random_forest"])

    # ----------------------------------------------------
    # 7. Persist Artifacts
    # ----------------------------------------------------
    print("\n7. Saving models & artifacts ...")
    for key, model in fitted_models.items():
        joblib.dump(model, ARTIFACTS / f"model_{key}.joblib")

    joblib.dump(calibrated_rf, ARTIFACTS / "model_calibrated_random_forest.joblib")
    joblib.dump(calibrated_xgb, ARTIFACTS / "model_calibrated_xgboost.joblib")
    joblib.dump(scaler, ARTIFACTS / "scaler.joblib")
    joblib.dump(explainer, ARTIFACTS / "shap_explainer.joblib")
    joblib.dump(background_sample, ARTIFACTS / "shap_background.joblib")

    with open(ARTIFACTS / "medians.json", "w") as f:
        json.dump(medians, f, indent=2)

    with open(ARTIFACTS / "feature_names.json", "w") as f:
        json.dump({"features": FEATURE_NAMES, "display": FEATURE_DISPLAY}, f, indent=2)

    with open(ARTIFACTS / "eda_summary.json", "w") as f:
        json.dump(eda_summary, f, indent=2)

    summary_metrics = {
        "primary_model": "Calibrated Random Forest",
        "models": results,
        "resampling_comparison": resampling_comparison,
        "dataset": {
            "name": "UCI Pima Indians Diabetes Database",
            "n_records": int(df.shape[0]),
            "n_features": len(FEATURE_NAMES),
            "positive_rate": round(float(y.mean()), 4),
            "train_size": int(X_train.shape[0]),
            "test_size": int(X_test.shape[0]),
            "resampled_train_size": int(X_train_resampled.shape[0]),
        },
    }

    with open(ARTIFACTS / "metrics.json", "w") as f:
        json.dump(summary_metrics, f, indent=2)

    print("\nTraining & EDA computation complete! All artifacts saved to:", ARTIFACTS)


if __name__ == "__main__":
    main()
