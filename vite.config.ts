/// <reference types="vitest" />

import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import federation from '@originjs/vite-plugin-federation'
import { versionInfoUtil } from '../../common/utils/versionInfoUtil'
import pkg from './package.json'

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
  define: {
    'import.meta.env.VITE_APP_VERSION_INFO': JSON.stringify(JSON.stringify(versionInfoUtil.getVersionInfo(pkg.version)))
  },
  build: {
    target: 'esnext',
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
