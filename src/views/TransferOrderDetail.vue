<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/transfer-orders" slot="start" />
        <ion-title>{{ translate("Transfer Order Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main v-if="currentOrder.orderId">
        <ion-item lines="none">
          <ion-label>
            <p class="overline">{{ currentOrder.orderId }}</p>
            {{ currentOrder.orderName }}
            <p>{{ currentOrder.externalId }}</p>
            <p>{{ translate('Item count') }}: {{ getItemCount() }}</p>
          </ion-label>
          <ion-badge slot="end">{{ currentOrder.orderStatusDesc ? currentOrder.orderStatusDesc : getStatusDesc(currentOrder.statusId) }}</ion-badge>
        </ion-item>

        <div class="scanner">
          <ion-item>
            <ion-input :disabled="currentOrder.statusId === 'ORDER_COMPLETED'" :label="translate('Scan items')" autofocus :placeholder="translate('Scan barcodes to pick them')" v-model="queryString" @keyup.enter="updateProductCount()" />
          </ion-item>

          <ion-button expand="block" fill="outline" :disabled="currentOrder.statusId === 'ORDER_COMPLETED'" @click="scanCode()">
            <ion-icon slot="start" :icon="barcodeOutline" />{{ translate("Scan") }}
          </ion-button>
        </div>

        <ion-segment scrollable v-if="hasOpenItems" v-model="selectedSegment">
          <ion-segment-button value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
        <div class="segments" v-if="currentOrder">
          <template v-if="selectedSegment === 'open'">
            <template v-if="getTOItems('open')?.length > 0">
              <TransferOrderItem v-for="item in getTOItems('open')" :key="currentOrder.orderId + item.orderItemSeqId + 'ship' + item.shippedQuantity" :itemDetail="item" :class="item.internalName === lastScannedId ? 'scanned-item' : ''" :id="item.internalName" isRejectionSupported="true" />
            </template>
            <template v-else>
              <div class="empty-state">
                <p>{{ translate('No data available') }}</p>
              </div>
            </template>
          </template>
          <template v-else>
            <template v-if="currentOrder?.shipments?.length > 0">
              <ion-card class="order" v-for="(shipment, index) in currentOrder.shipments" :key="index">
                <div class="order-header">
                  <div class="order-primary-info">
                    <ion-label>
                      <p>{{ translate("Shipped") }} {{ getTime(shipment.statusDate) }}</p>
                    </ion-label>
                  </div>
                  <div class="order-tags">
                    <ion-chip>
                      <ion-icon :icon="pricetagOutline" />
                      <ion-label>{{ shipment.shipmentId }}</ion-label>
                    </ion-chip>
                  </div>
                  <div class="order-metadata">
                    <ion-label>
                      {{ shipment.routeSegShipmentMethodDescription ? shipment.routeSegShipmentMethodDescription : shipment.routeSegShipmentMethodTypeId }}
                      <p v-if="shipment.trackingIdNumber">{{ translate("Tracking Code") }} {{ shipment.trackingIdNumber }}</p>
                    </ion-label>
                  </div>
                </div>
                <div v-for="item in shipment.items" :key="item.shipmentItemSeqId" class="order-item order-line-item">
                  <div class="product-info">
                    <ion-item lines="none">
                      <ion-thumbnail slot="start">
                        <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
                      </ion-thumbnail>
                      <ion-label>
                        <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                        {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                        <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
                      </ion-label>
                    </ion-item>
                  </div>
                  <div class="product-metadata">
                    <ion-item lines="none">
                      <ion-badge color="medium" slot="end">{{ item.orderedQuantity }} {{ translate("ordered") }}</ion-badge>
                      <ion-badge color="success" class="ion-margin-start" slot="end">{{ item.quantity }} {{ translate("shipped") }}</ion-badge>
                    </ion-item>
                  </div>
                </div>

                <div class="actions">
                  <div class="desktop-only">
                    <ion-button fill="outline" @click.stop="regenerateShippingLabel(shipment)">
                      {{ translate("Regenerate Shipping Label") }}
                      <ion-spinner color="primary" slot="start" v-if="shipment.isGeneratingShippingLabel" name="crescent" />
                    </ion-button>
                    <ion-button v-if="!shipment.trackingIdNumber" fill="outline" @click.stop="showShippingLabelErrorModal(shipment)">{{ translate("Shipping label error") }}</ion-button>
                  </div>
                </div>
              </ion-card>
            </template>
            <template v-else>
              <div class="empty-state">
                <p>{{ translate('No data available') }}</p>
              </div>
            </template>
          </template>
        </div>
      </main>
      <div class="empty-state" v-else>
        <p>{{ translate('No data available') }}</p>
      </div>
    </ion-content>
    <ion-footer v-if="currentOrder.statusId === 'ORDER_APPROVED' && selectedSegment === 'open'">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button color="dark" fill="outline" :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || isCreatingShipment" @click="closeTOItems()">
            {{ translate("Close Items") }}
          </ion-button>
          <ion-button v-show="areItemsEligibleForRejection" color="danger" fill="outline" :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || isCreatingShipment" @click="rejectItems()">
            <ion-icon slot="start" :icon="trashOutline" />
            {{ translate("Reject Items") }}
          </ion-button>
          <ion-button color="primary" fill="outline" :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || isCreatingShipment" @click="printTransferOrderPicklist()">
            <ion-icon slot="start" :icon="printOutline" />
            {{ translate('Picklist') }}
          </ion-button>
          <ion-button color="primary" fill="solid" :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || !isEligibleForCreatingShipment() || isCreatingShipment" @click="confirmCreateShipment">
            <ion-spinner v-if="isCreatingShipment" slot="start" name="crescent" />
            {{ translate('Create shipment') }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonBackButton, IonButton, IonButtons, IonCard, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonInput, IonLabel, IonPage, IonSegment, IonSegmentButton, IonSpinner, IonThumbnail, IonTitle, IonToolbar, alertController, modalController, onIonViewDidLeave, onIonViewWillEnter } from "@ionic/vue";
import { computed, ref } from "vue";
import { barcodeOutline, pricetagOutline, printOutline, trashOutline } from "ionicons/icons";
import { getProductIdentificationValue, DxpShopifyImg, openPosScanner, translate, useAuthStore, useProductIdentificationStore } from "@hotwax/dxp-components";
import { useRoute, useRouter } from "vue-router";
import Scanner from "@/components/Scanner.vue";
import { Actions, hasPermission } from "@/authorization";
import { DateTime } from "luxon";
import { getFeatures, showToast, hasWebcamAccess } from "@/utils";
import { TransferOrderService } from "@/services/TransferOrderService";
import { OrderService } from "@/services/OrderService";
import TransferOrderItem from "@/components/TransferOrderItem.vue";
import ShippingLabelErrorModal from "@/components/ShippingLabelErrorModal.vue";
import emitter from "@/event-bus";
import CloseTransferOrderModal from "@/components/CloseTransferOrderModal.vue";
import { useTransferOrderStore } from "@/store/transferorder";
import { useUtilStore } from "@/store/util";
import { useProductStore } from "@/store/product";

const route = useRoute();
const router = useRouter();
const queryString = ref("");
const selectedSegment = ref("open");
const isCreatingShipment = ref(false);
const lastScannedId = ref("");
const defaultRejectReasonId = "NO_VARIANCE_LOG";

const currentOrder = computed(() => useTransferOrderStore().getCurrent);
const getStatusDesc = (statusId: string) => useUtilStore().getStatusDesc(statusId);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);
const productStoreShipmentMethCount = computed(() => useUtilStore().getProductStoreShipmentMethCount);

const areItemsEligibleForRejection = computed(() => {
  return currentOrder.value.items?.some((item: any) => item.rejectReasonId);
});

const hasOpenItems = computed(() => {
  return currentOrder.value?.items?.some((item: any) => item.statusId === "ITEM_PENDING_FULFILL");
});

const printTransferOrderPicklist = async () => {
  await TransferOrderService.printTransferOrderPicklist(currentOrder.value.orderId);
};

const getItemCount = () => {
  return currentOrder.value?.items?.reduce((totalItems: any, item: any) => totalItems + (item.quantity || 0), 0);
};

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t a");
};

const getTOItems = (orderType: string) => {
  if (orderType === "completed") {
    return currentOrder.value?.items?.filter((item: any) => item.statusId === "ITEM_COMPLETED");
  }
  return currentOrder.value?.items?.filter((item: any) => item.statusId === "ITEM_PENDING_FULFILL");
};

const createShipment = async () => {
  isCreatingShipment.value = true;
  const shipmentId = await useTransferOrderStore().createOutboundTransferShipment(currentOrder.value);
  isCreatingShipment.value = false;
  if (shipmentId) {
    await useTransferOrderStore().clearCurrentTransferShipment();
    router.push({ path: `/transfer-order-details/${currentOrder.value.orderId}/ship-transfer-order/${shipmentId}` });
  }
};

const confirmCreateShipment = async () => {
  const message = translate("Make sure you have entered the correct item quantities to create the shipment.");
  const alert = await alertController.create({
    header: translate("Create shipment"),
    message,
    buttons: [
      {
        text: translate("Cancel")
      },
      {
        text: translate("Create"),
        handler: async () => {
          createShipment();
        }
      }
    ]
  });
  return alert.present();
};

const isEligibleForCreatingShipment = () => {
  let isEligible = currentOrder.value && currentOrder.value.items?.some((item: any) => item.pickedQuantity > 0);
  if (isEligible) {
    isEligible = !currentOrder.value.items?.some((item: any) => item.pickedQuantity > 0 && (item.shippedQuantity + item.pickedQuantity) > item.orderedQuantity);
  }
  return isEligible;
};

const updateProductCount = async (payload: any) => {
  if (queryString.value) {
    payload = queryString.value;
  }

  const result = await useTransferOrderStore().updateOrderProductCount(payload);
  if (result.isCompleted) {
    showToast(translate("Scanned item is already completed:", { itemName: payload }));
  } else if (result.isProductFound) {
    const item = result.orderItem;
    if (item.pickedQuantity > item.orderedQuantity - item.shippedQuantity) {
      showToast(translate("The picked quantity cannot exceed the ordered quantity.") + " " + translate("already shipped.", { shippedQuantity: item.shippedQuantity }));
    } else {
      showToast(translate("Scanned successfully.", { itemName: payload }));
      lastScannedId.value = payload;
      const scannedElement = document.getElementById(payload);
      scannedElement && (scannedElement.scrollIntoView());
      setTimeout(() => {
        lastScannedId.value = "";
      }, 3000);
    }
  } else {
    showToast(translate("Scanned item is not present within the order:", { itemName: payload }));
  }
  queryString.value = "";
};

const scanCode = async () => {
  if (useAuthStore().isEmbedded) {
    const scanData = await openPosScanner();
    if(scanData) {
      this.updateProductCount(scanData);
    } else {
      showToast(translate("No data received from scanner"));
    }
    return;
  }
  
  if (!(await hasWebcamAccess())) {
    showToast(translate("Camera access not allowed, please check permissons."));
    return;
  }
  const modal = await modalController.create({
    component: Scanner
  });
  modal.onDidDismiss()
    .then((result) => {
      updateProductCount(result.role);
    });
  return modal.present();
};

const showShippingLabelErrorModal = async (shipment: any) => {
  const shippingLabelErrorModal = await modalController.create({
    component: ShippingLabelErrorModal,
    componentProps: {
      shipmentId: shipment.shipmentId
    }
  });
  return shippingLabelErrorModal.present();
};

const regenerateShippingLabel = async (currentShipment: any) => {
  if (productStoreShipmentMethCount.value <= 0) {
    showToast(translate("Unable to generate shipping label due to missing product store shipping method configuration"));
    return;
  }

  if (currentShipment.isGeneratingShippingLabel) {
    return;
  }

  currentShipment.isGeneratingShippingLabel = true;
  let shippingLabelPdfUrls = currentShipment?.labelImageUrls;

  if (!currentShipment.trackingIdNumber) {
    await OrderService.retryShippingLabel(currentShipment.shipmentId);
    await useTransferOrderStore().fetchTransferOrderDetail({ orderId: currentOrder.value.orderId });
    currentShipment = currentOrder.value?.shipments?.find((shipment: any) => shipment.shipmentId === currentShipment.shipmentId);
    shippingLabelPdfUrls = currentShipment?.labelImageUrls;

    if (currentShipment.trackingIdNumber) {
      showToast(translate("Shipping Label generated successfully"));
      await TransferOrderService.printShippingLabel([currentShipment.shipmentId], shippingLabelPdfUrls, currentShipment?.shipmentPackages);
    } else {
      showToast(translate("Failed to generate shipping label"));
    }
  } else {
    await TransferOrderService.printShippingLabel([currentShipment.shipmentId], shippingLabelPdfUrls, currentShipment?.shipmentPackages);
  }

  currentShipment.isGeneratingShippingLabel = false;
};

const rejectItems = async () => {
  const alert = await alertController.create({
    header: translate("Reject transfer order"),
    message: translate("Rejecting a transfer order will remove it from your facility. Your inventory levels will not be affected from this rejection.", { space: "<br/><br/>" }),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Reject"),
      handler: async () => {
        emitter.emit("presentLoader");
        const payload = {
          orderId: currentOrder.value.orderId,
          items: currentOrder.value.items.map((item: any) => ({
            orderItemSeqId: item.orderItemSeqId,
            rejectionReasonId: item.rejectReasonId || defaultRejectReasonId
          }))
        };
        try {
          await TransferOrderService.rejectOrderItems(payload);
          showToast(translate("All order items are rejected"));
          router.replace("/transfer-orders");
        } catch (err) {
          console.error(err);
          showToast(translate("Failed to reject order"));
          await useTransferOrderStore().fetchTransferOrderDetail({ orderId: route.params.orderId });
        }
        emitter.emit("dismissLoader");
      }
    }]
  });
  return alert.present();
};

const closeTOItems = async () => {
  const modal = await modalController.create({
    component: CloseTransferOrderModal
  });

  return modal.present();
};

onIonViewWillEnter(async () => {
  emitter.emit("presentLoader");
  await useTransferOrderStore().fetchRejectReasons();
  await useTransferOrderStore().fetchTransferOrderDetail({ orderId: route.params.orderId });
  selectedSegment.value = hasOpenItems.value ? (route.params.category === "completed" ? "completed" : "open") : "completed";
  emitter.emit("dismissLoader");
});

onIonViewDidLeave(() => {
  const routeTo = router.currentRoute;
  if (routeTo.value.name !== "Transfer Orders") {
    useTransferOrderStore().clearTransferOrderFilters();
  }
});
</script>

<style scoped>
ion-content > main {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}
.scanned-item {
  outline: 2px solid var( --ion-color-medium-tint);
}
</style>
