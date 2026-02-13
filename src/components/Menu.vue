<template>
  <ion-menu side="start" content-id="main-content" type="overlay" :disabled="!isUserAuthenticated">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ currentFacility.facilityName }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-menu-toggle auto-hide="false" v-for="(page, index) in getValidMenuItems(appPages)" :key="index">
          <ion-item-divider color="light" v-if="!page.url">
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
            <ion-icon v-if="page.mdIcon || page.iosIcon" slot="start" :ios="page.iosIcon" :md="page.mdIcon" />
            <ion-label>{{ translate(page.title) }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonMenu, IonMenuToggle, IonTitle, IonToolbar } from "@ionic/vue";
import { computed } from "vue";
import { businessOutline, mailUnreadOutline, mailOpenOutline, checkmarkDoneOutline, settingsOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import { hasPermission } from "@/authorization";
import { translate, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import { useUserStore } from "@/store/user";

const router = useRouter();
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);
const isUserAuthenticated = computed(() => useUserStore().isUserAuthenticated);

const appPages = [
  {
    title: "Open",
    url: "/open",
    iosIcon: mailUnreadOutline,
    mdIcon: mailUnreadOutline,
    childRoutes: ["/open/"],
    meta: { permissionId: "APP_OPEN_ORDERS_VIEW" }
  },
  {
    title: "In Progress",
    url: "/in-progress",
    iosIcon: mailOpenOutline,
    mdIcon: mailOpenOutline,
    childRoutes: ["/in-progress/"],
    meta: { permissionId: "APP_IN_PROGRESS_ORDERS_VIEW" }
  },
  {
    title: "Completed",
    url: "/completed",
    iosIcon: checkmarkDoneOutline,
    mdIcon: checkmarkDoneOutline,
    childRoutes: ["/completed/"],
    meta: { permissionId: "APP_COMPLETED_ORDERS_VIEW" }
  },
  /* Commenting the Rejection page until Solr indexing for rejections are not properly integrated
  {
    title: "Rejections",
    url: "/rejections",
    iosIcon: backspaceOutline,
    mdIcon: backspaceOutline,
    meta: { permissionId: "APP_REJECTIONS_VIEW" }
  },*/
  {
    title: "Transfer Orders",
    url: "/transfer-orders",
    iosIcon: businessOutline,
    mdIcon: businessOutline,
    childRoutes: ["/transfer-order-details", "/create-transfer-order", "/ship-transfer-order"],
    meta: { permissionId: "APP_TRANSFER_ORDERS_VIEW" }
  },
  {
    title: "Settings",
    url: "/settings",
    iosIcon: settingsOutline,
    mdIcon: settingsOutline
  },
  {
    title: "Organization",
    url: "",
    meta: { permissionId: "APP_ORGANIZATION_HEADER_VIEW" }
  },
  {
    title: "Rejection reasons",
    url: "/rejection-reasons",
    childRoutes: ["/rejection-reasons/"],
    meta: { permissionId: "APP_REJECTION_REASONS_VIEW" }
  },
  {
    title: "Carriers & Shipment Methods",
    url: "/carriers",
    childRoutes: ["/carrier-details"],
    meta: { permissionId: "APP_CARRIERS_VIEW" }
  },
  {
    title: "Order Lookup",
    url: "/order-lookup",
    childRoutes: ["/order-lookup/"],
    meta: { permissionId: "APP_ORDER_LOOKUP_VIEW" }
  }
];

const getValidMenuItems = (pages: any) => {
  return pages.filter((appPage: any) => (!appPage.meta || !appPage.meta.permissionId) || hasPermission(appPage.meta.permissionId));
};

const selectedIndex = computed(() => {
  const path = router.currentRoute.value.path;
  const validPages = appPages.filter((appPage: any) => (!appPage.meta || !appPage.meta.permissionId) || hasPermission(appPage.meta.permissionId));
  return validPages.findIndex((screen) => screen.url === path || screen.childRoutes?.includes(path) || screen.childRoutes?.some((route) => path.includes(route)));
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
