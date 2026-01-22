<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content" />
    </ion-split-pane>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="openAiAssistant">
        <ion-icon :icon="sparkles" />
      </ion-fab-button>
    </ion-fab>
  </ion-app>
</template>

<script lang="ts">
import { createAnimation, IonApp, IonRouterOutlet, IonSplitPane, IonFab, IonFabButton, IonIcon, modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import Menu from '@/components/Menu.vue';
import { loadingController } from '@ionic/vue';
import { sparkles } from 'ionicons/icons';
import AiAssistantModal from '@/components/AiAssistantModal.vue';
import emitter from "@/event-bus";
import { mapGetters, useStore } from 'vuex';
import { initialise, resetConfig } from '@/adapter'
import { useRouter } from 'vue-router';
import { Settings } from 'luxon'
import { useAuthStore, getAppLoginUrl, initialiseFirebaseApp, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import logger from '@/logger'
import { init, loadRemote } from '@module-federation/runtime';
import { addNotification, storeClientRegistrationToken } from '@/utils/firebase';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet,
    IonSplitPane,
    Menu,
    IonFab,
    IonFabButton,
    IonIcon
  },
  data() {
    return {
      loader: null as any,
      maxAge: process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0,
      appFirebaseConfig: JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG as any),
      appFirebaseVapidKey: process.env.VUE_APP_FIREBASE_VAPID_KEY,
    }
  },
  computed: {
    ...mapGetters({
      userToken: 'user/getUserToken',
      instanceUrl: 'user/getInstanceUrl',
      userProfile: 'user/getUserProfile',
      locale: 'user/getLocale',
      currentEComStore: 'user/getCurrentEComStore',
      allNotificationPrefs: 'user/getAllNotificationPrefs',
    })
  },
  methods: {
    async presentLoader(options = { message: '', backdropDismiss: false }) {
      // When having a custom message remove already existing loader
      if(options.message && this.loader) this.dismissLoader();

      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: options.message ? translate(options.message) : (options.backdropDismiss ? translate("Click the backdrop to dismiss.") : translate("Loading...")),
            translucent: true,
            backdropDismiss: options.backdropDismiss || false
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
      const authStore = useAuthStore();
      const isEmbedded = authStore.isEmbedded;
      const appLoginUrl = getAppLoginUrl();
      // Mark the user as unauthorised, this will help in not making the logout api call in actions
      this.store.dispatch("user/logout", { isUserUnauthorised: true });
      const redirectUrl = window.location.origin + '/login';
      window.location.href = isEmbedded ? appLoginUrl :`${appLoginUrl}?redirectUrl=${redirectUrl}`;
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
    },
    async openAiAssistant() {
      const modal = await modalController.create({
        component: AiAssistantModal,
      });
      return modal.present();
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
    init({
      name: "fulfillment",
      remotes: [
        {
          name: "fulfillment_extensions",
          entry: process.env.VUE_APP_REMOTE_ENTRY as string,
        }
      ],
    });

    this.loader = await loadingController
      .create({
        message: translate("Loading..."),
        translucent: true,
        backdropDismiss: false
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
    emitter.on('playAnimation', this.playAnimation);

    // Handles case when user resumes or reloads the app
    // Luxon timezzone should be set with the user's selected timezone
    if (this.userProfile && this.userProfile.userTimeZone) {
      Settings.defaultZone = this.userProfile.userTimeZone;
    }

    const currentEComStore: any = useUserStore().getCurrentEComStore;
    // If fetching identifier without checking token then on login the app stucks in a loop, as the mounted hook runs before
    // token is available which results in api failure as unauthenticated, thus making logout call and then login call again and so on.
    if(this.userToken && currentEComStore?.productStoreId) {
      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(currentEComStore.productStoreId)
        .catch((error) => logger.error(error));

      // check if firebase configurations are there.
      if (this.appFirebaseConfig && this.appFirebaseConfig.apiKey && this.allNotificationPrefs?.length) {
        // initialising and connecting firebase app for notification support
        await initialiseFirebaseApp(
          this.appFirebaseConfig,
          this.appFirebaseVapidKey,
          storeClientRegistrationToken,
          addNotification,
        )
      }
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
      translate,
      sparkles
    }
  }
});
</script>

