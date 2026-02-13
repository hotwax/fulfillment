<template>
  <ion-page :key="router.currentRoute.value.path">
    <ViewSizeSelector menu-id="view-size-selector-completed" content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!completedOrders.total">{{ completedOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ completedOrders.query.viewSize }} {{ translate('of') }} {{ completedOrders.total }} {{ completedOrders.total ? translate('order') : translate('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-menu-button menu="view-size-selector-completed" :disabled="!completedOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="view-size-selector">
      <ion-searchbar class="searchbar" :value="completedOrders.query.queryString" :placeholder="translate('Search orders')" @keyup.enter="updateQueryString($event.target.value)" />
      <ion-radio-group v-if="carrierPartyIds?.length" v-model="selectedCarrierPartyId" @ionChange="updateSelectedCarrierPartyIds($event.detail.value)">
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
          <ion-checkbox label-placement="end" :checked="completedOrders.query.selectedShipmentMethods.includes(shipmentMethod)" @ionChange="updateSelectedShipmentMethods(shipmentMethod)">
            <ion-label>
              {{ getShipmentMethodDesc(shipmentMethod) }}
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>

      <div v-if="completedOrders.total">
        <div class="results">
          <ion-button :disabled="isShipNowDisabled || hasAnyMissingInfo() || (hasAnyShipmentTrackingInfoMissing() && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" expand="block" class="bulk-action desktop-only" fill="outline" size="large" @click="bulkShipOrders()">{{ translate("Ship") }}</ion-button>
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
                  <p v-if="order.trackingCode">{{ translate("Tracking Code") }} {{ order.trackingCode }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="order.shipmentId + item.shipmentItemSeqId" class="order-line-item">
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
                  <ion-button color="medium" fill="clear" size="small" v-if="item.productTypeId === 'GIFT_CARD'" @click="openGiftCardActivationModal(item)">
                    <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline" />
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

            <div class="mobile-only">
              <ion-item>
                <ion-button :disabled="isShipNowDisabled || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" fill="clear">{{ translate("Ship Now") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click.stop="shippingPopover">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <div class="actions">
              <div class="desktop-only">
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true">{{ translate("Shipped") }}</ion-button>
                <ion-button v-else :disabled="isShipNowDisabled || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click.stop="shipOrder(order)">{{ translate("Ship Now") }}</ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="regenerateShippingLabel(order)">
                  {{ translate(order.missingLabelImage ? "Regenerate Shipping Label" : "Print Shipping Label") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingShippingLabel" name="crescent" />
                </ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="printPackingSlip(order)">
                  {{ translate("Print Customer Letter") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingPackingSlip" name="crescent" />
                </ion-button>
              </div>
              <div class="desktop-only">
                <ion-button v-if="order.missingLabelImage" fill="outline" @click.stop="showShippingLabelErrorModal(order)">{{ translate("Shipping label error") }}</ion-button>
                <ion-button :disabled="isUnpackDisabled || !hasPermission(Actions.APP_UNPACK_ORDER) || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" fill="outline" color="danger" @click.stop="unpackOrder(order)">{{ translate("Unpack") }}</ion-button>
              </div>
            </div>
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreCompletedOrders($event)" threshold="100px" v-show="isCompletedOrderScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </div>
      </div>
      <div v-if="isLoadingOrders" class="ion-padding ion-text-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      <ion-fab v-else-if="completedOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :disabled="hasAnyMissingInfo() || (hasAnyShipmentTrackingInfoMissing() && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click="bulkShipOrders()">
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
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { caretDownOutline, chevronUpOutline, cubeOutline, printOutline, gift, giftOutline, listOutline, pricetagOutline, ellipsisVerticalOutline, checkmarkDoneOutline, optionsOutline, timeOutline } from "ionicons/icons";
import Popover from "@/views/ShippingPopover.vue";
import { getFeatures, hasActiveFilters, showToast } from "@/utils";
import { hasError } from "@/adapter";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import emitter from "@/event-bus";
import ViewSizeSelector from "@/components/ViewSizeSelector.vue";
import { OrderService } from "@/services/OrderService";
import { UtilService } from "@/services/UtilService";
import logger from "@/logger";
import ShippingLabelErrorModal from "@/components/ShippingLabelErrorModal.vue";
import { Actions, hasPermission } from "@/authorization";
import OrderActionsPopover from "@/components/OrderActionsPopover.vue";
import { isKit, retryShippingLabel } from "@/utils/order";
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { DateTime } from "luxon";
import HistoricalManifestModal from "@/components/HistoricalManifestModal.vue";
import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useStockStore } from "@/store/stock";
import { useUtilStore } from "@/store/util";

const router = useRouter();
const shipmentMethods = ref([] as Array<any>);
const carrierPartyIds = ref([] as Array<any>);
const searchedQuery = ref("");
const isScrollingEnabled = ref(false);
const completedOrdersList = ref([] as any);
const selectedCarrierPartyId = ref("");
const carrierConfiguration = ref({} as any);
const isGeneratingManifest = ref(false);
const selectedShipmentMethods = ref([] as any);
const isLoadingOrders = ref(false);

const contentRef = ref();
const infiniteScrollRef = ref();

const completedOrders = computed(() => useOrderStore().getCompletedOrders);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const getPartyName = (partyId: string) => useUtilStore().getPartyName(partyId);
const getShipmentMethodDesc = (shipmentMethodId: string) => useUtilStore().getShipmentMethodDesc(shipmentMethodId);
const getProductStock = (productId: string) => useStockStore().getProductStock(productId);
const productStoreShipmentMethCount = computed(() => useUtilStore().getProductStoreShipmentMethCount);
const isShipNowDisabled = computed(() => useUtilStore().isShipNowDisabled);
const isUnpackDisabled = computed(() => useUtilStore().isUnpackDisabled);
const currentEComStore = computed(() => useDxpUserStore().getCurrentEComStore);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

const getTime = (time: any) => {
  return time ? DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED) : "";
};

const getErrorMessage = () => {
  return searchedQuery.value ? (hasActiveFilters(completedOrders.value.query) ? translate("No results found for . Try using different filters.", { searchedQuery: searchedQuery.value }) : translate("No results found for . Try searching In Progress or Open tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: searchedQuery.value, lineBreak: "<br />" })) : translate("doesn't have any completed orders right now.", { facilityName: currentFacility.value?.facilityName });
};

const hasAnyMissingInfo = () => {
  return completedOrders.value.list.some((order: any) => {
    return order.hasMissingShipmentInfo || order.hasMissingPackageInfo;
  });
};

const fetchKitComponents = async (orderItem: any) => {
  await useProductStore().fetchProductComponents({ productId: orderItem.productId });
  const updatedOrder = completedOrders.value.list.find((order: any) => order.shipmentId === orderItem.shipmentId);
  const updatedItem = updatedOrder.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
  updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;
  completedOrdersList.value = JSON.parse(JSON.stringify(completedOrders.value.list)).slice(0, (completedOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
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
  const completedOrdersQuery = JSON.parse(JSON.stringify(completedOrders.value.query));
  completedOrdersQuery.viewIndex++;
  await useOrderStore().updateCompletedOrderIndex({ ...completedOrdersQuery });
  completedOrdersList.value = JSON.parse(JSON.stringify(completedOrders.value.list)).slice(0, (completedOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
  event.target.complete();
};

const isCompletedOrderScrollable = () => {
  return ((completedOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) < completedOrders.value.query.viewSize;
};

const initialiseOrderQuery = async () => {
  const completedOrdersQuery = JSON.parse(JSON.stringify(completedOrders.value.query));
  completedOrdersQuery.viewIndex = 0;
  completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  if (selectedCarrierPartyId.value) completedOrdersQuery.selectedCarrierPartyId = selectedCarrierPartyId.value;
  if (selectedShipmentMethods.value?.length) completedOrdersQuery.selectedShipmentMethods = selectedShipmentMethods.value;
  await useOrderStore().updateCompletedQuery({ ...completedOrdersQuery });
};

const updateOrderQuery = async (size: any) => {
  const completedOrdersQuery = JSON.parse(JSON.stringify(completedOrders.value.query));
  completedOrdersQuery.viewSize = size;
  await useOrderStore().updateCompletedQuery({ ...completedOrdersQuery });
};

const shipOrder = async (order: any) => {
  try {
    const resp = await OrderService.shipOrder({ shipmentId: order.shipmentId });

    if (!hasError(resp)) {
      showToast(translate("Order shipped successfully"));
      const completedOrdersQuery = JSON.parse(JSON.stringify(completedOrders.value.query));
      await Promise.all([useOrderStore().updateCompletedQuery({ ...completedOrdersQuery }), fetchShipmentFacets()]);
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to ship order", err);
    showToast(translate("Failed to ship order"));
  }
};

const bulkShipOrders = async () => {
  const packedOrdersCount = completedOrders.value.list.filter((order: any) => {
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
          let orderList = JSON.parse(JSON.stringify(completedOrders.value.list));
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
            showToast(translate("No orders are currently able to be shipped due to missing tracking codes."));
            return;
          }

          const shipmentIds = orderList.map((order: any) => order.shipmentId);

          try {
            const resp = await OrderService.bulkShipOrders({ shipmentIds });

            if (!hasError(resp)) {
              !trackingRequiredAndMissingCodeOrders.length
                ? showToast(translate("Orders shipped successfully"))
                : showToast(translate("out of cannot be shipped due to missing tracking codes.", { remainingOrders: trackingRequiredAndMissingCodeOrders.length, totalOrders: packedOrdersCount }));
              const completedOrdersQuery = JSON.parse(JSON.stringify(completedOrders.value.query));
              await Promise.all([useOrderStore().updateCompletedQuery({ ...completedOrdersQuery }), fetchShipmentFacets()]);
            } else {
              throw resp.data;
            }
          } catch (err) {
            logger.error("Failed to ship orders", err);
            showToast(translate("Failed to ship orders"));
          }
        }
      }]
    });
  return shipOrderAlert.present();
};

const shippingPopover = async (ev: Event) => {
  const popover = await popoverController.create({
    component: Popover,
    event: ev,
    translucent: true,
    showBackdrop: false
  });
  return popover.present();
};

const fetchShipmentFacets = async () => {
  const params = {
    orderTypeId: "SALES_ORDER",
    statusId: "SHIPMENT_PACKED",
    shippedDateFrom: DateTime.now().startOf("day").toMillis(),
    originFacilityId: currentFacility.value?.facilityId,
    productStoreId: currentEComStore.value.productStoreId
  };
  try {
    const resp = await OrderService.fetchShipmentFacets(params);

    if (!hasError(resp)) {
      shipmentMethods.value = resp.data.shipmentMethodTypeIds;
      carrierPartyIds.value = resp.data.carrierPartyIds;
      await useUtilStore().fetchShipmentMethodTypeDesc(resp.data.shipmentMethodTypeIds);
      await useUtilStore().fetchPartyInformation(resp.data.carrierPartyIds);
      await fetchConfiguredCarrierService(resp.data.carrierPartyIds);
      await fetchCarrierManifestInformation(resp.data.carrierPartyIds);
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch shipment methods", err);
  }
};

const updateQueryString = async (queryString: string) => {
  const completedOrdersQuery = JSON.parse(JSON.stringify(completedOrders.value.query));
  completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  completedOrdersQuery.queryString = queryString;
  await useOrderStore().updateCompletedQuery({ ...completedOrdersQuery });
  searchedQuery.value = queryString;
};

const updateSelectedShipmentMethods = async (method: string) => {
  const completedOrdersQuery = JSON.parse(JSON.stringify(completedOrders.value.query));
  const updatedShipmentMethods = completedOrdersQuery.selectedShipmentMethods;
  const index = updatedShipmentMethods.indexOf(method);
  if (index < 0) {
    updatedShipmentMethods.push(method);
  } else {
    updatedShipmentMethods.splice(index, 1);
  }

  completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  completedOrdersQuery.selectedShipmentMethods = updatedShipmentMethods;
  selectedShipmentMethods.value = updatedShipmentMethods;

  useOrderStore().updateCompletedQuery({ ...completedOrdersQuery });
};

const updateSelectedCarrierPartyIds = async (carrierPartyId: string) => {
  const completedOrdersQuery = JSON.parse(JSON.stringify(completedOrders.value.query));
  completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  completedOrdersQuery.selectedCarrierPartyId = carrierPartyId;

  useOrderStore().updateCompletedQuery({ ...completedOrdersQuery });
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
            const resp = await OrderService.unpackOrder({ shipmentId: order.shipmentId });

            if (resp.status == 200 && !hasError(resp)) {
              showToast(translate("Order unpacked successfully"));
              await Promise.all([useOrderStore().findCompletedOrders(), fetchShipmentFacets()]);
            } else {
              throw resp.data;
            }
          } catch (err) {
            logger.error("Failed to unpack the order", err);
            showToast(translate("Failed to unpack the order"));
          }
        }
      }]
    });
  return unpackOrderAlert.present();
};

const hasPackedShipments = (order: any) => {
  return order.statusId === "SHIPMENT_PACKED";
};

const printPackingSlip = async (order: any) => {
  if (order.isGeneratingPackingSlip) {
    return;
  }

  const shipmentIds = [order.shipmentId];
  order.isGeneratingPackingSlip = true;
  await OrderService.printPackingSlip(shipmentIds);
  order.isGeneratingPackingSlip = false;
};

const printShippingLabel = async (order: any) => {
  const shipmentIds = [order.shipmentId];

  const shippingLabelPdfUrls: string[] = Array.from(
    new Set(
      (order.shipmentPackages ?? [])
        .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
        .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
    )
  );

  if (!shipmentIds?.length) {
    showToast(translate("Failed to generate shipping label"));
    return;
  }

  await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackages);
  const internationalInvoiceUrls = order.shipmentPackages
    ?.filter((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl)
    .map((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl) || [];

  if (internationalInvoiceUrls.length > 0) {
    await OrderService.printCustomDocuments(internationalInvoiceUrls);
  }
};

const regenerateShippingLabel = async (order: any) => {
  if (productStoreShipmentMethCount.value <= 0) {
    showToast(translate("Unable to generate shipping label due to missing product store shipping method configuration"));
    return;
  }

  if (order.isGeneratingShippingLabel) {
    return;
  }

  order.isGeneratingShippingLabel = true;

  if (order.missingLabelImage) {
    const response = await retryShippingLabel(order);
    if (response?.isGenerated) {
      await printShippingLabel(response.order);
    }
  } else {
    await printShippingLabel(order);
  }

  order.isGeneratingShippingLabel = false;
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
  return completedOrders.value.list.some((order: any) => isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode);
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
    const resp = await UtilService.fetchConfiguredCarrierService(payload);

    if (!hasError(resp) && resp.data?.length) {
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
      const resp = await UtilService.fetchConfiguredCarrierService(payload);

      if (!hasError(resp) && resp.data?.entityValueList?.length) {
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
    await UtilService.generateManifest(payload);
    showToast(translate("Manifest has been generated successfully"));
    await fetchCarrierManifestInformation([selectedCarrierPartyId.value]);
  } catch (err) {
    logger.error("Failed to generate manifest", err);
    showToast(translate("Failed to generate manifest"));
  }
  isGeneratingManifest.value = false;
};

onIonViewWillEnter(async () => {
  isScrollingEnabled.value = false;
  isLoadingOrders.value = true;
  try {
    await fetchShipmentFacets();
    selectedShipmentMethods.value = selectedShipmentMethods.value?.filter((shipmentMethod: any) => shipmentMethods.value.includes(shipmentMethod));
    const selectedCarrier = carrierPartyIds.value?.find((carrierPartyId: any) => carrierPartyId === selectedCarrierPartyId.value);
    selectedCarrierPartyId.value = selectedCarrier ? selectedCarrier : "";
    await initialiseOrderQuery();
  } finally {
    isLoadingOrders.value = false;
  }
  emitter.on("updateOrderQuery", updateOrderQuery);
  completedOrdersList.value = JSON.parse(JSON.stringify(completedOrders.value.list)).slice(0, (completedOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
});

onBeforeRouteLeave(() => {
  useOrderStore().clearCompletedOrders();
  emitter.off("updateOrderQuery", updateOrderQuery);
});

watch(() => completedOrders.value.list, () => {
  completedOrdersList.value = JSON.parse(JSON.stringify(completedOrders.value.list)).slice(0, (completedOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
});
</script>
