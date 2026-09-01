/// <reference types="vitest" />

import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { federation } from '@module-federation/vite'
import { versionInfoUtil } from '../../common/utils/versionInfoUtil'
import pkg from './package.json'
import { VitePWA } from 'vite-plugin-pwa'
import manifest from "./manifest.json"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appBuild = JSON.parse(env.VITE_APP_VERSION_CONFIG).buildVersion
  return {
  // A version build (buildVersion vX.Y.Z in VITE_APP_VERSION_CONFIG) is self-contained under /vX.Y.Z/; an empty buildVersion is the root bootstrap.
  base: appBuild ? `/${appBuild}/` : '/',
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
        'pinia': { singleton: true }
      }
    }),
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      manifest: manifest as any,
      devOptions: {
        enabled: true
      }
    })
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION_INFO': JSON.stringify(JSON.stringify(versionInfoUtil.getVersionInfo(pkg.version)))
  },
  build: {
    outDir: appBuild ? `dist/${appBuild}` : 'dist',
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
  server: {
    port: 8100
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
  }
})
