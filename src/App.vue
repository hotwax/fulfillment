<template>
  <ion-app>
    <!-- Work in flight shows here and never blocks the page. -->
    <ion-progress-bar v-if="isBusy" class="app-busy-bar" type="indeterminate" />
    <div v-if="isBusy && busyMessage" class="app-busy-message">{{ busyMessage }}</div>
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
import { IonApp, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonMenu, IonMenuToggle, IonProgressBar, IonRouterOutlet, IonSplitPane, IonTitle, IonToolbar, toastController } from "@ionic/vue";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { translate, emitter, logger, useNotificationStore, useAuth, i18n } from "@common";
import { Settings } from "luxon";
import { init } from "@module-federation/runtime";
import { focusLiveOrders, startLiveOrdersSync, syncMasterFacilities } from "@/db/appDbSync";
import { useUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";
import router from './router';
import { firebaseUtil } from "@/utils/firebaseUtil";
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW()

// Work in flight shows as a slim bar over the page rather than a blocking overlay. It only appears if the work outlasts
// a short grace period, so quick calls never flash it, and it clears itself if a dismiss never arrives.
const BUSY_DELAY_MS = 150;
const BUSY_MAX_MS = 30_000;
const isBusy = ref(false);
const busyMessage = ref("");
let busyDelayTimer: ReturnType<typeof setTimeout> | undefined;
let busyMaxTimer: ReturnType<typeof setTimeout> | undefined;

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

const presentLoader = (options: { message?: string } = {}) => {
  busyMessage.value = options?.message ? translate(options.message) : "";
  clearTimeout(busyMaxTimer);
  busyMaxTimer = setTimeout(dismissLoader, BUSY_MAX_MS);
  if(isBusy.value || busyDelayTimer) {return;}
  busyDelayTimer = setTimeout(() => {
    busyDelayTimer = undefined;
    isBusy.value = true;
  }, BUSY_DELAY_MS);
};

const dismissLoader = () => {
  clearTimeout(busyDelayTimer);
  clearTimeout(busyMaxTimer);
  busyDelayTimer = undefined;
  isBusy.value = false;
  busyMessage.value = "";
};

onMounted(async () => {
  init({
    name: "fulfillment",
    remotes: [{ name: "fulfillment_extensions", entry: import.meta.env.VITE_REMOTE_ENTRY as string, type: "module" }]
  });

  emitter.on("presentLoader", (options: any) => presentLoader(options));
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
      void startLiveOrdersSync(useProductStore().getFacilities, useProductStore().getCurrentFacility?.facilityId, useProductStore().getCurrentProductStore?.productStoreId);

      await useProductStore().fetchProductStoreSettings(currentProductStore.productStoreId).catch((error) => logger.error(error));

      if (allNotificationPrefs.value?.length) {
        await firebaseUtil.initialiseFirebaseMessaging();
      }
    }
});

// Before facilities load, the store holds `{}` rather than a list.
const facilityIdsKey = () => {
  const facilities = useProductStore().getFacilities;

  return Array.isArray(facilities) ? facilities.map((facility: any) => facility.facilityId).join(",") : "";
};
watch(facilityIdsKey, () => {
  void syncMasterFacilities(useProductStore().getFacilities);
});
// The sync follows the facility being worked in, so a switch made elsewhere has its orders in by the time Open shows them.
watch(() => useProductStore().getCurrentFacility?.facilityId, (facilityId) => {
  if(facilityId) {void focusLiveOrders(facilityId, useProductStore().getCurrentProductStore?.productStoreId);}
});

onUnmounted(() => {
  emitter.off("presentLoader", (options: any) => presentLoader(options));
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
.app-busy-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100000;
  height: 3px;
  pointer-events: none;
}

.app-busy-message {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100000;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  background: var(--ion-color-step-150, #262626);
  color: var(--ion-color-step-850, #d9d9d9);
  pointer-events: none;
}

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
