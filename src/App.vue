<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <ion-menu side="start" content-id="main-content" type="overlay" :disabled="!useAuth().isAuthenticated || (router.currentRoute.value.name as string) === 'Login'">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ currentFacility.facilityName }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list>
            <template v-for="(page, index) in menuItems" :key="index">
              <ion-item-divider color="light" v-if="page.groupMenuName && (index === 0 || menuItems[index - 1].groupMenuName !== page.groupMenuName)">
                <ion-label>
                  {{ translate(page.groupMenuName) }}
                </ion-label>
              </ion-item-divider>
              <ion-menu-toggle :auto-hide="false">
                <ion-item-divider color="light" v-if="page.isDivider">
                  <ion-label>
                    {{ translate(page.title) }}
                  </ion-label>
                </ion-item-divider>
                <ion-item
                  v-else
                  button
                  router-direction="root"
                  :router-link="page.url"
                  class="hydrated"
                  :class="{ selected: selectedIndex === index }">
                  <ion-icon v-if="page.icon" slot="start" :ios="page.icon" :md="page.icon" />
                  <ion-label>{{ translate(page.title) }}</ion-label>
                </ion-item>
              </ion-menu-toggle>
            </template>
          </ion-list>
        </ion-content>
      </ion-menu>
      <ion-router-outlet id="main-content" />
    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonMenu, IonMenuToggle, IonRouterOutlet, IonSplitPane, IonTitle, IonToolbar, loadingController, toastController } from "@ionic/vue";
import { computed, onMounted, onUnmounted, watch } from "vue";
import { translate, emitter, logger, useNotificationStore, useAuth, i18n } from "@common";
import { Settings } from "luxon";
import { init } from "@module-federation/runtime";
import { useUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";
import router from './router';
import { firebaseUtil } from "@/utils/firebaseUtil";
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { startLiveOrdersSync, syncMasterFacilities } from "@/db/liveOrdersSync";

const { needRefresh, updateServiceWorker } = useRegisterSW()

// Holds the loader's creation promise rather than the loader, so a dismiss that arrives while the loader is still being created can still reach it.
let loader: ReturnType<typeof loadingController.create> | null = null;
// Incremented by every dismiss, so a present still waiting for its loader knows it was dismissed in the meantime.
let dismissCount = 0;

const userProfile = computed(() => useUserStore().getUserProfile);
const allNotificationPrefs = computed(() => useNotificationStore().getAllNotificationPrefs);

const currentFacility = computed(() => useProductStore().currentFacility);

const menuItems = computed(() => {
  return router.getRoutes()
    .filter(route => route.meta && route.meta.menuIndex)
    .filter(route => !route.meta.permissionId || (useUserStore() as any).hasPermission(route.meta.permissionId as string))
    .sort((a, b) => (a.meta!.menuIndex as number) - (b.meta!.menuIndex as number))
    .map(route => ({
      title: route.meta!.title as string,
      url: route.path,
      icon: route.meta!.icon as string,
      isDivider: route.meta!.isDivider as boolean,
      groupMenuName: route.meta!.groupMenuName as string,
      childRoutes: route.meta!.childRoutes as string[],
      menuIndex: route.meta!.menuIndex as number
    }));
});

const selectedIndex = computed(() => {
  const path = router.currentRoute.value.path;
  return menuItems.value.findIndex((item) => item.url === path || item.childRoutes?.includes(path) || item.childRoutes?.some((route: any) => path.includes(route)));
});

// The options arrive through the untyped event bus, so they cannot be typed narrower than any.
const presentLoader = async (options: any = { message: "", backdropDismiss: false }) => {
  if(options.message && loader) {
    dismissLoader();
  }

  const dismissCountBefore = dismissCount;
  if(!loader) {
    loader = loadingController.create({
      message: options.message ? translate(options.message) : (options.backdropDismiss ? translate("Click the backdrop to dismiss.") : translate("Loading...")),
      translucent: true,
      backdropDismiss: options.backdropDismiss || false
    });
  }
  const overlay = await loader;
  if(dismissCount === dismissCountBefore) {
    overlay.present();
  }
};

const dismissLoader = () => {
  if(!loader) {
    return;
  }

  const pendingLoader = loader;
  loader = null;
  dismissCount++;
  // dismiss() waits for a present that is in progress, but leaves a loader that was never presented in the DOM.
  pendingLoader.then(async (overlay) => {
    if(!(await overlay.dismiss())) {
      overlay.remove();
    }
  });
};

onMounted(async () => {
  init({
    name: "fulfillment",
    remotes: [{ name: "fulfillment_extensions", entry: import.meta.env.VITE_REMOTE_ENTRY as string, type: "module" }]
  });

  loader = loadingController.create({
    message: translate("Loading..."),
    translucent: true,
    backdropDismiss: false
  });

  emitter.on("presentLoader", presentLoader);
  emitter.on("dismissLoader", dismissLoader);

  if (userProfile.value && userProfile.value.timeZone) {
    Settings.defaultZone = userProfile.value.timeZone;
  }

  if(userProfile.value?.userId) {
    i18n.global.locale.value = useUserStore().getLocale
  }

  const currentProductStore: any = useProductStore().getCurrentProductStore;

    if (useAuth().isAuthenticated.value && currentProductStore?.productStoreId) {
      // A restored session skips postLogin, so the live order sync starts here too.
      void startLiveOrdersSync(useProductStore().getFacilities);

      await useProductStore().fetchProductStoreSettings(currentProductStore.productStoreId).catch((error) => logger.error(error));

      if (allNotificationPrefs.value?.length) {
        await firebaseUtil.initialiseFirebaseMessaging();
      }
    }
});

// Keep the facility master list in IndexedDB in step with the facilities the app resolved.
watch(() => useProductStore().getFacilities?.map((facility: any) => facility.facilityId).join(","), () => {
  void syncMasterFacilities(useProductStore().getFacilities);
});

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);
});

const presentToast = async () => {
  const toast = await toastController.create({
    message: translate("New version available, click update to get latest version"),
    position: "bottom",
    buttons: [{
      role: "cancel",
      text: "Dismiss"
    }, {
      text: "Update",
      handler: () => updateServiceWorker()
    }]
  });
  await toast.present();
};

watch(needRefresh, (newValue) => {
  if(newValue) {
    presentToast();
  }
});
</script>

<style scoped>
ion-menu.md ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}

ion-menu.ios ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}

ion-item.selected {
  --color: var(--ion-color-secondary);
}
</style>
