/// <reference types="vitest" />

import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'fulfillment',
      filename: 'remoteEntry.js',
      exposes: {
      },
      shared: {
        vue: { singleton: true },
        'vue-logger-plugin': { singleton: true },
        'vue-router': { singleton: true },
        '@ionic/core': { singleton: true },
        '@ionic/vue': { singleton: true },
        '@ionic/vue-router': { singleton: true },
        '@hotwax/apps-theme': { singleton: true },
        'pinia': { singleton: true }
      }
    })
  ],
  build: {
    target: 'esnext',
    rollupOptions: {
      external: [
        'child_process',
        '@hotwax/app-version-info'
      ]
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@common': path.resolve(__dirname, '../../common')
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
