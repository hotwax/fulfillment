<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Close transfer order items") }}</ion-title>
      <ion-buttons slot="end" @click="selectAllItems">
        <ion-button color="primary">{{ translate("Select all") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("To close this transfer order, select all items.") }}</ion-list-header>
      <ion-item button v-for="(item, index) in order.items.filter((item: any) => item.statusId === 'ITEM_PENDING_FULFILL')" :key="index" @click="item.isChecked = !item.isChecked">
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
          <p>
            <ion-text> {{ translate('Fulfilled qty') }}: {{ Number(item.totalIssuedQuantity) }} </ion-text> | <ion-text color="danger"> {{ translate('Cancel qty') }}: {{ Number(item.orderedQuantity) - Number(item.totalIssuedQuantity) }} </ion-text>
          </p>
        </ion-label>
        <ion-checkbox aria-label="itemStatus" slot="end" :modelValue="item.isChecked" />
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || !isEligibleToCloseTOItems()" @click="confirmSave">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonTitle, IonToolbar, IonThumbnail, alertController, modalController } from "@ionic/vue";
import { Actions, hasPermission } from "@/authorization";
import { arrowBackOutline, saveOutline } from "ionicons/icons";
import { computed } from "vue";
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import { useRouter } from "vue-router";
import { TransferOrderService } from "@/services/TransferOrderService";
import { getFeatures, showToast } from "@/utils";
import { useTransferOrderStore } from "@/store/transferorder";
import { useProductStore } from "@/store/product";

const router = useRouter();
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);
const order = computed(() => useTransferOrderStore().getCurrent);
const getProduct = (productId: string) => useProductStore().getProduct(productId);

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const closeOrderItems = async () => {
  const eligibleItems = order.value.items.filter((item: any) => item.isChecked);
  if (!eligibleItems.length) return false;

  const payload = {
    orderId: order.value.orderId,
    items: eligibleItems.map((item: any) => ({ orderItemSeqId: item.orderItemSeqId }))
  };
  try {
    await TransferOrderService.closeOrderItems(payload);
    return true;
  } catch (error) {
    showToast(translate("Failed to update the status of transfer order items."));
    return false;
  }
};

const confirmSave = async () => {
  const alert = await alertController.create({
    header: translate("Close transfer order items"),
    message: translate("The selected items won't be available for receiving later."),
    buttons: [
      { text: translate("Cancel"), role: "cancel" },
      {
        text: translate("Proceed"),
        role: "proceed",
        handler: async () => {
          const success = await closeOrderItems();
          if (success) {
            modalController.dismiss();
            router.push("/transfer-orders");
          }
        }
      }
    ]
  });
  return alert.present();
};

const isEligibleToCloseTOItems = () => {
  return order.value.items.some((item: any) => item.isChecked);
};

const selectAllItems = () => {
  order.value.items.map((item: any) => {
    item.isChecked = true;
  });
};
</script>
