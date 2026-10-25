import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Relative base so the build works on GitHub Pages (/<repo>/) and any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
