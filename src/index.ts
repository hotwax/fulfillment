import { createApp } from 'vue'
import { createPinia } from "pinia"
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router';
import { logger, createDxpI18n, imagePreview } from '@common';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Theme variables */
import "@common/css/settings.css"
import "@common/css/theme.css"
import './theme/variables.css';

import localeMessages from '@/locales'

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate)

export const i18n = createDxpI18n(localeMessages)


const app = createApp(App)
  .use(IonicVue, {
    mode: 'md',
    innerHTMLTemplatesEnabled: true
  })
  .use(logger as any, {
    level: import.meta.env.VITE_DEFAULT_LOG_LEVEL
  })
  .use(pinia)
  .use(router)
  .use(i18n)

// Setting permission before router ready, as router checks for permissions, if not set before ready,
// user gets redirected to settings page on refresh even when having permissions
// useUserStore().getUserPermissions;

router.isReady().then(() => {
  app.directive('image-preview', imagePreview)
  app.mount('#app');
});