<template>
  <ion-page :key="router.currentRoute.value.path">
    <ViewSizeSelector menu-id="view-size-selector-inprogress" content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-menu-button menu="start" slot="start" />
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!inProgressOrders.total">{{ inProgressOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ inProgressOrders.query.viewSize }} {{ translate('of') }} {{ inProgressOrders.total }} {{ translate('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button :disabled="!hasPermission(Actions.APP_RECYCLE_ORDER) || !inProgressOrders.total || isRejecting" fill="clear" color="danger" @click="recycleInProgressOrders()">
            {{ translate("Reject all") }}
          </ion-button>
          <ion-menu-button menu="view-size-selector-inprogress" :disabled="!inProgressOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="view-size-selector">
      <ion-searchbar class="searchbar" :placeholder="translate('Search orders')" v-model="inProgressOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)" />
      <ion-radio-group v-if="picklists?.length" v-model="selectedPicklistId" @ionChange="updateSelectedPicklist($event.detail.value)">
        <ion-row class="filters">
          <ion-item lines="none">
            <ion-radio label-placement="end" value="">
              <ion-label class="ion-text-wrap">
                {{ translate('All') }}
                <p>{{ translate('picklists', { count: picklists.length }) }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
          <ion-item lines="none" v-for="picklist in picklists" :key="picklist.id">
            <ion-radio label-placement="end" :value="picklist.id">
              <ion-label class="ion-text-wrap">
                {{ picklist.pickersName }}
                <p>{{ picklist.date }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-row>
      </ion-radio-group>

      <div v-if="inProgressOrders.total">
        <div class="results">
          <ion-button expand="block" class="bulk-action desktop-only" fill="outline" size="large" v-if="!isForceScanEnabled" @click="packOrders()">{{ translate("Pack orders") }}</ion-button>
          <ion-card class="order" v-for="(order, index) in getInProgressOrders()" :key="index" :class="isForceScanEnabled ? 'ion-margin-top' : ''">
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
                </ion-label>
              </div>
            </div>

            <div class="box-type desktop-only" v-if="!order.shipmentPackages">
              <ion-skeleton-text animated />
              <ion-skeleton-text animated />
            </div>
            <div class="box-type desktop-only" v-else-if="order.shipmentPackages">
              <ion-button :disabled="order.items.length <= order.shipmentPackages.length || addingBoxForShipmentIds.includes(order.shipmentId)" @click.stop="addShipmentBox(order)" fill="outline" shape="round" size="small"><ion-icon :icon="addOutline" />{{ translate("Add Box") }}</ion-button>
              <ion-row>
                <ion-chip v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" @click.stop="updateShipmentBoxType(shipmentPackage, order, $event)">
                  {{ `Box ${shipmentPackage?.packageName}` }} {{ `| ${boxTypeDesc(getShipmentPackageType(order, shipmentPackage))}` }}
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </ion-row>
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
                        {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
                        <ion-badge color="dark" class="kit-badge" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                      </div>
                      <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
                    </ion-label>
                  </ion-item>
                </div>

                <div class="desktop-only" v-if="!order.shipmentPackages">
                  <ion-item lines="none">
                    <ion-skeleton-text animated />
                  </ion-item>
                </div>

                <div class="desktop-only ion-text-center" v-else>
                  <div>
                    <template v-if="item.rejectReason">
                      <ion-chip outline color="danger">
                        <ion-label> {{ getRejectionReasonDescription(item.rejectReason) }}</ion-label>
                        <ion-icon :icon="closeCircleOutline" @click.stop="removeRejectionReason($event, item, order)" />
                      </ion-chip>
                    </template>
                    <template v-else-if="isEntierOrderRejectionEnabled(order)">
                      <ion-chip outline color="danger">
                        <ion-label> {{ getRejectionReasonDescription(rejectEntireOrderReasonId) ? getRejectionReasonDescription(rejectEntireOrderReasonId) : translate('Reject to avoid order split (no variance)') }}</ion-label>
                      </ion-chip>
                    </template>
                    <template v-else>
                      <ion-chip :disabled="!order.shipmentPackages || order.shipmentPackages.length === 0" outline @click="openShipmentBoxPopover($event, item, item.orderItemSeqId, order)">
                        {{ `Box ${item.selectedBox}` }}
                        <ion-icon :icon="caretDownOutline" />
                      </ion-chip>
                    </template>
                  </div>
                </div>

                <div class="product-metadata">
                  <ion-button v-if="isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item)">
                    <ion-icon v-if="item.showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline" />
                    <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline" />
                  </ion-button>
                  <ion-button color="medium" fill="clear" size="small" v-if="item.productTypeId === 'GIFT_CARD'" @click="openGiftCardActivationModal(item)">
                    <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline" />
                  </ion-button>
                  <ion-button color="danger" fill="clear" size="small" @click.stop="openRejectReasonPopover($event, item, order)">
                    <ion-icon slot="icon-only" :icon="trashBinOutline" />
                  </ion-button>
                  <ion-note v-if="getProductStock(item.productId).qoh">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                  <ion-button color="medium" fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                    <ion-icon slot="icon-only" :icon="cubeOutline" />
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
                    <ion-checkbox v-if="item.rejectReason || isEntierOrderRejectionEnabled(order)" :checked="item.kitComponents?.includes(productComponent.productIdTo)" @ionChange="rejectKitComponent(order, item, productComponent.productIdTo)" />
                  </ion-item>
                </ion-card>
              </div>
            </div>

            <div class="mobile-only">
              <ion-item>
                <ion-button fill="clear" @click.stop="packOrder(order)">{{ translate("Pack using default packaging") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click.stop="packagingPopover">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <div class="actions">
              <div>
                <ion-button :color="order.hasAllRejectedItem ? 'danger' : ''" @click.stop="packOrder(order)">{{ translate(order.hasAllRejectedItem ? "Reject" : order.hasRejectedItem ? "Save and Pack" : "Pack") }}</ion-button>
              </div>

              <div class="desktop-only">
                <ion-button v-if="order.missingLabelImage && isAutoShippingLabelEnabled" fill="outline" @click.stop="showShippingLabelErrorModal(order)">{{ translate("Shipping label error") }}</ion-button>
              </div>
            </div>
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreInProgressOrders($event)" threshold="100px" v-show="isInProgressOrderScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </div>
      </div>
      <div v-if="isLoadingOrders" class="ion-padding ion-text-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      <template v-else-if="inProgressOrders.total">
        <ion-fab v-if="!isForceScanEnabled" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="packOrders()">
            <ion-icon :icon="checkmarkDoneOutline" />
          </ion-fab-button>
        </ion-fab>
      </template>
      <div class="empty-state" v-else>
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>
    <ion-footer v-if="selectedPicklistId && inProgressOrders.total">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="outline" color="primary" @click="editPickers(getPicklist(selectedPicklistId))">
            <ion-icon slot="start" :icon="pencilOutline" />
            {{ translate("Edit Pickers") }}
          </ion-button>
          <ion-button fill="solid" color="primary" @click="printPicklist(getPicklist(selectedPicklistId))">
            <ion-spinner v-if="getPicklist(selectedPicklistId).isGeneratingPicklist" slot="start" name="crescent" />
            <ion-icon v-else slot="start" :icon="printOutline" />
            {{ translate("Print Picklist") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonButtons, IonCard, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonFooter, IonHeader, IonItem, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonMenuButton, IonNote, IonPage, IonRow, IonRadio, IonRadioGroup, IonSearchbar, IonSkeletonText, IonSpinner, IonThumbnail, IonTitle, IonToolbar, alertController, popoverController, modalController, onIonViewWillEnter } from "@ionic/vue";
import { computed, ref } from "vue";
import { addOutline, caretDownOutline, chevronUpOutline, checkmarkDoneOutline, closeCircleOutline, cubeOutline, ellipsisVerticalOutline, gift, giftOutline, listOutline, pencilOutline, optionsOutline, pricetagOutline, printOutline, trashBinOutline } from "ionicons/icons";
import PackagingPopover from "@/views/PackagingPopover.vue";
import { getFeatures, hasActiveFilters, showToast } from "@/utils";
import { isKit } from "@/utils/order";
import { hasError } from "@/adapter";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import ViewSizeSelector from "@/components/ViewSizeSelector.vue";
import emitter from "@/event-bus";
import { UtilService } from "@/services/UtilService";
import { DateTime } from "luxon";
import logger from "@/logger";
import { Actions, hasPermission } from "@/authorization";
import EditPickersModal from "@/components/EditPickersModal.vue";
import ShipmentBoxTypePopover from "@/components/ShipmentBoxTypePopover.vue";
import OrderActionsPopover from "@/components/OrderActionsPopover.vue";
import ShippingLabelErrorModal from "@/components/ShippingLabelErrorModal.vue";
import ReportIssuePopover from "@/components/ReportIssuePopover.vue";
import ShipmentBoxPopover from "@/components/ShipmentBoxPopover.vue";
import ScanOrderItemModal from "@/components/ScanOrderItemModal.vue";
import GenerateTrackingCodeModal from "@/components/GenerateTrackingCodeModal.vue";
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { OrderService } from "@/services/OrderService";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";
import { useStockStore } from "@/store/stock";
import { useUserStore } from "@/store/user";

const router = useRouter();
const picklists = ref([] as any);
const defaultShipmentBoxType = ref({} as any);
const searchedQuery = ref("");
const addingBoxForShipmentIds = ref([] as any);
const selectedPicklistId = ref("");
const isScrollingEnabled = ref(false);
const isRejecting = ref(false);
const rejectEntireOrderReasonId = "REJ_AVOID_ORD_SPLIT";
const isLoadingOrders = ref(false);

const contentRef = ref();
const infiniteScrollRef = ref();

const inProgressOrders = computed(() => useOrderStore().getInProgressOrders);
const rejectReasonOptions = computed(() => useUtilStore().getRejectReasonOptions);
const userPreference = computed(() => useUserStore().getUserPreference);
const isForceScanEnabled = computed(() => useUtilStore().isForceScanEnabled);
const partialOrderRejectionConfig = computed(() => useUtilStore().getPartialOrderRejectionConfig);
const collateralRejectionConfig = computed(() => useUtilStore().getCollateralRejectionConfig);
const affectQohConfig = computed(() => useUtilStore().getAffectQohConfig);
const excludeOrderBrokerDays = computed(() => useUtilStore().getExcludeOrderBrokerDays);
const carrierShipmentBoxTypes = computed(() => useUtilStore().getCarrierShipmentBoxTypes);
const isAutoShippingLabelEnabled = computed(() => useUtilStore().isAutoShippingLabelEnabled);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);
const currentEComStore = computed(() => useDxpUserStore().getCurrentEComStore);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);

const getProduct = (productId: string) => useProductStore().getProduct(productId);
const boxTypeDesc = (boxTypeId: string) => useUtilStore().getShipmentBoxDesc(boxTypeId);
const getProductStock = (productId: string) => useStockStore().getProductStock(productId);
const getShipmentMethodDesc = (shipmentMethodId: string) => useUtilStore().getShipmentMethodDesc(shipmentMethodId);

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
};

const getRejectionReasonDescription = (rejectionReasonId: string) => {
  const reason = rejectReasonOptions.value?.find((reason: any) => reason.enumId === rejectionReasonId);
  return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
};

const openRejectReasonPopover = async (ev: Event, item: any, order: any) => {
  const reportIssuePopover = await popoverController.create({
    component: ReportIssuePopover,
    event: ev,
    translucent: true,
    showBackdrop: false
  });

  reportIssuePopover.present();

  const result = await reportIssuePopover.onDidDismiss();

  if (result.data) {
    updateRejectReason(result.data, item, order);
  }
};

const fetchKitComponents = async (orderItem: any) => {
  await useProductStore().fetchProductComponents({ productId: orderItem.productId });
  const updatedOrder = inProgressOrders.value.list.find((order: any) => order.orderId === orderItem.orderId && order.picklistBinId === orderItem.picklistBinId);
  const updatedItem = updatedOrder.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
  updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;
  if (!updatedItem.kitComponents) {
    updatedItem.kitComponents = getProduct(updatedItem.productId).productComponents.map((productComponent: any) => productComponent.productIdTo);
  }
  useOrderStore().updateInProgressOrder(updatedOrder);
};

const removeRejectionReason = async (ev: Event, item: any, order: any) => {
  delete item["rejectReason"];
  delete item["kitComponents"];
  item.rejectReason = "";
  order.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      delete orderItem["rejectReason"];
      delete orderItem["kitComponents"];
    }
  });
  order.hasRejectedItem = order.items.some((item: any) => item.rejectReason);
  order.hasAllRejectedItem = isEntierOrderRejectionEnabled(order) || order.items.every((item: any) => item.rejectReason);
  useOrderStore().updateInProgressOrder(order);
};

const openShipmentBoxPopover = async (ev: Event, item: any, orderItemSeqId: number, order: any) => {
  const popover = await popoverController.create({
    component: ShipmentBoxPopover,
    componentProps: {
      shipmentPackages: order.shipmentPackages
    },
    showBackdrop: false,
    event: ev
  });

  popover.present();

  const result = await popover.onDidDismiss();

  if (result.data && item.selectedBox !== result.data) {
    updateBox(result.data, item, order);
  }
};

const getErrorMessage = () => {
  return searchedQuery.value ? (hasActiveFilters(inProgressOrders.value.query) ? translate("No results found for . Try using different filters.", { searchedQuery: searchedQuery.value }) : translate("No results found for . Try searching Open or Completed tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: searchedQuery.value, lineBreak: "<br />" })) : translate("doesn't have any orders in progress right now.", { facilityName: currentFacility.value?.facilityName });
};

const getInProgressOrders = () => {
  return JSON.parse(JSON.stringify(inProgressOrders.value.list)).splice(0, (inProgressOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
};

const packagingPopover = async (ev: Event) => {
  const popover = await popoverController.create({
    component: PackagingPopover,
    event: ev,
    translucent: true,
    showBackdrop: false
  });
  return popover.present();
};

const packOrder = async (order: any) => {
  if (order.hasRejectedItem) {
    const itemsToReject = order.items.filter((item: any) => item.rejectReason);
    reportIssue(order, itemsToReject);
    return;
  }
  initiatePackOrder(order);
};

const initiatePackOrder = async (order: any, updateParameter?: string) => {
  let forceScan = isForceScanEnabled.value;
  if (isEntierOrderRejectionEnabled(order)) {
    forceScan = false;
  } else if (forceScan) {
    forceScan = !order.items.every((item: any) => item.rejectReason);
  }

  if (order.hasAllRejectedItem) {
    await rejectEntireOrder(order, updateParameter);
  } else if (forceScan) {
    await scanOrder(order, updateParameter);
  } else {
    confirmPackOrder(order, updateParameter);
  }
};

const rejectEntireOrder = async (order: any, updateParameter?: string) => {
  emitter.emit("presentLoader");
  try {
    const updatedOrderDetail = await getUpdatedOrderDetail(order, updateParameter);
    const params = {
      shipmentId: order.shipmentId,
      orderId: order.orderId,
      facilityId: order.originFacilityId,
      rejectedOrderItems: updatedOrderDetail.rejectedOrderItems
    };
    const resp = await OrderService.packOrder(params);

    if (hasError(resp)) {
      throw resp.data;
    }

    await fetchOrderAndPickerInformation();
    showToast(translate("Order rejected successfully"));
    return true;
  } catch (err) {
    logger.error("Failed to reject order", err);
    showToast(translate("Failed to reject order"));
  } finally {
    emitter.emit("dismissLoader");
  }
  return false;
};

const confirmPackOrder = async (order: any, updateParameter?: string, trackingCode?: string) => {
  const confirmPackOrder = await alertController
    .create({
      header: translate("Pack order"),
      message: translate("You are packing an order. Select additional documents that you would like to print.", { space: "<br /><br />" }),
      inputs: [{
        name: "printShippingLabel",
        type: "checkbox",
        label: translate("Shipping labels"),
        value: "printShippingLabel",
        checked: userPreference.value.printShippingLabel
      }, {
        name: "printPackingSlip",
        type: "checkbox",
        label: translate("Packing slip"),
        value: "printPackingSlip",
        checked: userPreference.value.printPackingSlip
      }],
      buttons: [{
        text: translate("Cancel"),
        role: "cancel"
      }, {
        text: translate("Pack"),
        role: "confirm",
        handler: async (data) => {
          const packingResponse = await executePackOrder(order, updateParameter, trackingCode, data);
          if (!packingResponse.isPacked) {
            const updatedOrder = await useOrderStore().updateShipmentPackageDetail(order);
            await generateTrackingCodeForPacking(updatedOrder, updateParameter, data, packingResponse.errors);
          }
        }
      }]
    });
  return confirmPackOrder.present();
};

const executePackOrder = async (order: any, updateParameter?: string, trackingCode?: string, documentOptions?: any) => {
  emitter.emit("presentLoader");
  let toast: any;
  const shipmentIds = [order.shipmentId];
  const manualTrackingCode = trackingCode;
  try {
    const updatedOrderDetail = await getUpdatedOrderDetail(order, updateParameter) as any;
    const params = {
      shipmentId: order.shipmentId,
      orderId: order.orderId,
      facilityId: order.originFacilityId,
      rejectedOrderItems: updatedOrderDetail.rejectedOrderItems,
      shipmentPackageContents: updatedOrderDetail.shipmentPackageContents,
      trackingCode: manualTrackingCode
    };
    await OrderService.packOrder(params);

    const updatedOrder = await useOrderStore().updateShipmentPackageDetail(order);

    if (documentOptions.length) {
      toast = await showToast(translate("Order packed successfully. Document generation in process"), { canDismiss: true, manualDismiss: true });
      toast.present();

      const shippingLabelPdfUrls: string[] = Array.from(
        new Set(
          (updatedOrder.shipmentPackages ?? [])
            .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
            .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
        )
      );

      if (documentOptions.includes("printPackingSlip") && documentOptions.includes("printShippingLabel")) {
        if (shippingLabelPdfUrls && shippingLabelPdfUrls.length > 0) {
          await OrderService.printPackingSlip(shipmentIds);
          await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, updatedOrder.shipmentPackages);
        } else {
          await OrderService.printShippingLabelAndPackingSlip(shipmentIds, updatedOrder.shipmentPackages);
        }
      } else if (documentOptions.includes("printPackingSlip")) {
        await OrderService.printPackingSlip(shipmentIds);
      } else if (documentOptions.includes("printShippingLabel") && !manualTrackingCode && !updatedOrder.missingLabelImage) {
        await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, updatedOrder.shipmentPackages);
      }

      const internationalInvoiceUrls: string[] = Array.from(
        new Set(
          updatedOrder.shipmentPackages
            ?.filter((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl)
            .map((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl) || []
        )
      );

      if (internationalInvoiceUrls.length > 0) {
        await OrderService.printCustomDocuments(internationalInvoiceUrls);
      }

      toast.dismiss();
    } else {
      showToast(translate("Order packed successfully"));
    }
    await fetchOrderAndPickerInformation();
    return { isPacked: true };
  } catch (err: any) {
    if (toast) toast.dismiss();
    showToast(translate("Failed to pack order"));
    logger.error("Failed to pack order", err);
    return { isPacked: false, errors: err?.response?.data?.errors };
  } finally {
    emitter.emit("dismissLoader");
  }
};

const packOrders = async () => {
  const alert = await alertController
    .create({
      header: translate("Pack orders"),
      message: translate("You are packing orders. Select additional documents that you would like to print.", { count: inProgressOrders.value.list.length, space: "<br /><br />" }),
      inputs: [{
        name: "printShippingLabel",
        type: "checkbox",
        label: translate("Shipping labels"),
        value: "printShippingLabel",
        checked: userPreference.value.printShippingLabel
      }, {
        name: "printPackingSlip",
        type: "checkbox",
        label: translate("Packing slip"),
        value: "printPackingSlip",
        checked: userPreference.value.printPackingSlip
      }],
      buttons: [{
        text: translate("Cancel"),
        role: "cancel"
      }, {
        text: translate("Pack"),
        role: "confirm",
        handler: async (data) => {
          emitter.emit("presentLoader");
          const orderList = JSON.parse(JSON.stringify(inProgressOrders.value.list));

          let toast: any;
          const shipments = [] as any;
          for (const order of orderList) {
            const updatedOrderDetail = await getUpdatedOrderDetail(order) as any;
            shipments.push({
              shipmentId: order.shipmentId,
              orderId: order.orderId,
              facilityId: order.originFacilityId,
              rejectedOrderItems: updatedOrderDetail.rejectedOrderItems,
              shipmentPackageContents: updatedOrderDetail.shipmentPackageContents
            });
          }
          const internationalInvoiceUrls: string[] = Array.from(
            new Set(
              orderList
                .flatMap((order: any) => order.shipmentPackages ?? [])
                .filter((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl)
                .map((shipmentPackage: any) => shipmentPackage.internationalInvoiceUrl)
            )
          );

          const shippingLabelPdfUrls: string[] = Array.from(
            new Set(
              orderList
                .flatMap((order: any) => order.shipmentPackages ?? [])
                .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
                .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
            )
          );

          const shipmentPackages = orderList
            .map((order: any) =>
              [...new Set(order.shipmentPackages
                .map((shipmentPackage: any) => shipmentPackage)
              )]
            ).flat() as Array<string>;

          try {
            const resp = await OrderService.packOrders({
              shipments
            });

            if (hasError(resp)) {
              throw resp.data;
            }

            const packedShipmentIds = resp.data?.packedShipmentIds ?? [];

            if (!packedShipmentIds.length) {
              throw resp.data;
            }

            if (data.length) {
              toast = await showToast(translate("Order packed successfully. Document generation in process"), { canDismiss: true, manualDismiss: true });
              toast.present();
              if (data.includes("printPackingSlip") && data.includes("printShippingLabel")) {
                if (shippingLabelPdfUrls && shippingLabelPdfUrls.length > 0) {
                  await OrderService.printPackingSlip(packedShipmentIds);
                  await OrderService.printShippingLabel(packedShipmentIds, shippingLabelPdfUrls, shipmentPackages);
                } else {
                  await OrderService.printShippingLabelAndPackingSlip(packedShipmentIds, shipmentPackages);
                }
              } else if (data.includes("printPackingSlip")) {
                await OrderService.printPackingSlip(packedShipmentIds);
              } else if (data.includes("printShippingLabel")) {
                await OrderService.printShippingLabel(packedShipmentIds, shippingLabelPdfUrls, shipmentPackages);
              }
              await OrderService.printCustomDocuments(internationalInvoiceUrls);

              toast.dismiss();
            } else {
              showToast(translate("Order packed successfully"));
            }
            await fetchOrderAndPickerInformation();
          } catch (err) {
            if (toast) toast.dismiss();
            emitter.emit("dismissLoader");
            showToast(translate("Failed to pack orders"));
            logger.error("Failed to pack orders", err);
          } finally {
            emitter.emit("dismissLoader");
          }
        }
      }]
    });
  return alert.present();
};

const reportIssue = async (order: any, itemsToReject: any) => {
  let message;
  const rejectedItem = itemsToReject[0];
  const productName = rejectedItem.productName;

  let ordersCount = 0;

  if (collateralRejectionConfig.value) {
    ordersCount = inProgressOrders.value.list.map((inProgressOrder: any) => inProgressOrder.items.filter((item: any) => itemsToReject.some((itemToReject: any) => itemToReject.productId === item.productId) && item.shipmentId !== order.shipmentId))?.filter((item: any) => item.length).length;
  }

  if (itemsToReject.length === 1 && ordersCount) {
    message = translate("is identified as unfulfillable. other containing this product will be unassigned from this store and sent to be rebrokered.", { productName, space: "<br /><br />", orders: ordersCount, orderText: ordersCount > 1 ? "orders" : "order" });
  } else if (itemsToReject.length === 1 && !ordersCount) {
    message = translate("is identified as unfulfillable. This order item will be unassigned from this store and sent to be rebrokered.", { productName, space: "<br /><br />" });
  } else if (itemsToReject.length > 1 && ordersCount) {
    message = translate(", and other products are identified as unfulfillable. other containing these products will be unassigned from this store and sent to be rebrokered.", { productName, products: itemsToReject.length - 1, space: "<br /><br />", orders: ordersCount, orderText: ordersCount > 1 ? "orders" : "order" });
  } else {
    message = translate(", and other products are identified as unfulfillable. These order items will be unassigned from this store and sent to be rebrokered.", { productName, products: itemsToReject.length - 1, space: "<br /><br />" });
  }
  const alert = await alertController
    .create({
      header: translate("Report an issue"),
      message,
      buttons: [{
        text: translate("Cancel"),
        role: "cancel"
      }, {
        text: translate("Report"),
        role: "confirm",
        handler: async () => {
          await initiatePackOrder(order, "report");
        }
      }]
    });

  return alert.present();
};

const findInProgressOrders = async () => {
  await useOrderStore().findInProgressOrders();
};

const getUpdatedOrderDetail = (order: any, updateParameter?: string) => {
  const items = JSON.parse(JSON.stringify(order.items));
  const rejectedOrderItems = [] as any;
  const shipmentPackageContents = [] as any;
  items.map((item: any) => {
    const shipmentPackage = order.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.packageName === item.selectedBox);
    if (updateParameter === "report" && item.rejectReason) {
      const rejectedItemInfo = {
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        shipmentId: item.shipmentId,
        shipmentItemSeqId: item.shipmentItemSeqId,
        productId: item.productId,
        facilityId: currentFacility.value?.facilityId,
        updateQOH: affectQohConfig.value || false,
        maySplit: isEntierOrderRejectionEnabled(order) ? "N" : "Y",
        cascadeRejectByProduct: collateralRejectionConfig.value ? "Y" : "N",
        rejectionReasonId: item.rejectReason,
        kitComponents: item.kitComponents,
        comments: "Store Rejected Inventory"
      } as any;

      if (excludeOrderBrokerDays.value !== undefined) {
        rejectedItemInfo["excludeOrderFacilityDuration"] = excludeOrderBrokerDays.value;
      }
      rejectedOrderItems.push(rejectedItemInfo);
    } else if (item.selectedBox !== item.currentBox) {
      shipmentPackageContents.push({
        shipmentId: item.shipmentId,
        shipmentItemSeqId: item.shipmentItemSeqId,
        shipmentPackageSeqId: shipmentPackage.shipmentPackageSeqId,
        quantity: item.quantity
      });
    }
  });
  return { rejectedOrderItems, shipmentPackageContents };
};

const updateRejectReason = (updatedReason: string, item: any, order: any) => {
  item.rejectReason = updatedReason;
  order.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      orderItem.rejectReason = updatedReason;
    }
  });
  order.hasRejectedItem = true;
  order.hasAllRejectedItem = isEntierOrderRejectionEnabled(order) || order.items.every((item: any) => item.rejectReason);
  useOrderStore().updateInProgressOrder(order);
};

const rejectKitComponent = (order: any, item: any, componentProductId: string) => {
  let kitComponents = item.kitComponents ? item.kitComponents : [];
  if (kitComponents.includes(componentProductId)) {
    kitComponents = kitComponents.filter((rejectedComponent: any) => rejectedComponent !== componentProductId);
  } else {
    kitComponents.push(componentProductId);
  }
  item.kitComponents = kitComponents;
  order.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      orderItem.kitComponents = kitComponents;
    }
  });
  useOrderStore().updateInProgressOrder(order);
};

const isEntierOrderRejectionEnabled = (order: any) => {
  return !partialOrderRejectionConfig.value && order.hasRejectedItem;
};

const updateBox = (updatedBox: string, item: any, order: any) => {
  item.selectedBox = updatedBox;
  order.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      orderItem.selectedBox = updatedBox;
    }
  });
  useOrderStore().updateInProgressOrder(order);
};

const fetchPickersInformation = async () => {
  let pageIndex = 0;
  let resp;
  const picklistInfo = {} as any;

  try {
    do {
      const payload = {
        originFacilityId: currentFacility.value?.facilityId,
        statusId: "SHIPMENT_APPROVED",
        shipmentMethodTypeId: "STOREPICKUP",
        shipmentMethodTypeId_op: "equals",
        shipmentMethodTypeId_not: "Y",
        pageIndex,
        pageSize: 50
      };

      resp = await OrderService.fetchPicklists(payload);

      if (!hasError(resp)) {
        resp.data?.forEach((shipment: any) => {
          if (shipment?.order?.statusId === "ORDER_APPROVED" && shipment?.order?.productStoreId === currentEComStore.value.productStoreId) {
            shipment?.picklistShipment?.forEach((picklistShipment: any) => {
              if (!picklistInfo[picklistShipment.picklistId]) {
                const picklistRoles = picklistShipment?.picklist?.roles.filter((role: any) => !role.thruDate);
                const pickerIds = (picklistRoles ?? []).map((role: any) => role?.partyId);

                const pickersName = (picklistRoles ?? [])
                  .map((role: any) => {
                    if (role?.person) {
                      return `${role.person.firstName} ${role.person.lastName}`;
                    } else if (role?.partyGroup) {
                      return role.partyGroup.groupName;
                    }
                    return null;
                  })
                  .filter(Boolean)
                  .join(", ");

                picklistInfo[picklistShipment.picklistId] = {
                  ...picklistShipment.picklist,
                  id: picklistShipment.picklistId,
                  date: picklistShipment.picklist?.picklistDate
                    ? DateTime.fromMillis(picklistShipment.picklist.picklistDate).toLocaleString(DateTime.TIME_SIMPLE)
                    : null,
                  pickersName,
                  pickerIds
                };
              }
            });
          }
        });

        pageIndex++;
      } else {
        throw resp.data;
      }
    } while (resp.data.length >= 50);

    picklists.value = Object.values(picklistInfo);
    if (selectedPicklistId.value) {
      const selectedPicklist = picklists.value.find((picklist: any) => picklist.id === selectedPicklistId.value);
      selectedPicklistId.value = selectedPicklist ? selectedPicklist.id : "";
    }
  } catch (err) {
    logger.error("Failed to fetch picklists", err);
  }
};

const getPicklist = (id: string) => {
  return picklists.value.find((picklist: any) => picklist.id === id);
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

const loadMoreInProgressOrders = async (event: any) => {
  if (!(isScrollingEnabled.value && isInProgressOrderScrollable())) {
    await event.target.complete();
  }
  const inProgressOrdersQuery = JSON.parse(JSON.stringify(inProgressOrders.value.query));
  inProgressOrdersQuery.viewIndex++;
  await useOrderStore().updateInProgressIndex({ ...inProgressOrdersQuery });
  event.target.complete();
};

const isInProgressOrderScrollable = () => {
  return ((inProgressOrders.value.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) < inProgressOrders.value.query.viewSize;
};

const updateSelectedPicklist = async (id: string) => {
  const inProgressOrdersQuery = JSON.parse(JSON.stringify(inProgressOrders.value.query));
  inProgressOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  inProgressOrdersQuery.selectedPicklist = id;
  inProgressOrdersQuery.viewIndex = 0;

  useOrderStore().updateInProgressQuery({ ...inProgressOrdersQuery });
};

const fetchDefaultShipmentBox = async () => {
  let defaultBoxTypeId = "YOURPACKNG";
  let defaultBoxType = {};

  try {
    let resp = await UtilService.fetchDefaultShipmentBox({
      systemResourceId: "shipment",
      systemPropertyId: "shipment.default.boxtype",
      fieldsToSelect: ["systemPropertyValue", "systemResourceId"],
      pageSize: 1
    });

    if (!hasError(resp)) {
      defaultBoxTypeId = resp.data?.[0].systemPropertyValue;
    } else {
      throw resp.data;
    }

    const payload = {
      shipmentBoxTypeId: defaultBoxTypeId,
      pageSize: 1
    };
    resp = await UtilService.fetchShipmentBoxType(payload);
    if (!hasError(resp)) {
      defaultBoxType = resp.data[0];
    }
  } catch (err) {
    logger.error("Failed to fetch default shipment box type information", err);
  }

  return defaultBoxType;
};

const addShipmentBox = async (order: any) => {
  addingBoxForShipmentIds.value.push(order.shipmentId);

  const { carrierPartyId, shipmentMethodTypeId } = order;

  if (!Object.keys(defaultShipmentBoxType.value).length) {
    defaultShipmentBoxType.value = await fetchDefaultShipmentBox() as any;
  }

  let packageName = "A";
  const packageNames = order?.shipmentPackages
    .filter((shipmentPackage: any) => shipmentPackage.packageName)
    .map((shipmentPackage: any) => shipmentPackage.packageName);
  if (packageNames && packageNames.length) {
    packageNames.sort((a: any, b: any) => b.localeCompare(a));
    packageName = String.fromCharCode(packageNames[0].charCodeAt(0) + 1);
  }

  const params = {
    shipmentId: order.shipmentId,
    shipmentBoxTypeId: defaultShipmentBoxType.value?.shipmentBoxTypeId,
    boxLength: defaultShipmentBoxType.value?.boxLength,
    boxHeight: defaultShipmentBoxType.value?.boxHeight,
    boxWidth: defaultShipmentBoxType.value?.boxWidth,
    weightUomId: defaultShipmentBoxType.value?.weightUomId,
    dimensionUomId: defaultShipmentBoxType.value?.dimensionUomId,
    packageName,
    dateCreated: DateTime.now().toMillis()
  } as any;

  carrierPartyId && (params["carrierPartyId"] = carrierPartyId);
  shipmentMethodTypeId && (params["shipmentMethodTypeId"] = shipmentMethodTypeId);

  try {
    const resp = await OrderService.addShipmentBox(params);

    if (!hasError(resp)) {
      showToast(translate("Box added successfully"));
      await Promise.all([fetchPickersInformation(), findInProgressOrders()]);
    } else {
      throw resp.data;
    }
  } catch (err) {
    showToast(translate("Failed to add box"));
    logger.error("Failed to add box", err);
  }
  addingBoxForShipmentIds.value.splice(addingBoxForShipmentIds.value.indexOf(order.shipmentId), 1);
};

const getShipmentPackageType = (order: any, shipmentPackage: any) => {
  let packageType = shipmentPackage.shipmentBoxTypeId;
  if (!packageType) {
    const shipmentBoxTypes = getShipmentBoxTypes(order.carrierPartyId);
    packageType = shipmentBoxTypes[0];
  }
  return packageType;
};

const getShipmentBoxTypes = (carrierPartyId: string) => {
  return carrierShipmentBoxTypes.value[carrierPartyId] ? carrierShipmentBoxTypes.value[carrierPartyId] : [];
};

const updateQueryString = async (query: string) => {
  const inProgressOrdersQuery = JSON.parse(JSON.stringify(inProgressOrders.value.query));

  inProgressOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  inProgressOrdersQuery.queryString = query;
  await useOrderStore().updateInProgressQuery({ ...inProgressOrdersQuery });
  searchedQuery.value = query;
};

const updateOrderQuery = async (size?: any, queryStringValue?: any, hideLoader = false) => {
  const inProgressOrdersQuery = JSON.parse(JSON.stringify(inProgressOrders.value.query));

  size && (inProgressOrdersQuery.viewSize = size);
  queryStringValue && (inProgressOrdersQuery.queryString = "");
  inProgressOrdersQuery.viewIndex = 0;
  inProgressOrdersQuery.selectedPicklist = selectedPicklistId.value;
  await useOrderStore().updateInProgressQuery({ ...inProgressOrdersQuery, hideLoader });
};

const initialiseOrderQuery = async () => {
  await updateOrderQuery(process.env.VUE_APP_VIEW_SIZE, "");
};

const printPicklist = async (picklist: any) => {
  picklist.isGeneratingPicklist = true;
  await OrderService.printPicklist(picklist.id);
  picklist.isGeneratingPicklist = false;
};

const updateShipmentBoxType = async (shipmentPackage: any, order: any, ev: CustomEvent) => {
  const shipmentBoxTypes = getShipmentBoxTypes(order.carrierPartyId);
  if (!shipmentBoxTypes.length) {
    logger.error("Failed to fetch shipment box types");
    return;
  }

  const popover = await popoverController.create({
    component: ShipmentBoxTypePopover,
    event: ev,
    showBackdrop: false,
    componentProps: { shipmentBoxTypes }
  });

  popover.present();

  const result = await popover.onDidDismiss();

  if (result.data && shipmentPackage.shipmentBoxTypeId !== result.data) {
    shipmentPackage.shipmentBoxTypeId = result.data;
    useOrderStore().updateInProgressOrder(order);
  }
};

const recycleInProgressOrders = async () => {
  const alert = await alertController.create({
    header: translate("Reject all in progress orders"),
    message: translate("Reject in progress orders.", { ordersCount: inProgressOrders.value.total }),
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
          resp = await OrderService.recycleInProgressOrders({
            facilityId: currentFacility.value?.facilityId,
            productStoreId: currentEComStore.value.productStoreId,
            reasonId: "INACTIVE_STORE"
          });

          if (!hasError(resp)) {
            showToast(translate("Rejecting has been started. All in progress orders will be rejected shortly."));
          } else {
            throw resp.data;
          }
        } catch (err) {
          showToast(translate("Failed to reject in progress orders"));
          logger.error("Failed to reject in progress orders", err);
        }
        emitter.emit("dismissLoader");
      }
    }]
  });

  await alert.present();
};

const editPickers = async (selectedPicklist: any) => {
  const editPickersModal = await modalController.create({
    component: EditPickersModal,
    componentProps: {
      selectedPicklist
    }
  });

  editPickersModal.onDidDismiss().then((result) => {
    if (result.data?.editedPicklist && Object.keys(result.data?.editedPicklist).length) {
      const editedPicklist = result.data.editedPicklist;
      picklists.value = JSON.parse(JSON.stringify(picklists.value.map((picklist: any) => picklist.id === editedPicklist.id ? picklist = editedPicklist : picklist)));
    }
  });

  return editPickersModal.present();
};

const fetchProductStock = (productId: string) => {
  useStockStore().fetchStock({ productId });
};

const orderActionsPopover = async (order: any, ev: Event) => {
  const popover = await popoverController.create({
    component: OrderActionsPopover,
    componentProps: {
      order,
      category: "in-progress"
    },
    showBackdrop: false,
    event: ev
  });
  return popover.present();
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

const scanOrder = async (order: any, updateParameter?: string) => {
  const modal = await modalController.create({
    component: ScanOrderItemModal,
    componentProps: { order }
  });

  modal.onDidDismiss().then((result: any) => {
    if (result.data?.packOrder) {
      confirmPackOrder(order, updateParameter);
    }
  });

  modal.present();
};

const generateTrackingCodeForPacking = async (order: any, updateParameter?: string, documentOptions = {}, packingError?: string) => {
  const modal = await modalController.create({
    component: GenerateTrackingCodeModal,
    componentProps: { order, executePackOrder, rejectEntireOrder, updateParameter, documentOptions, packingError }
  });
  modal.present();
};

const openGiftCardActivationModal = async (item: any) => {
  const modal = await modalController.create({
    component: GiftCardActivationModal,
    componentProps: { item }
  });

  modal.onDidDismiss().then((result: any) => {
    if (result.data?.isGCActivated) {
      useOrderStore().updateCurrentItemGCActivationDetails({ item, category: "in-progress", isDetailsPage: false });
    }
  });

  modal.present();
};

const fetchOrderAndPickerInformation = async () => {
  await fetchPickersInformation();
  await updateOrderQuery(process.env.VUE_APP_VIEW_SIZE, "", true);
};

onIonViewWillEnter(async () => {
  isScrollingEnabled.value = false;
  isLoadingOrders.value = true;
  try {
    await fetchPickersInformation();
    await Promise.all([
      useUtilStore().fetchRejectReasonOptions(),
      initialiseOrderQuery()
    ]);
  } finally {
    isLoadingOrders.value = false;
  }

  emitter.on("updateOrderQuery", updateOrderQuery);
});

onBeforeRouteLeave(() => {
  useOrderStore().clearInProgressOrders();
  emitter.off("updateOrderQuery", updateOrderQuery);
});
</script>

<style scoped>
.box-type {
  display: flex;
  gap: var(--spacer-sm);
  border-bottom: var(--border-medium);
  padding: var(--ion-item-like-padding);
  align-items: center;
}

.box-type > ion-skeleton-text {
  width: 10%;
  height: 30px;
}

ion-segment > ion-segment-button > ion-skeleton-text, ion-item > ion-skeleton-text {
  width: 100%;
  height: 30px;
}

.order-item {
  grid-template-columns: repeat(3, 1fr);
}
</style>
