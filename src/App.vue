<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content" />
    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
import { createAnimation, IonApp, IonRouterOutlet, IonSplitPane, loadingController } from "@ionic/vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import Menu from "@/components/Menu.vue";
import emitter from "@/event-bus";
import { initialise, resetConfig } from "@/adapter";
import { Settings } from "luxon";
import { useAuthStore, getAppLoginUrl, initialiseFirebaseApp, translate, useProductIdentificationStore, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import logger from "@/logger";
import { init } from "@module-federation/runtime";
import { addNotification, storeClientRegistrationToken } from "@/utils/firebase";
import { useUserStore } from "@/store/user";
const loader = ref<any>(null);
const maxAge = process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0;
const appFirebaseConfig = JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG as any);
const appFirebaseVapidKey = process.env.VUE_APP_FIREBASE_VAPID_KEY;

const userToken = computed(() => useUserStore().getUserToken);
const instanceUrl = computed(() => useUserStore().getInstanceUrl);
const userProfile = computed(() => useUserStore().getUserProfile);
const allNotificationPrefs = computed(() => useUserStore().getAllNotificationPrefs);

const presentLoader = async (options = { message: "", backdropDismiss: false }) => {
  if (options.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController.create({
      message: options.message ? translate(options.message) : (options.backdropDismiss ? translate("Click the backdrop to dismiss.") : translate("Loading...")),
      translucent: true,
      backdropDismiss: options.backdropDismiss || false
    });
  }
  loader.value.present();
};

const dismissLoader = () => {
  if (loader.value) {
    loader.value.dismiss();
    loader.value = null;
  }
};

const unauthorised = async () => {
  const isEmbedded = useAuthStore().isEmbedded;
  const appLoginUrl = getAppLoginUrl();
  useUserStore().logout({ isUserUnauthorised: true });
  const redirectUrl = window.location.origin + "/login";
  window.location.href = isEmbedded ? appLoginUrl : `${appLoginUrl}?redirectUrl=${redirectUrl}`;
};

const playAnimation = () => {
  const aside = document.querySelector("aside") as Element;
  const main = document.querySelector("main") as Element;

  const revealAnimation = createAnimation()
    .addElement(aside)
    .duration(1500)
    .easing("ease")
    .keyframes([
      { offset: 0, flex: "0", opacity: "0" },
      { offset: 0.5, flex: "1", opacity: "0" },
      { offset: 1, flex: "1", opacity: "1" }
    ]);

  const gapAnimation = createAnimation()
    .addElement(main)
    .duration(500)
    .fromTo("gap", "0", "var(--spacer-2xl)");

  createAnimation().addAnimation([gapAnimation, revealAnimation]).play();
};

initialise({
  token: userToken.value,
  instanceUrl: instanceUrl.value,
  cacheMaxAge: maxAge,
  events: {
    unauthorised,
    responseError: () => {
      setTimeout(() => dismissLoader(), 100);
    },
    queueTask: (payload: any) => {
      emitter.emit("queueTask", payload);
    }
  }
});

onMounted(async () => {
  init({
    name: "fulfillment",
    remotes: [{ name: "fulfillment_extensions", entry: process.env.VUE_APP_REMOTE_ENTRY as string }]
  });

  loader.value = await loadingController.create({
    message: translate("Loading..."),
    translucent: true,
    backdropDismiss: false
  });

  emitter.on("presentLoader", presentLoader);
  emitter.on("dismissLoader", dismissLoader);
  emitter.on("playAnimation", playAnimation);

  if (userProfile.value && userProfile.value.userTimeZone) {
    Settings.defaultZone = userProfile.value.userTimeZone;
  }

  const currentEComStore: any = useDxpUserStore().getCurrentEComStore;
  if (userToken.value && currentEComStore?.productStoreId) {
    await useProductIdentificationStore().getIdentificationPref(currentEComStore.productStoreId).catch((error) => logger.error(error));

    if (appFirebaseConfig && appFirebaseConfig.apiKey && allNotificationPrefs.value?.length) {
      await initialiseFirebaseApp(
        appFirebaseConfig,
        appFirebaseVapidKey,
        storeClientRegistrationToken,
        addNotification
      );
    }
  }
});

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);
  emitter.off("playAnimation", playAnimation);
  resetConfig();
});
</script>
