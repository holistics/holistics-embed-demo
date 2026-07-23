import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  root: 'frontend',
  plugins: [react(), basicSsl()],
  server: {
    // Local dev: proxy /api/* to the Express backend (npm run server).
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../dist',
  },
})
