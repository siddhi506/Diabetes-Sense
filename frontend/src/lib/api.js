import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
})

export async function predictRisk(payload, modelName = 'calibrated_random_forest') {
  const { data } = await client.post(`/predict?model_name=${encodeURIComponent(modelName)}`, payload)
  return data
}

export async function fetchModelInfo() {
  const { data } = await client.get('/model-info')
  return data
}

export async function fetchEdaInfo() {
  const { data } = await client.get('/eda-info')
  return data
}

export async function checkHealth() {
  const { data } = await client.get('/health')
  return data
}
