import { createApp, computed, reactive } from 'vue'
import { createPinia, setActivePinia } from "pinia"
import piniaPersist from "pinia-plugin-persistedstate"
import App from './App.vue'
import router from './router';
import logger from './logger';

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

import permissionPlugin, { Actions, hasPermission, setPermissions } from '@/authorization';
import permissionRules from '@/authorization/Rules';
import permissionActions from '@/authorization/Actions';
import { dxpComponents } from '@hotwax/dxp-components';
import { login, logout, loader, fetchProducts } from '@/utils/user';
import { getConfig, fetchGoodIdentificationTypes, getEComStoresByFacility, getProductIdentificationPref, getUserFacilities, getUserPreference, initialise, setProductIdentificationPref, setUserLocale, getAvailableTimeZones, setUserTimeZone, 
  setUserPreference } from './adapter';
import localeMessages from '@/locales';
import { addNotification, storeClientRegistrationToken } from '@/utils/firebase';
import { useUserStore } from "@/store/user";

const pinia = createPinia()
pinia.use(piniaPersist)
setActivePinia(pinia)

const app = createApp(App)
  .use(IonicVue, {
    mode: 'md',
    innerHTMLTemplatesEnabled: true
  })
  .use(logger, {
    level: process.env.VUE_APP_DEFAULT_LOG_LEVEL
  })
  .use(router)
  .use(pinia)
  .use(permissionPlugin, {
    rules: permissionRules,
    actions: permissionActions
  })
  .use(dxpComponents, {
    Actions,
    addNotification,
    defaultImgUrl: require("@/assets/images/defaultImage.png"),
    login,
    logout,
    loader,
    appLoginUrl: process.env.VUE_APP_LOGIN_URL as string,
    appFirebaseConfig: JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG as any),
    appFirebaseVapidKey: process.env.VUE_APP_FIREBASE_VAPID_KEY,
    getConfig,
    fetchGoodIdentificationTypes,
    getEComStoresByFacility,
    getProductIdentificationPref,
    initialise,
    setProductIdentificationPref,
    localeMessages,
    setUserLocale,
    setUserTimeZone,
    storeClientRegistrationToken,
    getAvailableTimeZones,
    getUserFacilities,
    setUserPreference,
    getUserPreference,
    hasPermission,
    fetchProducts
  });

// Setting permission before router ready, as router checks for permissions, if not set before ready,
// user gets redirected to settings page on refresh even when having permissions
setPermissions(useUserStore().getUserPermissions);

router.isReady().then(() => {
  app.mount('#app');
});

//TODO: Remove this after dxp-components is updated to replace appContext.config.globalProperties.$store and stopped calling vuex pattern getters/actions
app.config.globalProperties.$store = {
  getters: reactive({
    'user/getUserProfile': computed(() => useUserStore().getUserProfile),
    'user/getInstanceUrl': computed(() => useUserStore().getInstanceUrl),
    //'user/getCurrentFacility': computed(() => useUserStore().getCurrentFacility),
    'user/getPwaState': computed(() => useUserStore().getPwaState),
    //'user/getCurrentEComStore': computed(() => useUserStore().getCurrentEComStore),
  }),
  dispatch: (action: string, payload: any) => {
    if (action === 'user/updatePwaState') {
      useUserStore().updatePwaState(payload)
    }
  }
}