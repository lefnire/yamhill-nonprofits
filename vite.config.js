import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built site works from any static host, including a
// GitHub Pages project subpath (https://user.github.io/yamhill-nonprofits/).
export default defineConfig({
  base: './',
  plugins: [react()],
  // The dataset (~500 KB of JSON) is deliberately bundled so the site stays a
  // pure static drop-in with no runtime fetch. stringify parses faster than an
  // object literal at that size; the warning limit is raised to match.
  json: { stringify: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1000 }
})
