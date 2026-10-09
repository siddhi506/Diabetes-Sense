import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/predict': 'http://localhost:8000',
      '/predict-all': 'http://localhost:8000',
      '/model-info': 'http://localhost:8000',
      '/models': 'http://localhost:8000',
      '/eda-info': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
