import { createApp } from 'vue'
import { createPinia, setActivePinia } from "pinia"
import piniaPersist from "pinia-plugin-persistedstate"
import App from './App.vue'
import router from './router';
import logger from '@common/core/logger';

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
import './theme/variables.css';
import "@hotwax/apps-theme";

import { useUserStore } from "@/store/user";
import localeMessages from '@/locales'
import { createDxpI18n } from '@common'

const pinia = createPinia()
pinia.use(piniaPersist)
setActivePinia(pinia)

export const i18n = createDxpI18n(localeMessages)


const app = createApp(App)
  .use(IonicVue, {
    mode: 'md',
    innerHTMLTemplatesEnabled: true
  })
  .use(logger as any, {
    level: import.meta.env.VITE_DEFAULT_LOG_LEVEL
  })
  .use(router)
  .use(pinia)
  .use(i18n)

// Setting permission before router ready, as router checks for permissions, if not set before ready,
// user gets redirected to settings page on refresh even when having permissions
// useUserStore().getUserPermissions;

router.isReady().then(() => {
  app.mount('#app');
});