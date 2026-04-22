import { defineConfig } from 'vite'

export default defineConfig({
  base: '/NASA-Punk_Observatory_Optimized/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist'
  }
})