const ModuleFederationPlugin = require('@module-federation/enhanced').ModuleFederationPlugin;
const path = require('path')
require("@hotwax/app-version-info")
module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        vue: path.resolve('./node_modules/vue')
      }
    },
    plugins: [
      new ModuleFederationPlugin({
        name: "fulfillment",
        shared: {
          vue: { singleton: true, eager: true },
          "vue-logger-plugin": { singleton: true, eager: true },
          "vue-router": { singleton: true, eager: true },
          vuex: { singleton: true, eager: true },
          "vuex-persistedstate": { singleton: true, eager: true },
          "@ionic/core": { singleton: true, eager: true },
          "@ionic/vue": { singleton: true, eager: true },
          "@ionic/vue-router": { singleton: true, eager: true },
          "@hotwax/app-version-info": { singleton: true, eager: true },
          "@hotwax/apps-theme": { singleton: true, eager: true },
          "@hotwax/dxp-components": { singleton: true, eager: true },
          "@hotwax/oms-api": { singleton: true, eager: true },
        },
      })
    ],
    optimization: {
      splitChunks: false,
      runtimeChunk: false
    },
  },
  devServer: {
    allowedHosts: "all",
    host: '0.0.0.0', // Allows access from any IP address
    port: 8100, // Ensure this port is different from the host
    headers: {
      "Access-Control-Allow-Origin": "*", // Allow all origins (for development only)
    },
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws'
    }
  },
  runtimeCompiler: true,
  transpileDependencies: ['@hotwax/dxp-components']
}
