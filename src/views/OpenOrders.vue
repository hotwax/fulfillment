<template>
  <ion-page :key="router.currentRoute.value.path">
    <ViewSizeSelector menu-id="view-size-selector-open" content-id="view-size-selector" :total="filteredOrders.length" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!filteredOrders.length && !loadState.loaded">{{ translate("Loading orders") }}</ion-title>
        <ion-title v-else-if="!filteredOrders.length">{{ filteredOrders.length }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ visibleOrders.length }} {{ translate('of') }} {{ filteredOrders.length }} {{ translate('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="viewNotifications()">
            <ion-icon slot="icon-only" :icon="notificationsOutline" :color="(unreadNotificationsStatus && notifications.length) ? 'primary' : ''" />
          </ion-button>
          <ion-button :disabled="!userStore.hasPermission(Actions.APP_RECYCLE_ORDER) || !allOrders.length || isRejecting" fill="clear" color="danger" @click="recycleOutstandingOrders()">
            {{ translate("Reject all") }}
          </ion-button>
          <ion-menu-button menu="view-size-selector-open" :disabled="!allOrders.length">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
        <ion-progress-bar v-if="!loadState.loaded" :type="loadState.progress === undefined ? 'indeterminate' : 'determinate'" :value="loadState.progress" />
      </ion-toolbar>
    </ion-header>

    <ion-content id="view-size-selector">
      <ion-searchbar class="searchbar" :value="searchQuery" :placeholder="translate('Search orders')" :debounce="200" @ionInput="searchQuery = $event.detail.value ?? ''" />
      <div class="filters" v-for="dimension in filterableDimensions" :key="dimension.id">
        <ion-item lines="none" v-for="facet in facets[dimension.id]" :key="facet.value">
          <ion-checkbox label-placement="end" :checked="isFilterSelected(dimension.id, facet.value)" @ionChange="toggleFilter(dimension.id, facet.value)">
            <ion-label>
              {{ filterValueLabel(dimension.id, facet.value) }}
              <p>{{ facet.orderCount }} {{ translate("orders") }}, {{ facet.itemCount }} {{ translate("items") }}</p>
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>
      <div v-if="visibleOrders.length">
        <TransitionGroup tag="div" name="order" class="results">
          <ion-button key="print-picklist" class="bulk-action desktop-only" size="large" @click="assignPickers">{{ translate("Print Picklist") }}</ion-button>

          <ion-card class="order" v-for="order in visibleOrders" :key="order.orderKey">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ order.customerName }}</strong>
                  <p>{{ translate("Ordered") }} {{ commonUtil.formatUtcDate(order.orderDate, userStore.currentTimeZoneId, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
                </ion-label>
              </div>

              <div class="order-tags">
                <ion-chip @click.stop="orderActionsPopover(order, $event)" outline>
                  <ion-icon :icon="pricetagOutline" />
                  <ion-label>{{ order.orderName }}</ion-label>
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </div>

              <div class="order-metadata">
                <ion-label>
                  {{ shipmentMethodLabel(order.shipmentMethodTypeId) }}
                  <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ commonUtil.formatUtcDate(order.reservedDatetime, userStore.currentTimeZoneId, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="order.orderId + item.orderItemSeqId" class="order-item">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                    <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl" size="small" />
                  </ion-thumbnail>
                  <ion-label v-if="getProduct(item.productId).productId || loadState.loaded">
                    <p class="overline">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    <div>
                      {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                      <ion-badge class="kit-badge" color="dark" v-if="orderUtil.isKit(item)">{{ translate("Kit") }}</ion-badge>
                    </div>
                    <p>{{ commonUtil.getFeatures(getProduct(item.productId).productFeatures) }}</p>
                  </ion-label>
                  <!-- Until the product is in. -->
                  <ion-label v-else>
                    <p class="overline"><ion-skeleton-text animated /></p>
                    <ion-skeleton-text animated />
                    <p><ion-skeleton-text animated /></p>
                  </ion-label>
                </ion-item>
              </div>
              <div class="product-metadata">
                <ion-button v-if="orderUtil.isKit(item)" fill="clear" size="small" @click.stop="toggleKitComponents(order, item)">
                  <ion-icon v-if="isKitExpanded(order, item)" color="medium" slot="icon-only" :icon="chevronUpOutline" />
                  <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline" />
                </ion-button>
                <ion-note v-if="getProductStock(item.productId).qoh">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                <ion-button fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                  <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                </ion-button>
              </div>
              <div v-if="isKitExpanded(order, item)" class="kit-components">
                <template v-if="!getProduct(item.productId)?.productComponents">
                  <ion-item lines="none">
                    <ion-skeleton-text animated style="height: 80%;" />
                  </ion-item>
                  <ion-item lines="none">
                    <ion-skeleton-text animated style="height: 80%;" />
                  </ion-item>
                </template>
                <template v-else>
                  <ion-item v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index" lines="none">
                    <ion-thumbnail slot="start" v-image-preview="getProduct(productComponent.productIdTo)" :key="getProduct(productComponent.productIdTo)?.mainImageUrl">
                      <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" :key="getProduct(productComponent.productIdTo).mainImageUrl" size="small" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                      {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                      <p>{{ commonUtil.getFeatures(getProduct(productComponent.productIdTo).productFeatures) }}</p>
                    </ion-label>
                  </ion-item>
                </template>
              </div>
            </div>
          </ion-card>
        </TransitionGroup>
      </div>
      <div v-if="!visibleOrders.length && !loadState.loaded" class="ion-padding ion-text-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      <ion-fab v-else-if="visibleOrders.length" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="assignPickers">
          <ion-icon :icon="printOutline" />
        </ion-fab-button>
      </ion-fab>
      <div class="empty-state" v-else>
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonButtons, IonCard, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonMenuButton, IonNote, IonPage, IonProgressBar, IonSearchbar, IonSkeletonText, IonSpinner, IonThumbnail, IonTitle, IonToolbar, alertController, modalController, onIonViewWillEnter, popoverController } from "@ionic/vue";
import { computed, nextTick, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { caretDownOutline, chevronUpOutline, cubeOutline, listOutline, notificationsOutline, optionsOutline, pricetagOutline, printOutline } from "ionicons/icons";
import { useLiveOpenOrders } from "@/composables/useLiveOpenOrders";
import { liveOrdersStatus, refreshLiveOrders } from "@/db/liveOrdersSync";
import type { FilterSelections } from "@/utils/openOrderFilters";
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import { commonUtil, DxpShopifyImg, emitter, logger, translate, useNotificationStore } from "@common";
import ViewSizeSelector from "@/components/ViewSizeSelector.vue";
import OrderActionsPopover from "@/components/OrderActionsPopover.vue";
import { orderUtil } from "@/utils/orderUtil";

import { useOrderStore } from "@/store/order";
import { useCarrierStore } from "@/store/carrier";
import { useProductStore } from "@/store/product";
import { useStockStore } from "@/store/stock";
import { useUtilStore } from "@/store/util";
import { useUserStore } from "@/store/user";
import { useProductStore as useAppProductStore } from "@/store/productStore";
import router from "@/router";
import Actions from "@/authorization/actions";

// Picking from data this old risks orders that already left the queue.
const STALE_AFTER_MS = 5 * 60 * 1000;

const userStore = useUserStore();
const carrierStore = useCarrierStore();

const searchQuery = ref("");
const selections = ref<FilterSelections>({});
const isRejecting = ref(false);
const expandedKitKeys = ref(new Set<string>());

const openOrders = computed(() => useOrderStore().getOpenOrders);
const notifications = computed(() => useNotificationStore().getNotifications);
const unreadNotificationsStatus = computed(() => useNotificationStore().getUnreadNotificationsStatus);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const getShipmentMethodDesc = (shipmentMethodId: string) => useUtilStore().getShipmentMethodDesc(shipmentMethodId);
const getProductStock = (productId: string) => useStockStore().getProductStock(productId);
const currentFacility = computed(() => useAppProductStore().getCurrentFacility);
const currentProductStore = computed(() => useAppProductStore().getCurrentProductStore);
const productIdentificationPref = computed(() => useAppProductStore().getProductIdentificationPref);

// Until the facility's fill is done, an empty local queue doesn't mean the facility has no orders.
const { allOrders, filteredOrders, visibleOrders, facets, dimensions, shipmentMethodLabels, loadState } = useLiveOpenOrders({
  facilityId: computed(() => currentFacility.value?.facilityId),
  productStoreId: computed(() => currentProductStore.value?.productStoreId),
  query: searchQuery,
  selections,
  pickSize: computed(() => Number(openOrders.value.query.viewSize) || Number(import.meta.env.VITE_VIEW_SIZE))
});

// Orders cached by an earlier session stay stale until this session has synced.
const isStale = () => !liveOrdersStatus.lastSyncAt || Date.now() - liveOrdersStatus.lastSyncAt > STALE_AFTER_MS;
// A dimension with no values yet (for example tags before products load) stays hidden.
const filterableDimensions = computed(() => dimensions.value.filter((dimension: any) => facets.value[dimension.id]?.length));

const shipmentMethodLabel = (shipmentMethodTypeId: string) => shipmentMethodLabels.value.get(shipmentMethodTypeId) || getShipmentMethodDesc(shipmentMethodTypeId) || shipmentMethodTypeId;
const filterValueLabel = (dimensionId: string, value: string) => dimensionId === "shipmentMethod" ? shipmentMethodLabel(value) : value;
const isFilterSelected = (dimensionId: string, value: string) => (selections.value[dimensionId] ?? []).includes(value);

const toggleFilter = (dimensionId: string, value: string) => {
  const selected = selections.value[dimensionId] ?? [];
  selections.value = { ...selections.value, [dimensionId]: selected.includes(value) ? selected.filter((selectedValue) => selectedValue !== value) : [...selected, value] };
};

const getErrorMessage = () => {
  const hasFilters = Object.values(selections.value).some((values) => values.length);
  if(!searchQuery.value && hasFilters) {return translate("No orders match the selected filters.");}

  return searchQuery.value ? (hasFilters ? translate("No results found for . Try using different filters.", { searchedQuery: searchQuery.value }) : translate("No results found for . Try searching In Progress or Completed tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: searchQuery.value, lineBreak: "<br />" })) : translate("doesn't have any outstanding orders right now.", { facilityName: currentFacility.value?.facilityName });
};

const viewNotifications = () => {
  useUserStore().setUnreadNotificationsStatus(false);
  router.push({ path: "/notifications" });
};

const kitKey = (order: any, item: any) => `${order.orderKey}-${item.orderItemSeqId}`;
const isKitExpanded = (order: any, item: any) => expandedKitKeys.value.has(kitKey(order, item));

// The order views are rebuilt as they sync, so the open kits are kept here rather than on the items.
const toggleKitComponents = (order: any, item: any) => {
  const key = kitKey(order, item);
  const expanded = new Set(expandedKitKeys.value);
  if(expanded.has(key)) {
    expanded.delete(key);
  } else {
    expanded.add(key);
    useProductStore().fetchProductComponents({ productId: item.productId });
  }
  expandedKitKeys.value = expanded;
};

const assignPickers = async () => {
  if(isStale()) {
    emitter.emit("presentLoader");
    try {
      await refreshLiveOrders();
      await nextTick();
    } finally {
      emitter.emit("dismissLoader");
    }
    // The refresh failed, so the orders on screen may have left the queue.
    if(isStale()) {
      commonUtil.showToast(translate("Failed to create picklist for orders"));

      return;
    }
  }

  const assignPickerModal = await modalController.create({
    component: AssignPickerModal,
    componentProps: { orders: visibleOrders.value }
  });

  return assignPickerModal.present();
};

const updateOrderQuery = async (size: any) => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewSize = size;
  await useOrderStore().updateOpenOrderQuery({ ...openOrdersQuery });
};

const initialiseOrderQuery = async () => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewSize = import.meta.env.VITE_VIEW_SIZE;
  await useOrderStore().updateOpenOrderQuery({ ...openOrdersQuery });
};

const recycleOutstandingOrders = async () => {
  const alert = await alertController.create({
    header: translate("Reject all open orders"),
    message: translate("Reject open orders.", { ordersCount: allOrders.value.length }),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Reject"),
      handler: async () => {
        isRejecting.value = true;
        emitter.emit("presentLoader");
        await alert.dismiss();

        let resp;

        try {
          resp = await useOrderStore().recycleOutstandingOrders({
            facilityId: currentFacility.value?.facilityId,
            productStoreId: currentProductStore.value.productStoreId,
            reasonId: "INACTIVE_STORE"
          }) as any;


          if (!commonUtil.hasError(resp)) {
            commonUtil.showToast(translate("Rejecting has been started. All outstanding orders will be rejected shortly."));
          } else {
            throw resp.data;
          }
        } catch (err) {
          commonUtil.showToast(translate("Failed to reject outstanding orders"));
          logger.error("Failed to reject outstanding orders", err);
        }
        emitter.emit("dismissLoader");
      }
    }]
  });
  await alert.present();
};

const orderActionsPopover = async (order: any, ev: Event) => {
  const popover = await popoverController.create({
    component: OrderActionsPopover,
    componentProps: {
      order,
      category: "open"
    },
    showBackdrop: false,
    event: ev
  });
  return popover.present();
};

const fetchProductStock = (productId: string) => {
  useStockStore().fetchStock({ productId });
};

onIonViewWillEnter(async () => {
  await initialiseOrderQuery();
  emitter.on("updateOrderQuery", updateOrderQuery);
});

onBeforeRouteLeave(() => {
  emitter.off("updateOrderQuery", updateOrderQuery);
});
</script>

<style scoped>
.order-tags {
  display: flex;
  justify-content: space-between;
}

@media (max-width: 991px) {
  .order-item {
    border-bottom: none;
  }
}

/* Leaving cards are taken out of the flow, so the cards below can move into their place. */
.results {
  position: relative;
}

.order-move,
.order-enter-active,
.order-leave-active {
  transition: transform 220ms ease, opacity 220ms ease;
}

.order-enter-from,
.order-leave-to {
  opacity: 0;
}

.order-leave-active {
  position: absolute;
  inset-inline: 0;
}

@media (prefers-reduced-motion: reduce) {
  .order-move,
  .order-enter-active,
  .order-leave-active {
    transition: none;
  }
}
</style>
