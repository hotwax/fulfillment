<template>
  <ion-page :key="router.currentRoute.value.path">
    <ViewSizeSelector menu-id="view-size-selector-open" content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!openOrders.total">{{ openOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ openOrders.query.viewSize }} {{ translate('of') }} {{ openOrders.total }} {{ translate('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="viewNotifications()">
            <ion-icon slot="icon-only" :icon="notificationsOutline" :color="(unreadNotificationsStatus && notifications.length) ? 'primary' : ''" />
          </ion-button>
          <ion-button :disabled="!hasPermission(Actions.APP_RECYCLE_ORDER) || !openOrders.total || isRejecting" fill="clear" color="danger" @click="recycleOutstandingOrders()">
            {{ translate("Reject all") }}
          </ion-button>
          <ion-menu-button menu="view-size-selector-open" :disabled="!openOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="view-size-selector">
      <ion-searchbar class="searchbar" :value="openOrders.query.queryString" :placeholder="translate('Search orders')" @keyup.enter="updateQueryString($event.target.value)" />
      <div class="filters">
        <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
          <ion-checkbox label-placement="end" :checked="openOrders.query.selectedShipmentMethods.includes(method.val)" @ionChange="updateSelectedShipmentMethods(method.val)">
            <ion-label>
              {{ getShipmentMethodDesc(method.val) }}
              <p>{{ method.ordersCount }} {{ translate("orders") }}, {{ method.count }} {{ translate("items") }}</p>
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>
      <Component :is="productCategoryFilterExt" :orderQuery="openOrders.query" :currentFacility="currentFacility" :currentEComStore="currentEComStore" @updateOpenQuery="updateOpenQuery" />
      <div v-if="openOrders.total">
        <div class="results">
          <ion-button class="bulk-action desktop-only" size="large" @click="assignPickers">{{ translate("Print Picklist") }}</ion-button>

          <ion-card class="order" v-for="(order, index) in getOpenOrders()" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ order.customerName }}</strong>
                  <p>{{ translate("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
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
                  {{ getShipmentMethodDesc(order.shipmentMethodTypeId) }}
                  <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="order.orderId + item.orderItemSeqId" class="order-line-item">
              <div class="order-item">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl" size="small" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                      <div>
                        {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                        <ion-badge class="kit-badge" color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                      </div>
                      <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
                    </ion-label>
                  </ion-item>
                </div>
                <div class="product-metadata">
                  <ion-button v-if="isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item)">
                    <ion-icon v-if="item.showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline" />
                    <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline" />
                  </ion-button>
                  <ion-note v-if="getProductStock(item.productId).qoh">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                  <ion-button fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                </div>
              </div>
              <div v-if="item.showKitComponents && !getProduct(item.productId)?.productComponents" class="kit-components">
                <ion-item lines="none">
                  <ion-skeleton-text animated style="height: 80%;" />
                </ion-item>
                <ion-item lines="none">
                  <ion-skeleton-text animated style="height: 80%;" />
                </ion-item>
              </div>
              <div v-else-if="item.showKitComponents && getProduct(item.productId)?.productComponents" class="kit-components">
                <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" v-image-preview="getProduct(productComponent.productIdTo)" :key="getProduct(productComponent.productIdTo)?.mainImageUrl">
                      <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" :key="getProduct(productComponent.productIdTo).mainImageUrl" size="small" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                      {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                      <p>{{ getFeatures(getProduct(productComponent.productIdTo).productFeatures) }}</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </div>
            </div>
          </ion-card>

          <ion-infinite-scroll @ionInfinite="loadMoreOpenOrders($event)" threshold="100px" v-show="isOpenOrdersScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </div>
      </div>
      <div v-if="isLoadingOrders" class="ion-padding ion-text-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      <ion-fab v-else-if="openOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
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
import { IonBadge, IonButton, IonButtons, IonCard, IonChip, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSkeletonText, IonThumbnail, IonTitle, IonToolbar, alertController, modalController, onIonViewWillEnter, popoverController } from "@ionic/vue";
import { computed, ref } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { caretDownOutline, chevronUpOutline, cubeOutline, listOutline, notificationsOutline, optionsOutline, pricetagOutline, printOutline } from "ionicons/icons";
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import { getProductIdentificationValue, DxpShopifyImg, useProductIdentificationStore, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import { formatUtcDate, getFeatures, getFacilityFilter, hasActiveFilters, showToast } from "@/utils";
import { hasError } from "@/adapter";
import { UtilService } from "@/services/UtilService";
import { prepareSolrQuery } from "@/utils/solrHelper";
import ViewSizeSelector from "@/components/ViewSizeSelector.vue";
import emitter from "@/event-bus";
import logger from "@/logger";
import { translate } from "@hotwax/dxp-components";
import { Actions, hasPermission } from "@/authorization";
import OrderActionsPopover from "@/components/OrderActionsPopover.vue";
import { isKit } from "@/utils/order";
import { OrderService } from "@/services/OrderService";
import { useDynamicImport } from "@/utils/moduleFederation";
import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useStockStore } from "@/store/stock";
import { useUtilStore } from "@/store/util";
import { useUserStore } from "@/store/user";

const router = useRouter();
const shipmentMethods = ref([] as Array<any>);
const searchedQuery = ref("");
const isScrollingEnabled = ref(false);
const isRejecting = ref(false);
const productCategoryFilterExt = ref("" as any);
const selectedShipmentMethods = ref([] as any);
const isLoadingOrders = ref(false);

const contentRef = ref();
const infiniteScrollRef = ref();

const openOrders = computed(() => useOrderStore().getOpenOrders);
const notifications = computed(() => useUserStore().getNotifications);
const unreadNotificationsStatus = computed(() => useUserStore().getUnreadNotificationsStatus);
const instanceUrl = computed(() => useUserStore().getInstanceUrl);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const getShipmentMethodDesc = (shipmentMethodId: string) => useUtilStore().getShipmentMethodDesc(shipmentMethodId);
const getProductStock = (productId: string) => useStockStore().getProductStock(productId);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);
const currentEComStore = computed(() => useDxpUserStore().getCurrentEComStore);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

const updateOpenQuery = (payload: any) => {
  useOrderStore().updateOpenQuery(payload);
};

const getErrorMessage = () => {
  return searchedQuery.value ? (hasActiveFilters(openOrders.value.query) ? translate("No results found for . Try using different filters.", { searchedQuery: searchedQuery.value }) : translate("No results found for . Try searching In Progress or Completed tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: searchedQuery.value, lineBreak: "<br />" })) : translate("doesn't have any outstanding orders right now.", { facilityName: currentFacility.value?.facilityName });
};

const viewNotifications = () => {
  useUserStore().setUnreadNotificationsStatus(false);
  router.push({ path: "/notifications" });
};

const getOpenOrders = () => {
  return JSON.parse(JSON.stringify(openOrders.value.list)).slice(0, (openOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
};

const enableScrolling = () => {
  const parentElement = contentRef.value?.$el;
  const scrollEl = parentElement?.shadowRoot?.querySelector("main[part='scroll']");
  if (!scrollEl || !infiniteScrollRef.value?.$el) return;
  const scrollHeight = scrollEl.scrollHeight;
  const infiniteHeight = infiniteScrollRef.value.$el.offsetHeight;
  const scrollTop = scrollEl.scrollTop;
  const threshold = 100;
  const height = scrollEl.offsetHeight;
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height;
  isScrollingEnabled.value = !(distanceFromInfinite < 0);
};

const loadMoreOpenOrders = async (event: any) => {
  if (!(isScrollingEnabled.value && isOpenOrdersScrollable())) {
    await event.target.complete();
  }
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewIndex++;
  await useOrderStore().updateOpenOrderIndex({ ...openOrdersQuery });
  event.target.complete();
};

const isOpenOrdersScrollable = () => {
  return ((openOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) < openOrders.value.query.viewSize;
};

const updateSelectedShipmentMethods = async (method: string) => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  const updatedShipmentMethods = openOrdersQuery.selectedShipmentMethods;
  const index = updatedShipmentMethods.indexOf(method);
  if (index < 0) {
    updatedShipmentMethods.push(method);
  } else {
    updatedShipmentMethods.splice(index, 1);
  }

  openOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  openOrdersQuery.selectedShipmentMethods = updatedShipmentMethods;
  selectedShipmentMethods.value = updatedShipmentMethods;

  useOrderStore().updateOpenQuery({ ...openOrdersQuery });
};

const fetchKitComponents = async (orderItem: any) => {
  useProductStore().fetchProductComponents({ productId: orderItem.productId });
  const updatedOrder = openOrders.value.list.find((order: any) => order.orderId === orderItem.orderId);
  const updatedItem = updatedOrder.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
  updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;
};

const assignPickers = async () => {
  const assignPickerModal = await modalController.create({
    component: AssignPickerModal
  });
  return assignPickerModal.present();
};

const fetchShipmentMethods = async () => {
  let resp: any;

  const payload = prepareSolrQuery({
    docType: "ORDER",
    viewSize: "0",
    isGroupingRequired: false,
    filters: {
      "-shipmentMethodTypeId": { value: ["STOREPICKUP", "POS_COMPLETED"] },
      orderStatusId: { value: "ORDER_APPROVED" },
      orderTypeId: { value: "SALES_ORDER" },
      productStoreId: { value: currentEComStore.value.productStoreId },
      ...getFacilityFilter(currentFacility.value?.facilityId)
    },
    solrFilters: [
      "((*:* -fulfillmentStatus: [* TO *]) OR fulfillmentStatus:Created)",
      "entryDate:[2025-01-01T00:00:00Z TO *]"
    ],
    facet: {
      shipmentMethodTypeIdFacet: {
        excludeTags: "shipmentMethodTypeIdFilter",
        field: "shipmentMethodTypeId",
        mincount: 1,
        limit: -1,
        sort: "index",
        type: "terms",
        facet: {
          ordersCount: "unique(orderId)"
        }
      }
    }
  });

  try {
    resp = await UtilService.fetchShipmentMethods(payload);
    if (resp.status == 200 && !hasError(resp) && resp.data.facets?.count > 0) {
      shipmentMethods.value = resp.data.facets.shipmentMethodTypeIdFacet.buckets;
      useUtilStore().fetchShipmentMethodTypeDesc(shipmentMethods.value.map((shipmentMethod: any) => shipmentMethod.val));
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch shipment methods information", err);
  }
};

const updateQueryString = async (queryString: string) => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  openOrdersQuery.queryString = queryString;
  await useOrderStore().updateOpenQuery({ ...openOrdersQuery });
  searchedQuery.value = queryString;
};

const updateOrderQuery = async (size: any) => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewSize = size;
  await useOrderStore().updateOpenQuery({ ...openOrdersQuery });
};

const initialiseOrderQuery = async () => {
  const openOrdersQuery = JSON.parse(JSON.stringify(openOrders.value.query));
  openOrdersQuery.viewIndex = 0;
  openOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  if (selectedShipmentMethods.value?.length) openOrdersQuery.selectedShipmentMethods = selectedShipmentMethods.value;
  await useOrderStore().updateOpenQuery({ ...openOrdersQuery });
};

const recycleOutstandingOrders = async () => {
  const alert = await alertController.create({
    header: translate("Reject all open orders"),
    message: translate("Reject open orders.", { ordersCount: openOrders.value.total }),
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
          resp = await OrderService.recycleOutstandingOrders({
            facilityId: currentFacility.value?.facilityId,
            productStoreId: currentEComStore.value.productStoreId,
            reasonId: "INACTIVE_STORE"
          });

          if (!hasError(resp)) {
            showToast(translate("Rejecting has been started. All outstanding orders will be rejected shortly."));
          } else {
            throw resp.data;
          }
        } catch (err) {
          showToast(translate("Failed to reject outstanding orders"));
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
  isScrollingEnabled.value = false;
  isLoadingOrders.value = true;
  try {
    await Promise.all([initialiseOrderQuery(), fetchShipmentMethods()]);
  } finally {
    isLoadingOrders.value = false;
  }
  const instance = instanceUrl.value.split("-")[0].replace(new RegExp("^(https|http)://"), "").replace(new RegExp("/api.*"), "").replace(new RegExp(":.*"), "");
  productCategoryFilterExt.value = await useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_ProductCategoryFilter` });
  emitter.on("updateOrderQuery", updateOrderQuery);
});

onBeforeRouteLeave(() => {
  useOrderStore().clearOpenOrders();
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
</style>
