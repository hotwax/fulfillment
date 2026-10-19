<template>
  <ion-page :key="pageKey">
    <ViewSizeSelector menu-id="view-size-selector-completed" content-id="view-size-selector" :total="filteredOrders.length" :view-size="pageSize" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!completedOrders.total">{{ completedOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ completedOrders.query.viewSize }} {{ translate('of') }} {{ completedOrders.total }} {{ completedOrders.total === 1 ? translate('order') : translate('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-menu-button menu="view-size-selector-completed" :disabled="!completedOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="view-size-selector">
      <ion-searchbar class="searchbar" :placeholder="translate('Search orders')" v-model="queryString" />
      <ion-radio-group v-if="carrierPartyIds?.length" v-model="selectedCarrierPartyId" @ionChange="resetPage()">
        <ion-row class="filters">
          <ion-item lines="none">
            <ion-radio label-placement="end" value="">
              <ion-label class="ion-text-wrap">
                {{ translate("All") }}
              </ion-label>
            </ion-radio>
          </ion-item>
          <ion-item lines="none" v-for="carrierPartyId in carrierPartyIds" :key="carrierPartyId">
            <ion-radio label-placement="end" :value="carrierPartyId">
              <ion-label>
                {{ getPartyName(carrierPartyId) }}
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-row>
      </ion-radio-group>

      <div v-if="shipmentMethods?.length" class="filters">
        <ion-item lines="none" v-for="shipmentMethod in shipmentMethods" :key="shipmentMethod">
          <ion-checkbox label-placement="end" :checked="selectedShipmentMethods.includes(shipmentMethod)" @ionChange="updateSelectedShipmentMethods(shipmentMethod)">
            <ion-label>
              {{ getShipmentMethodDesc(shipmentMethod) }}
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>

      <div v-if="completedOrders.total">
        <div class="results">
          <ion-button :disabled="!canShipNow || hasAnyMissingInfo() || (hasAnyShipmentTrackingInfoMissing() && !userStore.hasPermission(Actions.APP_FORCE_SHIP_ORDER))" expand="block" class="bulk-action desktop-only" fill="outline" size="large" @click="bulkShipOrders()">{{ translate("Ship") }}</ion-button>
          <ion-card class="order" v-for="(order, index) in completedOrdersList" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ order.customerName }}</strong>
                  <p>{{ translate("Ordered") }} {{ getTime(order.orderDate) }}</p>
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
                  <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ getTime(order.reservedDatetime) }}</p>
                  <template v-if="order.packageTrackings?.length > 1">
                    <p v-for="tracking in order.packageTrackings" :key="tracking.packageName">{{ translate("Box") }} {{ tracking.packageName }}: {{ tracking.trackingCode }}</p>
                  </template>
                  <p v-else-if="order.trackingCode">{{ translate("Tracking Code") }} {{ order.trackingCode }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="order.shipmentId + item.shipmentItemSeqId" class="order-item">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                    <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl" size="small" />
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    <div>
                      {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                      <ion-badge class="kit-badge" color="dark" v-if="orderUtil.isKit(item)">{{ translate("Kit") }}</ion-badge>
                    </div>
                    <p>{{ commonUtil.getFeatures(getProduct(item.productId).productFeatures) }}</p>
                  </ion-label>
                </ion-item>
              </div>
              <div class="product-metadata">
                <ion-button v-if="orderUtil.isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item)">
                  <ion-icon v-if="item.showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline" />
                  <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline" />
                </ion-button>
                <ion-button color="medium" fill="clear" size="small" v-if="item.productTypeId === 'GIFT_CARD'" @click="openGiftCardActivationModal(item)">
                  <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline" />
                </ion-button>
                <ion-note v-if="getProductStock(item.productId).qoh">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                <ion-button fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                  <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                </ion-button>
              </div>
              <div v-if="item.showKitComponents" class="kit-components">
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

            <div class="mobile-only">
              <ion-item>
                <ion-button :disabled="!canShipNow || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !userStore.hasPermission(Actions.APP_FORCE_SHIP_ORDER))" fill="clear" @click.stop="shipOrder(order)">{{ translate("Ship Now") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click.stop="shippingPopover(order, $event)">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <div class="actions">
              <div class="desktop-only">
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true">{{ translate("Shipped") }}</ion-button>
                <ion-button v-else :disabled="!canShipNow || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !userStore.hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click.stop="shipOrder(order)">{{ translate("Ship Now") }}</ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="regenerateShippingLabel(order)">
                  {{ translate(order.missingLabelImage ? "Regenerate Shipping Label" : "Print Shipping Label") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingShippingLabel" name="crescent" />
                </ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="localPrintPackingSlip(order)">
                  {{ translate("Print Customer Letter") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingPackingSlip" name="crescent" />
                </ion-button>

              </div>
              <div class="desktop-only">
                <ion-button v-if="order.missingLabelImage" fill="outline" @click.stop="showShippingLabelErrorModal(order)">{{ translate("Shipping label error") }}</ion-button>
                <ion-button :disabled="!canUnpack || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" fill="outline" color="danger" @click.stop="unpackOrder(order)">{{ translate("Unpack") }}</ion-button>
              </div>
            </div>
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreCompletedOrders($event)" threshold="100px" v-show="isCompletedOrderScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </div>
      </div>
      <div v-if="!isLoaded" class="results">
        <ion-card v-for="index in 3" :key="index" class="order">
          <ion-item lines="none"><ion-skeleton-text animated style="height: 28px;" /></ion-item>
          <ion-item lines="none"><ion-skeleton-text animated style="height: 64px;" /></ion-item>
        </ion-card>
      </div>
      <ion-fab v-else-if="completedOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :disabled="!canShipNow || hasAnyMissingInfo() || (hasAnyShipmentTrackingInfoMissing() && !userStore.hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click="bulkShipOrders()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
      <div class="empty-state" v-else>
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>

    <ion-footer v-if="selectedCarrierPartyId">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="outline" color="primary" @click="openHistoricalManifestModal">
            <ion-icon slot="start" :icon="timeOutline" />
            {{ translate("View historical manifests") }}
          </ion-button>
          <ion-button fill="solid" color="primary" :disabled="!carrierConfiguration[selectedCarrierPartyId]?.['MANIFEST_GEN_REQUEST']" @click="generateCarrierManifest">
            <ion-icon slot="start" :icon="printOutline" />
            {{ translate("Generate Manifest") }}
            <ion-spinner name="crescent" slot="end" v-if="isGeneratingManifest" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonButtons, IonCard, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonMenuButton, IonNote, IonPage, IonRadio, IonRadioGroup, IonRow, IonSearchbar, IonSkeletonText, IonSpinner, IonThumbnail, IonTitle, IonToolbar, alertController, modalController, onIonViewWillEnter, popoverController } from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import router from "@/router";
import { caretDownOutline, chevronUpOutline, cubeOutline, printOutline, gift, giftOutline, listOutline, pricetagOutline, ellipsisVerticalOutline, checkmarkDoneOutline, optionsOutline, timeOutline } from "ionicons/icons";
import Popover from "@/views/ShippingPopover.vue";
import { commonUtil, DxpShopifyImg, emitter, logger, translate } from "@common";
import { useProductStore as useProductStore } from "@/store/productStore";
import { useUserStore } from "@/store/user";

const userStore = useUserStore();
import ViewSizeSelector from "@/components/ViewSizeSelector.vue";

import ShippingLabelErrorModal from "@/components/ShippingLabelErrorModal.vue";


import OrderActionsPopover from "@/components/OrderActionsPopover.vue";
import { orderUtil } from "@/utils/orderUtil";
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { DateTime } from "luxon";
import HistoricalManifestModal from "@/components/HistoricalManifestModal.vue";
import { useOrderStore } from "@/store/order";
import { useCarrierStore } from "@/store/carrier";
import { useLiveShipments } from "@/composables/useLiveShipments";
import { hideShipmentsLocally, refreshLiveOrders } from "@/db/appDbSync";
import { SHIPMENTS_DOMAIN } from "@/db/domains";
import { SHIPMENT_STAGE } from "@/db/fulfillmentDb";
import { filterShipments } from "@/utils/shipmentView";
import { useProductStore as useProduct } from "@/store/product";
import { useStockStore } from "@/store/stock";
import { useUtilStore } from "@/store/util";
import Actions from "@/authorization/actions";
// Keyed by the route this page was opened on, read once. It used to follow the current route, which rebuilt the page that was
// being left (cards, thumbnails and all) in the middle of every navigation.
const pageKey = router.currentRoute.value.path;

const orderStore = useOrderStore();
const carrierStore = useCarrierStore();

const queryString = ref("");
const isScrollingEnabled = ref(false);
const selectedCarrierPartyId = ref("");
const carrierConfiguration = ref({} as any);
const isGeneratingManifest = ref(false);
const selectedShipmentMethods = ref([] as string[]);

const contentRef = ref();
const infiniteScrollRef = ref();

// The packed shipments are read from the app database, which the sync keeps current, so the page never fetches its own list.
const currentFacilityId = computed(() => useProductStore().getCurrentFacility?.facilityId as string | undefined);
const currentProductStoreId = computed(() => useProductStore().getCurrentProductStore?.productStoreId as string | undefined);
const live = useLiveShipments({ facilityId: currentFacilityId, productStoreId: currentProductStoreId, stage: SHIPMENT_STAGE.COMPLETED });
const isLoaded = live.loaded;
const pageSize = ref(Number(import.meta.env.VITE_VIEW_SIZE) || 10);
const viewIndex = ref(0);

// What the filters offer is what the shipments have.
const shipmentMethods = computed(() => [...new Set(live.shipments.value.map((order: any) => order.shipmentMethodTypeId).filter(Boolean))] as string[]);
const carrierPartyIds = computed(() => [...new Set(live.shipments.value.map((order: any) => order.carrierPartyId).filter(Boolean))] as string[]);

const filteredOrders = computed(() => filterShipments(live.shipments.value, {
  query: queryString.value,
  carrierPartyId: selectedCarrierPartyId.value,
  shipmentMethodTypeIds: selectedShipmentMethods.value
}));
const completedOrdersList = computed(() => filteredOrders.value.slice(0, (viewIndex.value + 1) * pageSize.value));
// Shaped as the page has always read it: the shipments, how many there are, and how many are showing.
const completedOrders = computed(() => ({
  list: live.shipments.value,
  total: filteredOrders.value.length,
  query: { viewSize: completedOrdersList.value.length, viewIndex: viewIndex.value, queryString: queryString.value, selectedShipmentMethods: selectedShipmentMethods.value }
}));

const resetPage = () => { viewIndex.value = 0; };
watch(queryString, resetPage);
// A filter whose shipments have all gone no longer applies.
watch(shipmentMethods, (methods) => { selectedShipmentMethods.value = selectedShipmentMethods.value.filter((method) => methods.includes(method)); });
watch(carrierPartyIds, (carriers) => {
  if(selectedCarrierPartyId.value && !carriers.includes(selectedCarrierPartyId.value)) {selectedCarrierPartyId.value = "";}
  // The carrier names, for the filter chips.
  if(carriers.length) {void useUtilStore().fetchPartyInformation(carriers);}
}, { immediate: true });
// Manifests are needed only once a carrier is chosen.
watch(selectedCarrierPartyId, async (carrierPartyId) => {
  if(!carrierPartyId) {return;}
  await fetchConfiguredCarrierService([carrierPartyId]);
  await fetchCarrierManifestInformation([carrierPartyId]);
});

// Asks the worker for a fresh pass over the shipments, rather than the page fetching them itself.
const refreshShipments = () => refreshLiveOrders([SHIPMENTS_DOMAIN]);

const getProduct = (productId: string) => useProduct().getProduct(productId);
const getPartyName = (partyId: string) => useUtilStore().getPartyName(partyId);
const getShipmentMethodDesc = (shipmentMethodId: string) => live.shipmentMethodLabels.value.get(shipmentMethodId) ?? useUtilStore().getShipmentMethodDesc(shipmentMethodId);
const getProductStock = (productId: string) => useStockStore().getProductStock(productId);
const productStoreShipmentMethCount = computed(() => useProductStore().getProductStoreShipmentMethCount);
const isProductStoreSettingEnabled = computed(() => (settingTypeEnumId: string) => useProductStore().isProductStoreSettingEnabled(settingTypeEnumId));
const currentFacility = computed(() => useProductStore().getCurrentFacility);
const productIdentificationPref = computed(() => useProductStore().getProductIdentificationPref);
const canShipNow = computed(() => userStore.hasPermission(Actions.APP_SHIP_ORDER));
const canUnpack = computed(() => userStore.hasPermission(Actions.APP_UNPACK_ORDER));

const getTime = (time: any) => {
  return time ? DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED) : "";
};

const getErrorMessage = () => {
  return queryString.value ? ((selectedCarrierPartyId.value || selectedShipmentMethods.value.length) ? translate("No results found for . Try using different filters.", { searchedQuery: queryString.value }) : translate("No results found for . Try searching In Progress or Open tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: queryString.value, lineBreak: "<br />" })) : translate("doesn't have any completed orders right now.", { facilityName: currentFacility.value?.facilityName });
};

const hasAnyMissingInfo = () => {
  return filteredOrders.value.some((order: any) => {
    return order.hasMissingShipmentInfo || order.hasMissingPackageInfo;
  });
};

const fetchKitComponents = async (orderItem: any) => {
  await useProduct().fetchProductComponents({ productId: orderItem.productId });
  const updatedOrder = completedOrders.value.list.find((order: any) => order.shipmentId === orderItem.shipmentId);
  const updatedItem = updatedOrder?.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
  if(updatedItem) {updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;}
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

const loadMoreCompletedOrders = async (event: any) => {
  if (!(isScrollingEnabled.value && isCompletedOrderScrollable())) {
    await event.target.complete();
  }
  viewIndex.value++;
  event.target.complete();
};

const isCompletedOrderScrollable = () => {
  return completedOrdersList.value.length < filteredOrders.value.length;
};

// The result size menu.
const updateOrderQuery = (size: any) => {
  if(Number(size) > 0) {pageSize.value = Number(size);}
  viewIndex.value = 0;
};

const shipOrder = async (order: any) => {
  try {
    const resp = await orderStore.shipOrder({ shipmentId: order.shipmentId }) as any;


    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Order shipped successfully"));
      // Shipped: off the list at once, and the sync confirms it.
      hideShipmentsLocally([order.shipmentId]);
      void refreshShipments();
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to ship order", err);
    commonUtil.showToast(translate("Failed to ship order"));
  }
};

const bulkShipOrders = async () => {
  const packedOrdersCount = filteredOrders.value.filter((order: any) => {
    return hasPackedShipments(order);
  }).length;
  const shipOrderAlert = await alertController
    .create({
      header: translate("Ship orders"),
      message: translate("You are shipping orders. You cannot unpack and edit orders after they have been shipped. Are you sure you are ready to ship this orders?", { count: packedOrdersCount, space: "<br /><br />" }),
      buttons: [{
        role: "cancel",
        text: translate("Cancel")
      }, {
        text: translate("Ship"),
        handler: async () => {
          let orderList = JSON.parse(JSON.stringify(filteredOrders.value));
          orderList = orderList.filter((order: any) => order.statusId === "SHIPMENT_PACKED");
          const trackingRequiredOrders = orderList.filter((order: any) => isTrackingRequiredForAnyShipmentPackage(order));
          let trackingRequiredAndMissingCodeOrders = [] as any;
          if (trackingRequiredOrders.length) {
            trackingRequiredAndMissingCodeOrders = trackingRequiredOrders.filter((order: any) => !order.trackingCode).map((order: any) => order.shipmentId);
            if (trackingRequiredAndMissingCodeOrders.length) {
              orderList = orderList.filter((order: any) => !trackingRequiredAndMissingCodeOrders.includes(order.shipmentId));
            }
          }

          if (!orderList.length) {
            commonUtil.showToast(translate("No orders are currently able to be shipped due to missing tracking codes."));
            return;
          }

          const shipmentIds = orderList.map((order: any) => order.shipmentId);

          try {
            const resp = await orderStore.bulkShipOrders({ shipmentIds }) as any;


            if (!commonUtil.hasError(resp)) {
              !trackingRequiredAndMissingCodeOrders.length
                ? commonUtil.showToast(translate("Orders shipped successfully"))
                : commonUtil.showToast(translate("out of cannot be shipped due to missing tracking codes.", { remainingOrders: trackingRequiredAndMissingCodeOrders.length, totalOrders: packedOrdersCount }));
              hideShipmentsLocally(shipmentIds);
              void refreshShipments();
            } else {
              throw resp.data;
            }
          } catch (err) {
            logger.error("Failed to ship orders", err);
            commonUtil.showToast(translate("Failed to ship orders"));
          }
        }
      }]
    });
  return shipOrderAlert.present();
};

const shippingPopover = async (order: any, ev: Event) => {
  const popover = await popoverController.create({
    component: Popover,
    event: ev,
    translucent: true,
    showBackdrop: false,
    componentProps: {
          disablePrint: order.hasMissingShipmentInfo || order.hasMissingPackageInfo,
          disableUnpack: !canUnpack.value || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)
        }
  });

   popover.onDidDismiss().then((result) => {
      if (result.data) {
        const { action } = result.data;
        if (action === "printShippingLabel") regenerateShippingLabel(order);
        else if (action === "printPackingSlip") localPrintPackingSlip(order);
        else if (action === "unpack") unpackOrder(order);
      }
    });
  return popover.present();
};

const updateSelectedShipmentMethods = (method: string) => {
  const index = selectedShipmentMethods.value.indexOf(method);
  selectedShipmentMethods.value = index < 0 ? [...selectedShipmentMethods.value, method] : selectedShipmentMethods.value.filter((selected) => selected !== method);
  resetPage();
};

const unpackOrder = async (order: any) => {
  const unpackOrderAlert = await alertController
    .create({
      header: translate("Unpack"),
      message: translate("Unpacking this order will send it back to 'In progress' and it will have to be repacked."),
      buttons: [{
        role: "cancel",
        text: translate("Cancel")
      }, {
        text: translate("Unpack"),
        handler: async () => {
          try {
            const resp = await orderStore.unpackOrder({ shipmentId: order.shipmentId }) as any;


            if (resp.status == 200 && !commonUtil.hasError(resp)) {
              commonUtil.showToast(translate("Order unpacked successfully"));
              hideShipmentsLocally([order.shipmentId]);
              void refreshShipments();
            } else {
              throw resp.data;
            }
          } catch (err) {
            logger.error("Failed to unpack the order", err);
            commonUtil.showToast(translate("Failed to unpack the order"));
          }
        }
      }]
    });
  return unpackOrderAlert.present();
};

const hasPackedShipments = (order: any) => {
  return order.statusId === "SHIPMENT_PACKED";
};

const localPrintPackingSlip = async (order: any) => {
  if (order.isGeneratingPackingSlip) {
    return;
  }

  const shipmentIds = [order.shipmentId];
  order.isGeneratingPackingSlip = true;
  await orderStore.printPackingSlip(shipmentIds);
  order.isGeneratingPackingSlip = false;
};

const localPrintShippingLabel = async (order: any) => {
  const shipmentIds = [order.shipmentId];

  const shippingLabelPdfUrls: string[] = Array.from(
    new Set(
      (order.shipmentPackages ?? [])
        .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
        .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
    )
  );

  if (!shipmentIds?.length) {
    commonUtil.showToast(translate("Failed to generate shipping label"));
    return;
  }

  await orderStore.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackages);
  const internationalInvoiceUrls = order.shipmentPackages
    ?.filter((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl)
    .map((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl) || [];

  if (internationalInvoiceUrls.length > 0) {
    await orderStore.printCustomDocuments(internationalInvoiceUrls);
  }
};



const regenerateShippingLabel = async (order: any) => {
  if (productStoreShipmentMethCount.value <= 0) {
    commonUtil.showToast(translate("Unable to generate shipping label due to missing product store shipping method configuration"));
    return;
  }

  if (order.isGeneratingShippingLabel) {
    return;
  }

  order.isGeneratingShippingLabel = true;

  if (order.missingLabelImage) {
    const response = await orderUtil.retryShippingLabel(order);
    if (response?.isGenerated) {
      await localPrintShippingLabel(response.order);
    }
  } else {
    await localPrintShippingLabel(order);
  }


  order.isGeneratingShippingLabel = false;
  void refreshShipments();
};

const showShippingLabelErrorModal = async (order: any) => {
  const shippingLabelErrorModal = await modalController.create({
    component: ShippingLabelErrorModal,
    componentProps: {
      shipmentId: order.shipmentId
    }
  });
  return shippingLabelErrorModal.present();
};

const fetchProductStock = (productId: string) => {
  useStockStore().fetchStock({ productId });
};

const isTrackingRequiredForAnyShipmentPackage = (order: any) => {
  return order.isTrackingRequired === "Y";
};

const hasAnyShipmentTrackingInfoMissing = () => {
  return filteredOrders.value.some((order: any) => isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode);
};

const orderActionsPopover = async (order: any, ev: Event) => {
  const popover = await popoverController.create({
    component: OrderActionsPopover,
    componentProps: {
      order,
      category: "completed"
    },
    showBackdrop: false,
    event: ev
  });
  return popover.present();
};

const openGiftCardActivationModal = async (item: any) => {
  const modal = await modalController.create({
    component: GiftCardActivationModal,
    componentProps: { item }
  });

  modal.onDidDismiss().then((result: any) => {
    if (result.data?.isGCActivated) {
      useOrderStore().updateCurrentItemGCActivationDetails({ item, category: "completed", isDetailsPage: false });
    }
  });

  modal.present();
};

const fetchConfiguredCarrierService = async (carrierIds: Array<string>) => {
  const payload = {
    carrierPartyId: carrierIds,
    carrierPartyId_op: "in",
    shipmentMethodTypeId: "_NA_",
    requestType: ["MANIFEST_GEN_REQUEST", "MANIFEST_PRINT"],
    requestType_op: "in",
    pageIndex: 0,
    pageSize: carrierIds.length * 2
  };
  try {
    const resp = await carrierStore.fetchConfiguredCarrierService(payload);

    if (!commonUtil.hasError(resp) && resp.data?.length) {
      carrierConfiguration.value = resp.data.reduce((carriers: any, carrier: any) => {
        if (!carriers[carrier.carrierPartyId]) {
          carriers[carrier.carrierPartyId] = {
            [carrier.requestType]: carrier.serviceName
          };
        } else {
          carriers[carrier.carrierPartyId][carrier.requestType] = carrier.serviceName;
        }

        return carriers;
      }, {});
    }
  } catch (err) {
    logger.error("Failed to fetch carrier configuration information", err);
  }
};

const fetchCarrierManifestInformation = async (carrierIds: Array<string>) => {
  for (const partyId of carrierIds) {
    const payload = {
      customParametersMap: {
        partyId,
        fromDate_from: DateTime.now().startOf("day").minus({ days: 7 }).toMillis(),
        facilityId: currentFacility.value.facilityId,
        orderByField: "-contentId",
        pageIndex: 0,
        pageSize: 250
      },
      dataDocumentId: "ManifestContent",
      filterByDate: true
    };
    try {
      const resp = await carrierStore.fetchConfiguredCarrierService(payload);

      if (!commonUtil.hasError(resp) && resp.data?.entityValueList?.length) {
        if (carrierConfiguration.value[partyId]) {
          carrierConfiguration.value[partyId]["manifests"] = resp.data.entityValueList;
        } else {
          carrierConfiguration.value[partyId] = {
            manifests: resp.data.entityValueList
          };
        }
      }
    } catch (err) {
      logger.error("Failed to fetch carrier manifest information", err);
    }
  }
};

const openHistoricalManifestModal = async () => {
  const modal = await modalController.create({
    component: HistoricalManifestModal,
    componentProps: {
      selectedCarrierPartyId: selectedCarrierPartyId.value,
      carrierConfiguration: carrierConfiguration.value
    }
  });

  modal.present();
};

const generateCarrierManifest = async () => {
  isGeneratingManifest.value = true;
  const payload = {
    facilityId: currentFacility.value?.facilityId,
    carrierPartyId: selectedCarrierPartyId.value,
    manifestGenerateServiceName: carrierConfiguration.value[selectedCarrierPartyId.value]?.["MANIFEST_GEN_REQUEST"]
  };

  try {
    await carrierStore.generateManifest(payload);
    commonUtil.showToast(translate("Manifest has been generated successfully"));
    await fetchCarrierManifestInformation([selectedCarrierPartyId.value]);
  } catch (err) {
    logger.error("Failed to generate manifest", err);
    commonUtil.showToast(translate("Failed to generate manifest"));
  }
  isGeneratingManifest.value = false;
};

onIonViewWillEnter(() => {
  isScrollingEnabled.value = false;
  viewIndex.value = 0;
  emitter.on("updateOrderQuery", updateOrderQuery);
});

onBeforeRouteLeave(() => {
  emitter.off("updateOrderQuery", updateOrderQuery);
});
</script>
