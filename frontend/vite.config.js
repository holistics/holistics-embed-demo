import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  root: 'frontend',
  plugins: [react(), basicSsl()],
  server: {
    // Forward API calls to the local Express backend (npm run server)
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: '../dist',
  },
})
