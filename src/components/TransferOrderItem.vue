<template>
  <ion-card :data-testid="`product-card-btn-${item.orderItemSeqId}`" :id="item.scannedId ? item.scannedId : getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))" :class="{ 'scanned-item': lastScannedId && lastScannedId === (item.scannedId || getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))) }">
    <div class="product">
      <div class="product-info">
        <ion-item lines="none">
          <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
            <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
          </ion-thumbnail>
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
            {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productId }}
            <p>{{ getFeatures(getProduct(item.productId).productFeatures)}}</p>
          </ion-label>
        </ion-item>
      </div>
      <div class="product-count">
        <ion-item v-if="!item.shipmentId" lines="none">
          <ion-input data-testid="qty-input" :label="translate('Qty')" label-placement="floating" ref="pickedQuantityInput" type="number" min="0" :value="item.pickedQuantity" @ionInput="updatePickedQuantity($event, item); validatePickedQuantity($event, item); markPickedQuantityTouched()" @ionBlur="updateItemQuantity(item)" :errorText="getErrorText()" :disabled="isForceScanEnabled" />
        </ion-item>
        <ion-item v-else lines="none">
          <ion-label slot="end">{{ item.pickedQuantity }} {{ translate('packed') }}</ion-label>
        </ion-item>
      </div>
    </div>
    <div class="action border-top">
      <div class="pick-all-qty" v-if="!item.shipmentId">
        <ion-button v-if="item.orderedQuantity" @click="pickAll(item)" slot="start" size="small" fill="outline" :disabled="isForceScanEnabled">
          {{ translate("Pick All") }}
        </ion-button>
        <ion-button data-testid="book-qoh-btn" v-else :disabled="!item.qoh || item.qoh <= 0 || item.pickedQuantity >= item.qoh" slot="start" size="small" fill="outline" @click="bookQoh(item)">
          {{ translate("Book qoh") }}
        </ion-button>
      </div>

      <div class="qty-progress">
        <ion-progress-bar :color="getProgressBarColor(item)" :value="getPickedToOrderedFraction(item)" />
      </div>

      <div class="to-item-history" v-if="isRejectionSupported && !isAnyItemShipped">
        <ion-chip outline color="danger" v-if="item.rejectReasonId" @click="openRejectReasonPopover($event, item)">
          <ion-icon :icon="closeCircleOutline" @click.stop="removeRejectionReason(item)"/>
          <ion-label>{{ getRejectionReasonDescription(item.rejectReasonId) }}</ion-label>
          <ion-icon :icon="caretDownOutline"/>
        </ion-chip>
        <ion-chip outline color="danger" v-else-if="isAnyItemSelectedForRejection" @click="openRejectReasonPopover($event, item)">
          <ion-label>{{ getRejectionReasonDescription(defaultRejectReasonId) }}</ion-label>
          <ion-icon :icon="caretDownOutline"/>
        </ion-chip>
        <ion-chip outline v-else @click="openRejectReasonPopover($event, item)">
          <ion-label>{{ translate("Report an issue") }}</ion-label>
          <ion-icon :icon="caretDownOutline"/>
        </ion-chip>
      </div>

      <div class="to-item-history" v-else-if="orderStatus !== 'created'">
        <ion-chip outline @click="item.shippedQuantity && shippedHistory(item.productId)">
          <ion-icon :icon="checkmarkDone"/>
          <ion-label> {{ item.shippedQuantity || 0 }} {{ translate("shipped") }} </ion-label>
        </ion-chip>
      </div>

      <div class="qty-ordered" v-if="item.orderedQuantity">
        <ion-label>{{ item.orderedQuantity }} {{ translate("ordered") }}</ion-label>
      </div>

      <ion-item v-if="orderStatus === 'created'" class="qty-qoh" lines="none">
        <ion-label>{{ item.qoh != null ? item.qoh : 0 }} {{ translate("Qoh") }}</ion-label>
        <ion-button data-testid="remove-item-btn" size="default" fill="clear" slot="end" color="danger" @click="removeOrderItem(item)">
          <ion-icon slot="icon-only" :icon="removeCircleOutline" />
        </ion-button>
      </ion-item>
    </div>
  </ion-card>
</template>

<script setup lang="ts">
import { IonButton, IonCard, IonChip, IonIcon, IonItem, IonInput, IonLabel, IonProgressBar, IonThumbnail, modalController, popoverController } from "@ionic/vue";
import { computed, defineProps, nextTick, ref, watch } from "vue";
import { caretDownOutline, checkmarkDone, closeCircleOutline, removeCircleOutline } from "ionicons/icons";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { TransferOrderService } from "@/services/TransferOrderService";
import { OrderService } from "@/services/OrderService";
import { useRouter } from "vue-router";
import { getFeatures, showToast } from "@/utils";
import { hasError } from "@/adapter";
import logger from "@/logger";
import ShippedHistoryModal from "@/components/ShippedHistoryModal.vue";
import ReportIssuePopover from "./ReportIssuePopover.vue";
import emitter from "@/event-bus";
import { useTransferOrderStore } from "@/store/transferorder";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";

const props = defineProps(["itemDetail", "isRejectionSupported", "lastScannedId", "orderStatus"]);

const router = useRouter();
const pickedQuantityInput = ref<any>(null);
const pickedQuantity = ref(props.itemDetail.pickedQuantity);
const item = ref(props.itemDetail);
const defaultRejectReasonId = "NO_VARIANCE_LOG";

const currentOrder = computed(() => useTransferOrderStore().getCurrent);
const isForceScanEnabled = computed(() => useUtilStore().isForceScanEnabled);
const rejectReasons = computed(() => useTransferOrderStore().getRejectReasons);
const barcodeIdentifier = computed(() => useUtilStore().getBarcodeIdentificationPref);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);
const getProduct = (productId: string) => useProductStore().getProduct(productId);

watch(() => props.itemDetail, (newItem: any) => {
  item.value = newItem;
  pickedQuantity.value = newItem.pickedQuantity;
});

const isAnyItemSelectedForRejection = computed(() => {
  return currentOrder.value.items.some((currentItem: any) => currentItem.rejectReasonId);
});

const isAnyItemShipped = computed(() => {
  return currentOrder.value.items.some((currentItem: any) => currentItem.shippedQuantity > 0);
});

const getProgressBarColor = (currentItem: any) => {
  const fraction = getPickedToOrderedFraction(currentItem);
  if (fraction > 1) return "danger";
  if (fraction === 1) return "success";
  return "primary";
};

const getPickedToOrderedFraction = (currentItem: any) => {
  if (currentItem.orderedQuantity && currentItem.orderedQuantity > 0) {
    return ((currentItem.pickedQuantity || 0) + (currentItem.shippedQuantity || 0)) / currentItem.orderedQuantity;
  } else if (currentItem.qoh && currentItem.qoh > 0) {
    return currentItem.pickedQuantity / currentItem.qoh;
  }
  return 0;
};

const pickAll = async (selectedItem: any) => {
  const currentItem = currentOrder.value.items.find((ele: any) => ele.orderItemSeqId === selectedItem.orderItemSeqId);
  if (currentItem) {
    pickedQuantity.value = item.value.shippedQuantity ? currentItem.quantity - item.value.shippedQuantity : currentItem.quantity;
    currentItem.pickedQuantity = pickedQuantity.value;
    currentItem.progress = currentItem.pickedQuantity / currentItem.quantity;
  }
  pickedQuantityInput.value?.$el.classList.remove("ion-valid");
  pickedQuantityInput.value?.$el.classList.remove("ion-invalid");
  await useTransferOrderStore().updateCurrentTransferOrder(currentOrder.value);
};

const updatePickedQuantity = async (event: any, selectedItem: any) => {
  const currentItem = currentOrder.value.items.find((ele: any) => ele.orderItemSeqId === selectedItem.orderItemSeqId);
  if (currentItem) {
    currentItem.pickedQuantity = event.detail.value ? parseInt(event.detail.value) : 0;
    currentItem.progress = parseInt(currentItem.pickedQuantity);
    selectedItem.pickedQuantity = currentItem.pickedQuantity;
    selectedItem.progress = currentItem.progress;
  }
  await useTransferOrderStore().updateCurrentTransferOrder(currentOrder.value);
};

const shippedHistory = async (productId?: string) => {
  const modal = await modalController.create({ component: ShippedHistoryModal, componentProps: { productId } });
  return modal.present();
};

const validatePickedQuantity = (event: any, selectedItem: any) => {
  const value = event.target.value;
  const path = router.currentRoute.value.path;

  pickedQuantityInput.value?.$el.classList.remove("ion-valid");
  pickedQuantityInput.value?.$el.classList.remove("ion-invalid");

  if (path.includes("/create-transfer-order") && value <= 0) {
    pickedQuantityInput.value?.$el.classList.add("ion-invalid");
    return;
  }

  if (value === "") return;

  value > (selectedItem.orderedQuantity - item.value.shippedQuantity)
    ? pickedQuantityInput.value?.$el.classList.add("ion-invalid")
    : pickedQuantityInput.value?.$el.classList.add("ion-valid");
};

const markPickedQuantityTouched = () => {
  pickedQuantityInput.value?.$el.classList.add("ion-touched");
};

const getErrorText = () => {
  const path = router.currentRoute.value.path;
  return path.includes("/create-transfer-order")
    ? translate("Please enter valid item quantity.")
    : translate("The picked quantity cannot exceed the ordered quantity.") + " " + (item.value.shippedQuantity > 0 ? translate("already shipped.", { shippedQuantity: item.value.shippedQuantity }) : "");
};

const openRejectReasonPopover = async (ev: Event, selectedItem: any) => {
  const reportIssuePopover = await popoverController.create({
    component: ReportIssuePopover,
    componentProps: { rejectReasons: rejectReasons.value },
    event: ev,
    translucent: true,
    showBackdrop: false
  });

  reportIssuePopover.present();

  const result = await reportIssuePopover.onDidDismiss();
  if (result.data) {
    selectedItem.rejectReasonId = result.data;
    await useTransferOrderStore().updateCurrentTransferOrder(currentOrder.value);
  }
};

const removeRejectionReason = async (selectedItem: any) => {
  delete selectedItem["rejectReasonId"];
  await useTransferOrderStore().updateCurrentTransferOrder(currentOrder.value);
};

const getRejectionReasonDescription = (rejectionReasonId: string) => {
  const reason = rejectReasons.value?.find((reason: any) => reason.enumId === rejectionReasonId);
  return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
};

const bookQoh = async (selectedItem: any) => {
  if (selectedItem.qoh) {
    selectedItem.pickedQuantity = selectedItem.qoh;
    await nextTick();
    await updateItemQuantity(selectedItem);
  }
};

const updateItemQuantity = async (selectedItem: any) => {
  if (currentOrder.value.statusId !== "ORDER_CREATED") return;

  const currentItem = currentOrder.value.items.find((orderItem: any) => orderItem.orderItemSeqId === selectedItem.orderItemSeqId);
  const itemQuantity = parseInt(pickedQuantityInput.value?.$el.value) || 0;

  if (currentItem && itemQuantity === currentItem.quantity) return;
  if (itemQuantity <= 0) return;

  try {
    const resp = await TransferOrderService.updateOrderItem({ orderId: currentOrder.value.orderId, orderItemSeqId: selectedItem.orderItemSeqId, quantity: itemQuantity });
    if (!hasError(resp)) {
      currentItem.quantity = itemQuantity;
      currentItem.pickedQuantity = itemQuantity;
      await useTransferOrderStore().updateCurrentTransferOrder(currentOrder.value);
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
    showToast(translate("Failed to update item quantity"));
  }
};

const removeOrderItem = async (selectedItem: any) => {
  if (!selectedItem || !selectedItem.orderItemSeqId) return;
  try {
    const resp = await OrderService.deleteOrderItem({ orderId: currentOrder.value.orderId, orderItemSeqId: selectedItem.orderItemSeqId });
    if (!hasError(resp)) {
      currentOrder.value.items = currentOrder.value.items?.filter((i: any) => i.orderItemSeqId !== selectedItem.orderItemSeqId);
      await useTransferOrderStore().updateCurrentTransferOrder(currentOrder.value);
      emitter.emit("clearSearchedProduct");
      showToast(translate("Item removed from order"));
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
    showToast(translate("Failed to remove item from order"));
  }
};
</script>

<style scoped>
ion-thumbnail {
  cursor: pointer;
}

.border-top {
  border-top: 1px solid #ccc;
}

.action {
  display: grid;
  grid: "progressbar ordered qoh"
        "pick     history" 
        / 1fr max-content; 
  gap: var(--spacer-xs);
  padding: var(--spacer-xs);
  align-items: center;
}
.pick-all-qty {
  grid-area: pick;
}

.qty-progress {
  grid-area: progressbar;
}

.to-item-history {
  grid-area: history;
  justify-self: center;
}

.qty-ordered {
  grid-area: ordered;
  text-align: end;
  font-size: 16px;
}

.qty-qoh {
  grid-area: qoh;
  text-align: end;
  font-size: 16px;
}

.scanned-item {
  outline: 2px solid var(--ion-color-medium-tint);
}
@media (min-width: 720px) {
  .action {
    grid: "pick progressbar history ordered qoh" /  max-content 1fr max-content max-content;
    padding-left: var(--spacer-sm);
  }
}
</style>
