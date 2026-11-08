import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

// the tests reuse the app's Vite settings and add a browser-like page to run in
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  }),
)
