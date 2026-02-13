<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="`/${category}`" />
        <ion-title>{{ translate("Order details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="order && Object.keys(order).length">
        <div class="order-header">
          <div class="order-primary-info">
            <h3>{{ order.orderName }}</h3>
          </div>
          <div class="order-tags">
            <ion-chip outline @click="copyToClipboard(order.orderId, 'Copied to clipboard')">
              <ion-icon :icon="pricetagOutline" />
              <ion-label>{{ order.orderId }}</ion-label>
            </ion-chip>
            <ion-chip v-if="category !== 'open'" outline @click="printPicklist(order)">
              <ion-icon :icon="documentTextOutline" />
              <ion-label>{{ translate('Linked picklist') }}: {{ order.picklistId }}</ion-label>
            </ion-chip>
            <ion-chip outline v-if="order?.paymentPreferences?.length > 0" :color="statusColor[order?.paymentPreferences[0]?.statusId]">
              <ion-icon :icon="cashOutline" />
              <ion-label>{{ translate(getPaymentMethodDesc(order?.paymentPreferences[0]?.paymentMethodTypeId)) }} : {{ translate(getStatusDesc(order?.paymentPreferences[0]?.statusId)) }}</ion-label>
            </ion-chip>
          </div>
          <div class="order-metadata">
            <ion-badge>{{ category === 'open' ? translate('Open') : (category === 'in-progress' ? translate('In Progress') : translate('Completed')) }}</ion-badge>
          </div>
        </div>

        <ion-card class="order">
          <div class="order-header">
            <div class="order-primary-info">
              <ion-label>
                <strong>{{ order.customerName }}</strong>
                <p>{{ translate("Ordered") }} {{ category === 'open' ? formatUtcDate(order.orderDate, 'dd MMMM yyyy hh:mm a ZZZZ') : getTime(order.orderDate) }}</p>
              </ion-label>
            </div>
            <div class="order-tags">
              <ion-chip outline>
                <ion-icon :icon="ribbonOutline" />
                <ion-label>{{ order.primaryShipGroupSeqId ? order.primaryShipGroupSeqId : order.shipGroupSeqId }}</ion-label>
              </ion-chip>
            </div>

            <div class="order-metadata">
              <ion-label>
                {{ getShipmentMethodDesc(order.shipmentMethodTypeId) }}
                <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
              </ion-label>
            </div>
          </div>

          <div v-if="category === 'in-progress'">
            <div class="box-type desktop-only" v-if="!order.shipmentPackages">
              <ion-skeleton-text animated />
              <ion-skeleton-text animated />
            </div>
            <div class="box-type desktop-only" v-else-if="order.shipmentPackages">
              <ion-button :disabled="order.items.length <= order.shipmentPackages.length || addingBoxForShipmentIds.includes(order.orderId)" @click.stop="addShipmentBox(order)" fill="outline" shape="round" size="small"><ion-icon :icon="addOutline" />
                {{ translate("Add Box") }}
              </ion-button>
              <ion-row>
                <ion-chip v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" @click.stop="updateShipmentBoxType(shipmentPackage, order, $event)">
                  {{ `Box ${shipmentPackage?.packageName}` }} {{ `| ${boxTypeDesc(getShipmentPackageType(order, shipmentPackage))}` }}
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </ion-row>
            </div>
          </div>

          <div v-for="item in order.items" :key="item" class="order-line-item">
            <div class="order-item">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                    <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
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

              <div v-if="category === 'in-progress'" class="desktop-only ion-text-center">
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
                  <ion-chip outline @click="openShipmentBoxPopover($event, item, order)">
                    <ion-icon :icon="fileTrayOutline" />
                    {{ `Box ${item.selectedBox || ''}` }}
                    <ion-icon :icon="caretDownOutline" />
                  </ion-chip>
                </template>
              </div>

              <div v-else></div>

              <div class="product-metadata">
                <ion-note v-if="getProductStock(item.productId).qoh" class="ion-padding-end">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                <ion-button color="medium" fill="clear" v-else size="small" @click="fetchProductStock(item.productId)">
                  {{ translate('Check stock') }}
                  <ion-icon slot="end" :icon="cubeOutline" />
                </ion-button>
                <ion-button v-if="category === 'in-progress'" @click="openRejectReasonPopover($event, item, order)" class="desktop-only" color="danger" fill="clear" size="small">
                  {{ translate('Report an issue') }}
                  <ion-icon slot="end" :icon="trashBinOutline" />
                </ion-button>
                <ion-button v-if="isKit(item)" fill="clear" color="medium" size="small" @click.stop="fetchKitComponent(item)">
                  {{ translate('Components') }}
                  <ion-icon v-if="item.showKitComponents" color="medium" slot="end" :icon="chevronUpOutline" />
                  <ion-icon v-else color="medium" slot="end" :icon="listOutline" />
                </ion-button>
                <ion-button v-if="item.productTypeId === 'GIFT_CARD'" fill="clear" color="medium" size="small" @click="openGiftCardActivationModal(item)">
                  {{ translate('Gift card') }}
                  <ion-icon color="medium" slot="end" :icon="item.isGCActivated ? gift : giftOutline" />
                </ion-button>
              </div>
            </div>
            <div v-if="item.showKitComponents && getProduct(item.productId)?.productComponents" class="kit-components">
              <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" v-image-preview="getProduct(productComponent.productIdTo)" :key="getProduct(productComponent.productIdTo)?.mainImageUrl">
                    <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" size="small" />
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                    <div>
                      {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                    </div>
                    <p>{{ getFeatures(getProduct(productComponent.productIdTo).productFeatures) }}</p>
                  </ion-label>
                  <ion-checkbox v-if="item.rejectReason || isEntierOrderRejectionEnabled(order)" :checked="item.kitComponents?.includes(productComponent.productIdTo)" @ionChange="rejectKitComponent(order, item, productComponent.productIdTo)" />
                </ion-item>
              </ion-card>
            </div>
          </div>

          <div v-if="category === 'in-progress'" class="mobile-only">
            <ion-item>
              <ion-button fill="clear" @click="packOrder(order)">{{ translate("Pack using default packaging") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click="packagingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <div v-else-if="category === 'completed'" class="mobile-only">
            <ion-item>
              <ion-button :disabled="isShipNowDisabled || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" fill="clear">{{ translate("Ship Now") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click.stop="shippingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <div class="actions">
            <div>
              <template v-if="category === 'in-progress'">
                <ion-button :color="order.hasAllRejectedItem ? 'danger' : ''" @click="packOrder(order)">
                  <ion-icon slot="start" :icon="archiveOutline" />
                  {{ translate(order.hasAllRejectedItem ? "Reject order" : order.hasRejectedItem ? "Save and Pack Order" : "Pack order") }}
                </ion-button>
                <Component :is="printDocumentsExt" :category="category" :order="order" :currentFacility="currentFacility" :hasMissingInfo="order.missingLabelImage" />
              </template>
              <ion-button v-else-if="category === 'open'" @click="assignPickers">
                <ion-icon slot="start" :icon="personAddOutline" />
                {{ translate("Pick order") }}
              </ion-button>
              <div v-else-if="category === 'completed'" class="desktop-only">
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true">
                  <ion-icon slot="start" :icon="bagCheckOutline" />
                  {{ translate("Shipped") }}
                </ion-button>
                <ion-button v-else :disabled="isShipNowDisabled || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click.stop="shipOrder(order)">
                  <ion-icon slot="start" :icon="bagCheckOutline" />
                  {{ translate("Ship order") }}
                </ion-button>
              </div>
            </div>
          </div>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonBadge, IonButton, IonCard, IonCheckbox, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonNote, IonPage, IonRow, IonSkeletonText, IonTitle, IonToolbar, IonThumbnail, alertController, popoverController, modalController, onIonViewDidEnter } from "@ionic/vue";
import { computed, defineProps, onMounted, ref } from "vue";
import { addOutline, archiveOutline, bagCheckOutline, cashOutline, caretDownOutline, chevronUpOutline, closeCircleOutline, cubeOutline, documentTextOutline, ellipsisVerticalOutline, fileTrayOutline, gift, giftOutline, listOutline, personAddOutline, pricetagOutline, ribbonOutline, trashBinOutline } from "ionicons/icons";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import { copyToClipboard, formatUtcDate, getFeatures, showToast } from "@/utils";
import { Actions, hasPermission } from "@/authorization";
import emitter from "@/event-bus";
import { OrderService } from "@/services/OrderService";
import { hasError } from "@/adapter";
import logger from "@/logger";
import { UtilService } from "@/services/UtilService";
import { DateTime } from "luxon";
import Popover from "@/views/ShippingPopover.vue";
import PackagingPopover from "@/views/PackagingPopover.vue";
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import ShipmentBoxTypePopover from "@/components/ShipmentBoxTypePopover.vue";
import ShipmentBoxPopover from "@/components/ShipmentBoxPopover.vue";
import ReportIssuePopover from "@/components/ReportIssuePopover.vue";
import { isKit } from "@/utils/order";
import ScanOrderItemModal from "@/components/ScanOrderItemModal.vue";
import GenerateTrackingCodeModal from "@/components/GenerateTrackingCodeModal.vue";
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { useDynamicImport } from "@/utils/moduleFederation";
import { useRouter } from "vue-router";
import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useStockStore } from "@/store/stock";
import { useUtilStore } from "@/store/util";
import { useCarrierStore } from "@/store/carrier";
import { useUserStore } from "@/store/user";

const props = defineProps(["category", "orderId", "shipGroupSeqId", "shipmentId"]);

const router = useRouter();
const addingBoxForShipmentIds = ref([] as any);
const defaultShipmentBoxType = ref({} as any);
const statusColor = ref({
  PAYMENT_AUTHORIZED: "",
  PAYMENT_CANCELLED: "warning",
  PAYMENT_DECLINED: "warning",
  PAYMENT_NOT_AUTH: "warning",
  PAYMENT_NOT_RECEIVED: "warning",
  PAYMENT_RECEIVED: "",
  PAYMENT_REFUNDED: "warning",
  PAYMENT_SETTLED: ""
} as any);
const rejectEntireOrderReasonId = "REJ_AVOID_ORD_SPLIT";
const shipmentLabelErrorMessage = ref("");
const shipmentMethodTypeId = ref("");
const initialShipmentMethodTypeId = ref("");
const carrierPartyId = ref("");
const carrierMethods = ref([] as any);
const orderInvoicingInfo = ref({} as any);
const orderInvoiceExt = ref("" as any);
const isCODPaymentPending = ref(false);
const isOrderAdjustmentPending = ref(false);
const orderAdjustments = ref([] as any);
const orderHeaderAdjustmentTotal = ref(0);
const adjustmentsByGroup = ref({} as any);
const orderAdjustmentShipmentId = ref("");
const printDocumentsExt = ref("" as any);

const boxTypeDesc = (id: string) => useUtilStore().getShipmentBoxDesc(id);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const getProductStock = (productId: string, facilityId = "") => useStockStore().getProductStock(productId, facilityId);
const inProgressOrders = computed(() => useOrderStore().getInProgressOrders);
const order = computed(() => useOrderStore().getCurrent);
const rejectReasonOptions = computed(() => useUtilStore().getRejectReasonOptions);
const userPreference = computed(() => useUserStore().getUserPreference);
const getPaymentMethodDesc = (paymentMethodTypeId: string) => useUtilStore().getPaymentMethodDesc(paymentMethodTypeId);
const getStatusDesc = (statusId: string) => useUtilStore().getStatusDesc(statusId);
const partialOrderRejectionConfig = computed(() => useUtilStore().getPartialOrderRejectionConfig);
const collateralRejectionConfig = computed(() => useUtilStore().getCollateralRejectionConfig);
const affectQohConfig = computed(() => useUtilStore().getAffectQohConfig);
const excludeOrderBrokerDays = computed(() => useUtilStore().getExcludeOrderBrokerDays);
const isForceScanEnabled = computed(() => useUtilStore().isForceScanEnabled);
const productStoreShipmentMethods = computed(() => useCarrierStore().getProductStoreShipmentMethods);
const facilityCarriers = computed(() => useCarrierStore().getFacilityCarriers);
const userProfile = computed(() => useUserStore().getUserProfile);
const isShipNowDisabled = computed(() => useUtilStore().isShipNowDisabled);
const instanceUrl = computed(() => useUserStore().getInstanceUrl);
const carrierShipmentBoxTypes = computed(() => useUtilStore().getCarrierShipmentBoxTypes);
const getShipmentMethodDesc = (shipmentMethodId: string) => useUtilStore().getShipmentMethodDesc(shipmentMethodId);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
};

const fetchShipmentLabelError = async () => {
  const shipmentId = order.value?.shipmentId;
  const labelError = await OrderService.fetchShipmentLabelError(shipmentId);
  if (labelError) {
    shipmentLabelErrorMessage.value = labelError;
  }
};

const getProductStoreShipmentMethods = async (carrierPartyIdValue: string) => {
  return productStoreShipmentMethods.value?.filter((method: any) => method.partyId === carrierPartyIdValue && (initialShipmentMethodTypeId.value === "SHIP_TO_STORE" || method.shipmentMethodTypeId !== "SHIP_TO_STORE")) || [];
};

const updateCarrierShipmentDetails = async (carrierPartyIdValue: string, shipmentMethodTypeIdValue: string) => {
  carrierPartyId.value = carrierPartyIdValue;
  shipmentMethodTypeId.value = shipmentMethodTypeIdValue;
  carrierMethods.value = await getProductStoreShipmentMethods(carrierPartyIdValue);
  shipmentLabelErrorMessage.value = "";
};

const fetchKitComponent = async (orderItem: any, isOtherShipment = false) => {
  await useProductStore().fetchProductComponents({ productId: orderItem.productId });

  if (isOtherShipment) {
    const updatedShipGroup = order.value?.shipGroups.find((shipGroup: any) => shipGroup.shipGroupSeqId === orderItem.shipGroupSeqId);
    if (updatedShipGroup) {
      const updatedItem = updatedShipGroup?.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
      updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;
    }
  } else {
    const updatedItem = order.value.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId);
    updatedItem.showKitComponents = orderItem.showKitComponents ? false : true;
    if (!updatedItem.kitComponents) {
      updatedItem.kitComponents = getProduct(updatedItem.productId).productComponents.map((productComponent: any) => productComponent.productIdTo);
    }
  }
};

const getRejectionReasonDescription = (rejectionReasonId: string) => {
  const reason = rejectReasonOptions.value?.find((reason: any) => reason.enumId === rejectionReasonId);
  return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
};

const isEntierOrderRejectionEnabled = (currentOrder: any) => {
  return !partialOrderRejectionConfig.value && currentOrder.hasRejectedItem;
};

const printPicklist = async (currentOrder: any) => {
  await OrderService.printPicklist(currentOrder.picklistId);
};

const openShipmentBoxPopover = async (ev: Event, item: any, currentOrder: any) => {
  const popover = await popoverController.create({
    component: ShipmentBoxPopover,
    componentProps: {
      shipmentPackages: currentOrder.shipmentPackages
    },
    showBackdrop: false,
    event: ev
  });

  popover.present();

  const result = await popover.onDidDismiss();

  if (result.data && item.selectedBox !== result.data) {
    currentOrder.items.map((orderItem: any) => {
      if (orderItem.orderItemSeqId === item.orderItemSeqId) {
        orderItem.selectedBox = result.data;
      }
    });
  }
  return result.data;
};

const fetchProductStock = (productId: string, facilityId = "") => {
  useStockStore().fetchStock({ productId, facilityId });
};

const packOrder = async (currentOrder: any) => {
  if (currentOrder.hasRejectedItem) {
    const itemsToReject = currentOrder.items.filter((item: any) => item.rejectReason);
    reportIssue(currentOrder, itemsToReject);
    return;
  }
  initiatePackOrder(currentOrder);
};

const initiatePackOrder = async (currentOrder: any, updateParameter?: string) => {
  let forceScan = isForceScanEnabled.value;
  if (isEntierOrderRejectionEnabled(currentOrder)) {
    forceScan = false;
  } else if (forceScan) {
    forceScan = !currentOrder.items.every((item: any) => item.rejectReason);
  }

  if (currentOrder.hasAllRejectedItem) {
    const isSuccess = await rejectEntireOrder(currentOrder, updateParameter);
    if (isSuccess) {
      router.push("/in-progress");
    }
  } else if (forceScan) {
    await scanOrder(currentOrder, updateParameter);
  } else {
    await confirmPackOrder(currentOrder, updateParameter);
  }
};

const rejectEntireOrder = async (currentOrder: any, updateParameter?: string) => {
  emitter.emit("presentLoader");
  try {
    const updatedOrderDetail = await getUpdatedOrderDetail(currentOrder, updateParameter);
    const params = {
      shipmentId: currentOrder.shipmentId,
      orderId: currentOrder.orderId,
      facilityId: currentOrder.originFacilityId,
      rejectedOrderItems: updatedOrderDetail.rejectedOrderItems
    };
    const resp = await OrderService.packOrder(params);

    if (hasError(resp)) {
      throw resp.data;
    }

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

const confirmPackOrder = async (currentOrder: any, updateParameter?: string, trackingCode?: string) => {
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
          const packingResponse = await executePackOrder(currentOrder, updateParameter, trackingCode, data);
          if (!packingResponse.isPacked) {
            const updatedOrder = await useOrderStore().updateShipmentPackageDetail(currentOrder);
            await generateTrackingCodeForPacking(updatedOrder, updateParameter, data, packingResponse.errors);
          }
        }
      }]
    });
  return confirmPackOrder.present();
};

const executePackOrder = async (currentOrder: any, updateParameter?: string, trackingCode?: string, documentOptions?: any) => {
  emitter.emit("presentLoader");
  let toast: any;
  const shipmentIds = [currentOrder.shipmentId];
  const manualTrackingCode = trackingCode;

  try {
    const updatedOrderDetail = await getUpdatedOrderDetail(currentOrder, updateParameter) as any;
    const params = {
      shipmentId: currentOrder.shipmentId,
      orderId: currentOrder.primaryOrderId,
      facilityId: currentOrder.originFacilityId,
      rejectedOrderItems: updatedOrderDetail.rejectedOrderItems,
      shipmentPackageContents: updatedOrderDetail.shipmentPackageContents,
      trackingCode: manualTrackingCode
    };

    const resp = await OrderService.packOrder(params);
    if (hasError(resp)) {
      throw resp.data;
    }
    await useOrderStore().updateShipmentPackageDetail(order.value);
    const shippingLabelPdfUrls: string[] = Array.from(
      new Set(
        (order.value.shipmentPackages ?? [])
          .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
          .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)
      )
    );

    emitter.emit("dismissLoader");

    if (documentOptions.length) {
      toast = await showToast(translate("Order packed successfully. Document generation in process"), { canDismiss: true, manualDismiss: true });
      toast.present();

      if (documentOptions.includes("printPackingSlip") && documentOptions.includes("printShippingLabel")) {
        if (shippingLabelPdfUrls && shippingLabelPdfUrls.length > 0) {
          await OrderService.printPackingSlip(shipmentIds);
          await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, currentOrder.shipmentPackages);
        } else {
          await OrderService.printShippingLabelAndPackingSlip(shipmentIds, currentOrder.shipmentPackages);
        }
      } else if (documentOptions.includes("printPackingSlip")) {
        await OrderService.printPackingSlip(shipmentIds);
      } else if (documentOptions.includes("printShippingLabel") && !manualTrackingCode && !order.value.missingLabelImage) {
        await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, currentOrder.shipmentPackages);
      }
      if (currentOrder.shipmentPackages?.[0].internationalInvoiceUrl) {
        await OrderService.printCustomDocuments([currentOrder.shipmentPackages?.[0].internationalInvoiceUrl]);
      }

      toast.dismiss();
    } else {
      showToast(translate("Order packed successfully"));
    }
    router.replace(`/completed/shipment-detail/${props.orderId}/${props.shipmentId}`);
    return { isPacked: true };
  } catch (err: any) {
    if (toast) toast.dismiss();
    emitter.emit("dismissLoader");
    showToast(translate("Failed to pack order"));
    logger.error("Failed to pack order", err);
    return { isPacked: false, errors: err?.response?.data?.errors };
  } finally {
    emitter.emit("dismissLoader");
  }
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

const openRejectReasonPopover = async (ev: Event, item: any, currentOrder: any) => {
  const reportIssuePopover = await popoverController.create({
    component: ReportIssuePopover,
    event: ev,
    translucent: true,
    showBackdrop: false
  });

  reportIssuePopover.present();

  const result = await reportIssuePopover.onDidDismiss();

  if (result.data) {
    currentOrder.items.map((orderItem: any) => {
      if (orderItem.orderItemSeqId === item.orderItemSeqId) {
        orderItem.rejectReason = result.data;
      }
    });
    currentOrder.hasRejectedItem = true;
    currentOrder.hasAllRejectedItem = isEntierOrderRejectionEnabled(currentOrder) || currentOrder.items.every((item: any) => item.rejectReason);
  }
};

const removeRejectionReason = async (ev: Event, item: any, currentOrder: any) => {
  delete item["rejectReason"];
  delete item["kitComponents"];

  item.rejectReason = "";
  currentOrder.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      delete orderItem["rejectReason"];
      delete orderItem["kitComponents"];
    }
  });
  currentOrder.hasRejectedItem = currentOrder.items.some((item: any) => item.rejectReason);
  currentOrder.hasAllRejectedItem = isEntierOrderRejectionEnabled(currentOrder) || currentOrder.items.every((item: any) => item.rejectReason);
};

const rejectKitComponent = (currentOrder: any, item: any, componentProductId: string) => {
  let kitComponents = item.kitComponents ? item.kitComponents : [];
  if (kitComponents.includes(componentProductId)) {
    kitComponents = kitComponents.filter((rejectedComponent: any) => rejectedComponent !== componentProductId);
  } else {
    kitComponents.push(componentProductId);
  }
  item.kitComponents = kitComponents;
  currentOrder.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      orderItem.kitComponents = kitComponents;
    }
  });
};

const assignPickers = async () => {
  const assignPickerModal = await modalController.create({
    component: AssignPickerModal,
    componentProps: { order: order.value }
  });

  assignPickerModal.onDidDismiss().then((result: any) => {
    popoverController.dismiss();
    if (result?.data?.value?.picklistId && result?.data?.value?.shipmentIds && result?.data?.value?.shipmentIds.length) {
      let newShipmentId = props.shipmentId;
      if (!newShipmentId) {
        newShipmentId = result?.data?.value?.shipmentIds[0];
      }
      router.replace(`/in-progress/shipment-detail/${props.orderId}/${newShipmentId}`);
    }
  });

  return assignPickerModal.present();
};

const getShipmentPackageType = (currentOrder: any, shipmentPackage: any) => {
  let packageType = shipmentPackage.shipmentBoxTypeId;
  if (!packageType) {
    const shipmentBoxTypes = getShipmentBoxTypes(currentOrder.carrierPartyId);
    packageType = shipmentBoxTypes[0];
  }
  return packageType;
};

const getShipmentBoxTypes = (carrierPartyIdValue: string) => {
  return carrierShipmentBoxTypes.value[carrierPartyIdValue] ? carrierShipmentBoxTypes.value[carrierPartyIdValue] : [];
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

const addShipmentBox = async (currentOrder: any) => {
  addingBoxForShipmentIds.value.push(currentOrder.shipmentId);

  const { carrierPartyId: carrierId, shipmentMethodTypeId: shipmentMethodId } = currentOrder;

  if (!Object.keys(defaultShipmentBoxType.value).length) {
    defaultShipmentBoxType.value = await fetchDefaultShipmentBox();
  }

  let packageName = "A";
  const packageNames = currentOrder?.shipmentPackages
    .filter((shipmentPackage: any) => shipmentPackage.packageName)
    .map((shipmentPackage: any) => shipmentPackage.packageName);
  if (packageNames && packageNames.length) {
    packageNames.sort((a: any, b: any) => b.localeCompare(a));
    packageName = String.fromCharCode(packageNames[0].charCodeAt(0) + 1);
  }

  const params = {
    shipmentId: currentOrder.shipmentId,
    shipmentBoxTypeId: defaultShipmentBoxType.value?.shipmentBoxTypeId,
    boxLength: defaultShipmentBoxType.value?.boxLength,
    boxHeight: defaultShipmentBoxType.value?.boxHeight,
    boxWidth: defaultShipmentBoxType.value?.boxWidth,
    weightUomId: defaultShipmentBoxType.value?.weightUomId,
    dimensionUomId: defaultShipmentBoxType.value?.dimensionUomId,
    packageName,
    dateCreated: DateTime.now().toMillis()
  } as any;

  carrierId && (params["carrierPartyId"] = carrierId);
  shipmentMethodId && (params["shipmentMethodTypeId"] = shipmentMethodId);

  try {
    const resp = await OrderService.addShipmentBox(params);

    if (!hasError(resp)) {
      showToast(translate("Box added successfully"));
      await useOrderStore().getInProgressOrder({ orderId: props.orderId, shipmentId: props.shipmentId });
      useOrderStore().updateInProgressOrder(order.value);
    } else {
      throw resp.data;
    }
  } catch (err) {
    showToast(translate("Failed to add box"));
    logger.error("Failed to add box", err);
  }
  addingBoxForShipmentIds.value.splice(addingBoxForShipmentIds.value.indexOf(currentOrder.shipmentId), 1);
};

const updateShipmentBoxType = async (shipmentPackage: any, currentOrder: any, ev: CustomEvent) => {
  const shipmentBoxTypes = getShipmentBoxTypes(currentOrder.carrierPartyId);
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

  if (result.data) {
    shipmentPackage.shipmentBoxTypeId = result.data;
    useOrderStore().updateInProgressOrder(currentOrder);
  }
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

const reportIssue = async (currentOrder: any, itemsToReject: any) => {
  let message;
  const rejectedItem = itemsToReject[0];
  const productName = rejectedItem.productName;

  let ordersCount = 0;

  if (collateralRejectionConfig.value) {
    ordersCount = inProgressOrders.value.list.map((inProgressOrder: any) => inProgressOrder.items.filter((item: any) => itemsToReject.some((itemToReject: any) => itemToReject.productId === item.productId) && item.shipmentId !== currentOrder.shipmentId))?.filter((item: any) => item.length).length;
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
          await initiatePackOrder(currentOrder, "report");
        }
      }]
    });

  return alert.present();
};

const getUpdatedOrderDetail = async (currentOrder: any, updateParameter?: string) => {
  const items = JSON.parse(JSON.stringify(currentOrder.items));
  const rejectedOrderItems = [] as any;
  const shipmentPackageContents = [] as any;
  items.map((item: any) => {
    const shipmentPackage = currentOrder.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.packageName === item.selectedBox);
    if (updateParameter === "report" && item.rejectReason) {
      const rejectedItemInfo = {
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        shipmentId: item.shipmentId,
        shipmentItemSeqId: item.shipmentItemSeqId,
        productId: item.productId,
        facilityId: currentFacility.value?.facilityId,
        updateQOH: affectQohConfig.value || false,
        maySplit: isEntierOrderRejectionEnabled(currentOrder) ? "N" : "Y",
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

const hasPackedShipments = (currentOrder: any) => {
  return currentOrder.statusId === "SHIPMENT_PACKED";
};

const shipOrder = async (currentOrder: any) => {
  try {
    const resp = await OrderService.shipOrder({ shipmentId: currentOrder.shipmentId });

    if (!hasError(resp)) {
      showToast(translate("Order shipped successfully"));
      currentOrder.statusId = "SHIPMENT_SHIPPED";
      useOrderStore().updateCurrent(currentOrder);
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to ship order", err);
    showToast(translate("Failed to ship order"));
  }
};

const fetchOrderInvoicingStatus = async () => {
  let orderInvoicingInfoValue = {} as any, resp;

  const params = {
    customParametersMap: {
      orderId: order.value.orderId,
      orderByField: "-entryDate",
      pageSize: 1
    },
    dataDocumentId: "ApiCommunicationEventOrder"
  };

  try {
    resp = await OrderService.findOrderInvoicingInfo(params);

    if (!hasError(resp) && resp.data?.entityValueList?.length) {
      const response = resp.data?.entityValueList[0];

      const content = Object.keys(response.content).length ? JSON.parse(response.content) : {};

      const invoicingFacility = userProfile.value.facilities.find((facility: any) => facility.facilityId === content?.request?.InvoicingStore);

      orderInvoicingInfoValue = {
        id: response.orderId,
        createdDate: getInvoicingConfirmationDate(response.entryDate),
        response: Object.keys(content.response).length ? content?.response : {},
        status: content.status,
        statusCode: content.statusCode,
        invoicingFacility
      };

      const retailProStatus = order.value.attributes.find((attribute: any) => attribute.attrName === "retailProStatus");
      if (Object.keys(retailProStatus).length && retailProStatus?.attrValue === "Invoiced") {
        orderInvoicingInfoValue["invoicingConfirmationDate"] = retailProStatus?.lastUpdatedStamp;
      }
    } else {
      throw resp.data;
    }
  } catch (error: any) {
    logger.error(error);
  }

  orderInvoicingInfo.value = orderInvoicingInfoValue;
};

const getInvoicingConfirmationDate = (date: any) => {
  return DateTime.fromMillis(date).setZone(userProfile.value.userTimeZone).toFormat("dd MMMM yyyy hh:mm a ZZZZ");
};


const isTrackingRequiredForAnyShipmentPackage = (currentOrder: any) => {
  return currentOrder.isTrackingRequired === "Y";
};

const scanOrder = async (currentOrder: any, updateParameter?: string) => {
  const modal = await modalController.create({
    component: ScanOrderItemModal,
    componentProps: { order: currentOrder }
  });

  modal.onDidDismiss().then((result: any) => {
    if (result.data?.packOrder) {
      confirmPackOrder(currentOrder, updateParameter);
    }
  });

  modal.present();
};

const generateTrackingCodeForPacking = async (currentOrder: any, updateParameter?: string, documentOptions?: any, packingError?: string) => {
  const modal = await modalController.create({
    component: GenerateTrackingCodeModal,
    componentProps: { order: currentOrder, updateCarrierShipmentDetails, executePackOrder, rejectEntireOrder, updateParameter, documentOptions, packingError, isDetailPage: "Y", initialShipmentMethodTypeId: initialShipmentMethodTypeId.value }
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
      useOrderStore().updateCurrentItemGCActivationDetails({ item, category: props.category, isDetailsPage: true });
    }
  });

  modal.present();
};

const fetchCODPaymentInfo = async () => {
  try {
    const isPendingCODPayment = order.value?.paymentPreferences?.some((paymentPref: any) => paymentPref.paymentMethodTypeId === "EXT_SHOP_CASH_ON_DEL" && paymentPref.statusId === "PAYMENT_NOT_RECEIVED");
    if (isPendingCODPayment) {
      isCODPaymentPending.value = true;
      orderHeaderAdjustmentTotal.value = 0;
      orderAdjustments.value = order.value?.adjustments.filter((adjustment: any) => {
        if ((adjustment.orderItemSeqId === "_NA_" || !adjustment.orderItemSeqId) && !adjustment.billingShipmentId) {
          orderHeaderAdjustmentTotal.value += adjustment.amount;
          return true;
        } else {
          adjustmentsByGroup.value[adjustment.shipGroupSeqId] ? (adjustmentsByGroup.value[adjustment.shipGroupSeqId].push(adjustment)) : (adjustmentsByGroup.value[adjustment.shipGroupSeqId] = [adjustment]);
          return false;
        }
      });
      isOrderAdjustmentPending.value = order.value?.adjustments.some((adjustment: any) => !adjustment.billingShipmentId);

      if (!isOrderAdjustmentPending.value) {
        const adjustment = order.value?.adjustments.find((adjustment: any) => adjustment.billingShipmentId);
        orderAdjustmentShipmentId.value = adjustment.billingShipmentId;
      }
    }
  } catch (err) {
    logger.error(err);
  }
};

onIonViewDidEnter(async () => {
  await useUtilStore().fetchRejectReasonOptions();
  if (props.category === "open") {
    await useOrderStore().getOpenOrder({ orderId: props.orderId, shipGroupSeqId: props.shipGroupSeqId });
  } else if (props.category === "in-progress") {
    await useOrderStore().getInProgressOrder({ orderId: props.orderId, shipmentId: props.shipmentId });
  } else {
    await useOrderStore().getCompletedOrder({ orderId: props.orderId, shipmentId: props.shipmentId });
  }
  initialShipmentMethodTypeId.value = order.value?.shipmentMethodTypeId;
  await Promise.all([useUtilStore().fetchCarrierShipmentBoxTypes(), useCarrierStore().fetchFacilityCarriers(), useCarrierStore().fetchProductStoreShipmentMeths(), fetchOrderInvoicingStatus()]);
  if (facilityCarriers.value) {
    const shipmentPackageRouteSegDetail = order.value.shipmentPackageRouteSegDetails?.[0];
    carrierPartyId.value = shipmentPackageRouteSegDetail?.carrierPartyId ? shipmentPackageRouteSegDetail?.carrierPartyId : facilityCarriers.value[0].partyId;
    carrierMethods.value = await getProductStoreShipmentMethods(carrierPartyId.value);
    shipmentMethodTypeId.value = shipmentPackageRouteSegDetail?.shipmentMethodTypeId;
  }

  await fetchShipmentLabelError();

  isCODPaymentPending.value = false;
  isOrderAdjustmentPending.value = false;
  fetchCODPaymentInfo();
});

onMounted(async () => {
  const instance = instanceUrl.value.split("-")[0].replace(new RegExp("^(https|http)://"), "").replace(new RegExp("/api.*"), "").replace(new RegExp(":.*"), "");
  printDocumentsExt.value = await useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_PrintDocument` });
  orderInvoiceExt.value = await useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_OrderInvoice` });
});
</script>

<style scoped>
ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0px;
}

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

.other-shipment-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.product-metadata {
  display: flex;
  flex-direction: column;
  align-items: end;
}

.shipgroup-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(343px, 1fr));
  gap: 10px;
  align-items: start;
}
</style>
