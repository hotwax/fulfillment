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
            :class="{ selected: eComStores.length !== 0 ? selectedIndex === index : false  }"
            :disabled="page.meta?.disabled">
            <ion-icon v-if="page.mdIcon || page.iosIcon" slot="start" :ios="page.iosIcon" :md="page.mdIcon" :color="page.meta.iconColor || (selectedIndex === index ? 'secondary' : 'medium')" />
            <ion-label>{{ translate(page.title) }}</ion-label>
            <ion-icon v-if="page.meta.endIcon" slot="end" :icon="page.meta.endIcon" color="medium" @click.stop="handleEndIconClick(page.meta.endIconType)" />
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
import { backspaceOutline, businessOutline, mailUnreadOutline, mailOpenOutline, checkmarkDoneOutline, settingsOutline, warningOutline, openOutline, copyOutline } from "ionicons/icons";
import { useStore } from "@/store";
import { useRouter } from "vue-router";
import { hasPermission } from "@/authorization";
import { translate, useUserStore } from '@hotwax/dxp-components';
import Actions from "@/authorization/Actions";
import { copyToClipboard } from "@/utils";

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
      const validPages = appPages.filter((appPage: any) =>
          (!appPage.meta || !appPage.meta.permissionId) || hasPermission(appPage.meta.permissionId)
        ).map((appPage: any) => {
      // Disable all other items when eComStores is empty
      if (this.eComStores.length === 0) {
        return {
          ...appPage,
          meta: {
            ...appPage.meta,
            disabled: true
          }
        }
      }
      return appPage
    });

      if (this.eComStores.length === 0) {
        validPages.unshift({
          title: translate("Finish facility setup"),
          url: "https://docs.hotwax.co/documents/system-admins/administration/facilities/manage-product-stores",
          iosIcon: warningOutline,
          mdIcon: warningOutline,
          meta: {
            endIcon: hasPermission(Actions.APP_FACILITY_EDIT) ? openOutline : copyOutline,
            disabled: false,
            iconColor: 'warning',
            endIconType: hasPermission(Actions.APP_FACILITY_EDIT) ? 'open' : 'copy'
          },
        });
      }

      return validPages;
    },
    handleEndIconClick(type: string) {
    if (type === 'open') {
      window.open("https://docs.hotwax.co/documents/system-admins/administration/facilities/manage-product-stores", "_blank");
    } else if (type === 'copy') {
      copyToClipboard('https://docs.hotwax.co/documents/system-admins/administration/facilities/manage-product-stores', translate('Support request link copied to clipboard'))
    }
  }
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 
    let eComStores: any = computed(() => userStore.eComStores)

    const appPages = [
      {
        title: "Open",
        url: "/open",
        iosIcon: mailUnreadOutline,
        mdIcon: mailUnreadOutline,
        childRoutes: ["/open/"],
        meta: {
          permissionId: "APP_OPEN_ORDERS_VIEW",
          disabled: false
        }
      },
      {
        title: "In Progress",
        url: "/in-progress",
        iosIcon: mailOpenOutline,
        mdIcon: mailOpenOutline,
        childRoutes: ["/in-progress/"],
        meta: {
          permissionId: "APP_IN_PROGRESS_ORDERS_VIEW",
          disabled: false
        }
      },
      {
        title: "Completed",
        url: "/completed",
        iosIcon: checkmarkDoneOutline,
        mdIcon: checkmarkDoneOutline,
        childRoutes: ["/completed/"],
        meta: {
          permissionId: "APP_COMPLETED_ORDERS_VIEW",
          disabled: false
        }
      },
      /* Commenting the Rejection page until Solr indexing for rejections are not properly integrated
      {
        title: "Rejections",
        url: "/rejections",
        iosIcon: backspaceOutline,
        mdIcon: backspaceOutline,
        meta: {
          permissionId: "APP_REJECTIONS_VIEW",
          disabled: false
        }
      },*/
      {
        title: "Transfer Orders",
        url: "/transfer-orders",
        iosIcon: businessOutline,
        mdIcon: businessOutline,
        childRoutes: ["/transfer-order-details", "/create-transfer-order", "/ship-transfer-order"],
        meta: {
          permissionId: "APP_TRANSFER_ORDERS_VIEW",
          disabled: false
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
          permissionId: "APP_ORGANIZATION_HEADER_VIEW",
          disabled: false
        }
      }, {
        title: "Rejection reasons",
        url: "/rejection-reasons",
        childRoutes: ["/rejection-reasons/"],
        meta: {
          permissionId: "APP_REJECTION_REASONS_VIEW",
          disabled: false
        }
      },
      {
        title: "Carriers & Shipment Methods",
        url: "/carriers",
        childRoutes: ["/carrier-details"],
        meta: {
          permissionId: "APP_CARRIERS_VIEW",
          disabled: false
        }
      },
      {
        title: "Order Lookup",
        url: "/order-lookup",
        childRoutes: ["/order-lookup/"],
        meta: {
          permissionId: "APP_ORDER_LOOKUP_VIEW",
          disabled: false
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
      businessOutline,
      checkmarkDoneOutline,
      currentFacility,
      eComStores,
      hasPermission,
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