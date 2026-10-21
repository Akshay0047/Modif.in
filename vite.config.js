import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { routeMetaPlugin } from './scripts/routeMetaPlugin.js'
import { ocrAssetsPlugin } from './scripts/ocrAssetsPlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), routeMetaPlugin(), ocrAssetsPlugin()],
  optimizeDeps: {
    include: ['pdfjs-dist', 'pdf-lib', 'tesseract.js'],
  },
  worker: {
    format: 'es',
  },
})
