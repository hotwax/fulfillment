<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <Menu v-if="router && router.currentRoute.value.name !== 'Login'" />
      <ion-router-outlet id="main-content" />
    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
import { createAnimation, IonApp, IonRouterOutlet, IonSplitPane, loadingController } from "@ionic/vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import Menu from "@/components/Menu.vue";
import { translate } from "@common";
import emitter from "@common/core/emitter";
import { Settings } from "luxon";
import logger from "@common/core/logger";
import { init } from "@module-federation/runtime";
import { fireBaseUtil } from "@/utils/fireBaseUtil";
import { useUserStore } from "@/store/user";
import { useProductIdentificationStore } from "@/store/productIdentification";
import router from './router';
const loader = ref<any>(null);
const appFirebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG as any);
const appFirebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const userToken = computed(() => useUserStore().getUserToken);
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

onMounted(async () => {
  init({
    name: "fulfillment",
    remotes: [{ name: "fulfillment_extensions", entry: import.meta.env.VITE_REMOTE_ENTRY as string }]
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

  const currentEComStore: any = useUserStore().getCurrentEComStore;
  if (userToken.value && currentEComStore?.productStoreId) {
    await useProductIdentificationStore().getIdentificationPref(currentEComStore.productStoreId).catch((error) => logger.error(error));

    if (appFirebaseConfig && appFirebaseConfig.apiKey && allNotificationPrefs.value?.length) {
      await fireBaseUtil.initialiseFirebaseApp(
        appFirebaseConfig,
        appFirebaseVapidKey,
        fireBaseUtil.storeClientRegistrationToken,
        fireBaseUtil.addNotification
      );
    }
  }
});

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);
  emitter.off("playAnimation", playAnimation);
});
</script>
