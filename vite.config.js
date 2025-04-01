import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/alv-immobilier/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
}) 