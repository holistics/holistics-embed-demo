import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  root: 'frontend',
  plugins: [react(), basicSsl()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
