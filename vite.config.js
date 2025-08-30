import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cats/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  }
})