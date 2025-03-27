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

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters } from "vuex";
import { arrowBackOutline, backspaceOutline, mailUnreadOutline, mailOpenOutline, checkmarkDoneOutline, settingsOutline } from "ionicons/icons";
import { useStore } from "@/store";
import { useRouter } from "vue-router";
import { hasPermission } from "@/authorization";
import { translate, useUserStore } from '@hotwax/dxp-components';

export default defineComponent({
  name: "Menu",
  components: {
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuToggle,
    IonTitle,
    IonToolbar
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: 'user/isUserAuthenticated',
    })
  },
  methods: {
    getValidMenuItems(appPages: any) {
      return appPages.filter((appPage: any) => (!appPage.meta || !appPage.meta.permissionId) || hasPermission(appPage.meta.permissionId));
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    const appPages = [
      {
        title: "Open",
        url: "/open",
        iosIcon: mailUnreadOutline,
        mdIcon: mailUnreadOutline,
        childRoutes: ["/open/"],
        meta: {
          permissionId: "APP_OPEN_ORDERS_VIEW"
        }
      },
      {
        title: "In Progress",
        url: "/in-progress",
        iosIcon: mailOpenOutline,
        mdIcon: mailOpenOutline,
        childRoutes: ["/in-progress/"],
        meta: {
          permissionId: "APP_IN_PROGRESS_ORDERS_VIEW"
        }
      },
      {
        title: "Completed",
        url: "/completed",
        iosIcon: checkmarkDoneOutline,
        mdIcon: checkmarkDoneOutline,
        childRoutes: ["/completed/"],
        meta: {
          permissionId: "APP_COMPLETED_ORDERS_VIEW"
        }
      },
      {
        title: "Rejections",
        url: "/rejections",
        iosIcon: backspaceOutline,
        mdIcon: backspaceOutline,
        meta: {
          permissionId: "APP_REJECTIONS_VIEW"
        }
      },
      {
        title: "Transfer Orders",
        url: "/transfer-orders",
        iosIcon: arrowBackOutline,
        mdIcon: arrowBackOutline,
        childRoutes: ["/transfer-order-details", "/transfer-shipment-review"],
        meta: {
          permissionId: "APP_TRANSFER_ORDERS_VIEW"
        }
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settingsOutline,
        mdIcon: settingsOutline,
      },
      {
        title: "Organization",
        url: "",
        meta: {
          permissionId: "APP_ORGANIZATION_HEADER_VIEW"
        }
      }, {
        title: "Rejection reasons",
        url: "/rejection-reasons",
        childRoutes: ["/rejection-reasons/"],
        meta: {
          permissionId: "APP_REJECTION_REASONS_VIEW"
        }
      },
      {
        title: "Carriers & Shipment Methods",
        url: "/carriers",
        childRoutes: ["/carrier-details"],
        meta: {
          permissionId: "APP_CARRIERS_VIEW"
        }
      },
      {
        title: "Order Lookup",
        url: "/order-lookup",
        childRoutes: ["/order-lookup/"],
        meta: {
          permissionId: "APP_ORDER_LOOKUP_VIEW"
        }
      }
    ];

    const selectedIndex = computed(() => {
      const path = router.currentRoute.value.path
      const validPages = appPages.filter((appPage: any) => (!appPage.meta || !appPage.meta.permissionId) || hasPermission(appPage.meta.permissionId))
      return validPages.findIndex((screen) => screen.url === path || screen.childRoutes?.includes(path) || screen.childRoutes?.some((route) => path.includes(route)))
    })

    return {
      appPages,
      backspaceOutline,
      checkmarkDoneOutline,
      currentFacility,
      hasPermission,
      arrowBackOutline,
      mailUnreadOutline,
      mailOpenOutline,
      selectedIndex,
      settingsOutline,
      store,
      translate
    };
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