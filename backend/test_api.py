from fastapi.testclient import TestClient
from api import app

def run_tests():
    client = TestClient(app)

    # 1. Base endpoints
    assert client.get('/').status_code == 200, 'Root endpoint failed'
    assert client.get('/health').status_code == 200, 'Health endpoint failed'
    assert client.get('/models').status_code == 200, 'Models endpoint failed'
    assert client.get('/model-info').status_code == 200, 'Model info endpoint failed'
    assert client.get('/eda-info').status_code == 200, 'EDA info endpoint failed'
    print('[PASS] Base endpoints (/ , /health, /models, /model-info, /eda-info)')

    # 2. Prediction across all 8 models
    models = [
        'calibrated_random_forest',
        'calibrated_xgboost',
        'random_forest',
        'xgboost',
        'logistic_regression',
        'decision_tree',
        'svm',
        'knn',
    ]
    patient = {
        'pregnancies': 2,
        'glucose': 145,
        'blood_pressure': 76,
        'skin_thickness': 25,
        'insulin': 95,
        'bmi': 29.8,
        'diabetes_pedigree_function': 0.62,
        'age': 40,
    }

    for m in models:
        res = client.post(f'/predict?model_name={m}', json=patient)
        assert res.status_code == 200, f'Predict failed for {m}: {res.text}'
        data = res.json()
        assert 'risk_probability' in data, f'No probability returned for {m}'
        assert len(data['top_factors']) == 4, f'Top factors length != 4 for {m}'
        assert len(data['all_factors']) == 8, f'All factors length != 8 for {m}'
    print('[PASS] Predictions across all 8 models (including SHAP explanations)')

    # 3. Consensus prediction endpoint
    res_all = client.post('/predict-all', json=patient)
    assert res_all.status_code == 200, f'Predict-all failed: {res_all.text}'
    data_all = res_all.json()
    assert data_all['total_models'] == 8, 'Incorrect total models count'
    assert len(data_all['model_predictions']) == 8, 'Incorrect model predictions list length'
    consensus_pct = data_all['consensus_probability'] * 100
    print(f'[PASS] Consensus prediction: {data_all["consensus_label"]} ({consensus_pct:.1f}%), {data_all["high_risk_count"]}/8 models voting HIGH')

    # 4. Zero imputation & boundary tests
    patient_zeros = {
        'pregnancies': 0,
        'glucose': 0,
        'blood_pressure': 0,
        'skin_thickness': 0,
        'insulin': 0,
        'bmi': 0,
        'diabetes_pedigree_function': 0.1,
        'age': 20,
    }
    res_zero = client.post('/predict', json=patient_zeros)
    assert res_zero.status_code == 200, 'Zero imputation prediction failed'
    print('[PASS] Zero-as-missing median imputation handling')

    print('\n===> ALL API TEST CASES PASSED SUCCESSFULLY! <===')

if __name__ == '__main__':
    run_tests()
