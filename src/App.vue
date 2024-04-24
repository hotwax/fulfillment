<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content" />
    </ion-split-pane>
  </ion-app>
</template>

<script lang="ts">
import { createAnimation, IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { defineComponent } from 'vue';
import Menu from '@/components/Menu.vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus";
import { mapGetters, useStore } from 'vuex';
import { initialise, resetConfig } from '@/adapter'
import { useRouter } from 'vue-router';
import { Settings } from 'luxon'
import { translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import logger from '@/logger'

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
      locale: 'user/getLocale',
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  methods: {
    async presentLoader(options = { message: '', backdropDismiss: true }) {
      // When having a custom message remove already existing loader
      if(options.message && this.loader) this.dismissLoader();

      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: options.message ? translate(options.message) : translate("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: options.backdropDismiss
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
      // Mark the user as unauthorised, this will help in not making the logout api call in actions
      this.store.dispatch("user/logout", { isUserUnauthorised: true });
      const redirectUrl = window.location.origin + '/login';
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`;
    },
    playAnimation() {
      const aside = document.querySelector('aside') as Element
      const main = document.querySelector('main') as Element

      const revealAnimation = createAnimation()
        .addElement(aside)
        .duration(1500)
        .easing('ease')
        .keyframes([
          { offset: 0, flex: '0', opacity: '0' },
          { offset: 0.5, flex: '1', opacity: '0' },
          { offset: 1, flex: '1', opacity: '1' }
        ])

      const gapAnimation = createAnimation()
        .addElement(main)
        .duration(500)
        .fromTo('gap', '0', 'var(--spacer-2xl)');

      createAnimation()
        .addAnimation([gapAnimation, revealAnimation])
        .play();
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
        message: translate("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
    emitter.on('playAnimation', this.playAnimation);

    // Handles case when user resumes or reloads the app
    // Luxon timezzone should be set with the user's selected timezone
    if (this.userProfile && this.userProfile.userTimeZone) {
      Settings.defaultZone = this.userProfile.userTimeZone;
    }

    // If fetching identifier without checking token then on login the app stucks in a loop, as the mounted hook runs before
    // token is available which results in api failure as unauthenticated, thus making logout call and then login call again and so on.
    if(this.userToken) {
      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(this.currentEComStore?.productStoreId)
        .catch((error) => logger.error(error));
    }
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
    emitter.off('playAnimation', this.playAnimation);
    resetConfig()
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    return {
      router,
      store,
      translate
    }
  }
});
</script>

<style scoped>
ion-split-pane {
  --side-width: 304px;
}
</style>