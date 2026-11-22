import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server proxies /api and /health to the FastAPI backend, so the
// browser never makes a cross-origin request (no CORS setup needed in dev).
const BACKEND = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/health': { target: BACKEND, changeOrigin: true },
    },
  },
})
