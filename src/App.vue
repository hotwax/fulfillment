<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content" />
    </ion-split-pane>
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { defineComponent, provide, ref } from 'vue';
import Menu from '@/components/Menu.vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus";
import { mapGetters, useStore } from 'vuex';
import { initialise, resetConfig } from '@/adapter'
import { useRouter } from 'vue-router';
import { Settings } from 'luxon'
import { useProductIdentificationStore } from '@hotwax/dxp-components';
import logger from './logger';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet,
    IonSplitPane,
    Menu
  },
  data() {
    return {
      loader: null as any,
      maxAge: process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0
    }
  },
  computed: {
    ...mapGetters({
      userToken: 'user/getUserToken',
      instanceUrl: 'user/getInstanceUrl',
      userProfile: 'user/getUserProfile',
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  methods: {
    async presentLoader() {
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: this.$t("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: true
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null as any;
      }
    },
    async unauthorised() {
      this.store.dispatch("user/logout");
      this.router.push("/login")
    }
  },
  created() {
    initialise({
      token: this.userToken,
      instanceUrl: this.instanceUrl,
      cacheMaxAge: this.maxAge,
      events: {
        unauthorised: this.unauthorised,
        responseError: () => {
          setTimeout(() => this.dismissLoader(), 100);
        },
        queueTask: (payload: any) => {
          emitter.emit("queueTask", payload);
        }
      }
    })
  },
  async mounted() {
    this.loader = await loadingController
      .create({
        message: this.$t("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);

    // Handles case when user resumes or reloads the app
    // Luxon timezzone should be set with the user's selected timezone
    if (this.userProfile && this.userProfile.userTimeZone) {
      Settings.defaultZone = this.userProfile.userTimeZone;
    }

    // Get product identification from api using dxp-component and set the state if eComStore is defined
    if (this.currentEComStore.productStoreId) {
      await useProductIdentificationStore().getIdentificationPref(this.currentEComStore.productStoreId)
        .catch((error) => logger.error('Failed to fetch identification preference', error));
    }
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
    resetConfig()
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    /* Start Product Identifier */

    const productIdentificationStore = useProductIdentificationStore();

    // Reactive state for productIdentificationPref
    let productIdentificationPref = ref(
      productIdentificationStore.$state.productIdentificationPref
    );

    // Providing productIdentificationPref to child components
    provide('productIdentificationPref', productIdentificationPref);

    // Subscribing to productIdentificationStore state change and changing value productIdentificationPref 
    productIdentificationStore.$subscribe((mutation: any, state) => {
        productIdentificationPref.value = state.productIdentificationPref;
    });

    /* End Product Identifier */

    return {
      router,
      store
    }
  }
});
</script>

<style scoped>
ion-split-pane {
  --side-width: 304px;
}
</style>