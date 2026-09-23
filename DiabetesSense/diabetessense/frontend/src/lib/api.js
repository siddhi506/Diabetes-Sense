import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
})

export async function predictRisk(payload) {
  const { data } = await client.post('/predict', payload)
  return data
}

export async function fetchModelInfo() {
  const { data } = await client.get('/model-info')
  return data
}

export async function checkHealth() {
  const { data } = await client.get('/health')
  return data
}
