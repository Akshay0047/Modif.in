import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buildRouteMetaBootScript } from './scripts/routeMetaHead.js'

function routeMetaPlugin() {
  return {
    name: 'modif-route-meta',
    transformIndexHtml(html) {
      const marker = '<!-- modif:route-meta -->'
      if (!html.includes(marker)) return html
      return html.replace(marker, buildRouteMetaBootScript())
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), routeMetaPlugin()],
  optimizeDeps: {
    include: ['pdfjs-dist', 'pdf-lib', 'tesseract.js'],
  },
  worker: {
    format: 'es',
  },
})
