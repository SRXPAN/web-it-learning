import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Terser is a good default for minification, but 'esbuild' is faster.
    // Keep 'terser' if you need smaller bundles, switch to 'esbuild' for speed.
    minify: 'terser', 
  },
  server: {
    port: 5173,
    proxy: {
      // Proxies /api requests to your backend (Express/NestJS running on port 4000)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})