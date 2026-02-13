<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Gift card activation") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="isLoading" class="empty-state">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Fetching gift card info.") }}</ion-label>
    </div>
    <ion-list v-else>
      <ion-item lines="none" v-if="!item.isGCActivated">
        <ion-input :label="translate('Activation code')" :placeholder="translate('serial number')" :helper-text="translate('Scan or enter the unique code on the gift card')" v-model="activationCode" />
      </ion-item>

      <ion-item v-else>
        <ion-icon :icon="cardOutline" slot="start" />
        <ion-label>{{ item.gcInfo.cardNumber }}</ion-label>
        <ion-note slot="end">{{ getCreatedDateTime() }}</ion-note>
      </ion-item>

      <ion-item lines="none">
        <ion-icon :icon="giftOutline" slot="start" />
        <ion-label>
          {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
        </ion-label>
        <ion-label slot="end">{{ formatCurrency(itemPriceInfo.unitPrice, itemPriceInfo.currencyUom) }}</ion-label>
      </ion-item>

      <div class="ion-margin" v-if="!item.isGCActivated">
        <ion-button expand="block" fill="outline" @click="isCameraEnabled ? stopScan() : scan()">
          <ion-icon slot="start" :icon="isCameraEnabled ? stopOutline : cameraOutline" />
          {{ translate(isCameraEnabled ? "Stop" : "Scan") }}
        </ion-button>
        <StreamBarcodeReader class="scanning-preview"
          v-if="isCameraEnabled"
          @decode="onDecode"
        />
      </div>
    </ion-list>
  </ion-content>

  <ion-fab v-if="!item.isGCActivated" vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="confirmSave()">
      <ion-icon :icon="cardOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonSpinner, IonTitle, IonToolbar, alertController, modalController } from "@ionic/vue";
import { computed, defineProps, onMounted, ref } from "vue";
import { cameraOutline, cardOutline, closeOutline, giftOutline, stopOutline } from "ionicons/icons";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { OrderService } from "@/services/OrderService";
import { formatCurrency, hasError, showToast, hasWebcamAccess } from "@/utils";
import logger from "@/logger";
import { DateTime } from "luxon";
import { StreamBarcodeReader } from "vue-barcode-reader";
import { useProductStore } from "@/store/product";

const props = defineProps(["item"]);
const isLoading = ref(false);
const itemPriceInfo = ref({} as any);
const activationCode = ref("");
const isCameraEnabled = ref(false);

const getProduct = (productId: string) => useProductStore().getProduct(productId);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

onMounted(async () => {
  isLoading.value = true;
  itemPriceInfo.value = await OrderService.fetchGiftCardItemPriceInfo({ orderId: props.item.orderId, orderItemSeqId: props.item.orderItemSeqId });
  isLoading.value = false;
});

const closeModal = (payload = {}) => {
  modalController.dismiss({ dismissed: true, ...payload });
};

const activateGitCard = async () => {
  try {
    const resp = await OrderService.activateGiftCard({
      orderId: props.item.orderId,
      orderItemSeqId: props.item.orderItemSeqId,
      amount: itemPriceInfo.value.unitPrice,
      typeEnumId: "GC_ACTIVATE",
      cardNumber: activationCode.value.trim(),
      partyId: props.item.customerId
    });

    if (!hasError(resp)) {
      showToast(translate("Gift card activated successfully."));
      closeModal({ isGCActivated: true, item: props.item });
    } else {
      throw resp.data;
    }
  } catch (error: any) {
    showToast(translate("Failed to activate gift card."));
    logger.error(error);
  }
};

const confirmSave = async () => {
  if (!activationCode.value.trim()) {
    showToast(translate("Please enter a activation code."));
    return;
  }

  const alert = await alertController.create({
    header: translate("Activate gift card"),
    message: translate("This gift card code will be activated. The customer may also receive a notification about this activation. Please verify all information is entered correctly. This cannot be edited after activation.", { space: "<br /><br />" }),
    buttons: [
      { text: translate("Cancel") },
      {
        text: translate("Activate"),
        handler: async () => {
          await activateGitCard();
        }
      }
    ]
  });
  return alert.present();
};

const getCreatedDateTime = () => {
  return DateTime.fromMillis(props.item.gcInfo.fulfillmentDate).toFormat("dd MMMM yyyy hh:mm a ZZZZ");
};

const scan = async () => {
  if (!(await hasWebcamAccess())) {
    showToast(translate("Camera access not allowed, please check permissons."));
    return;
  }
  isCameraEnabled.value = true;
};

const stopScan = () => {
  isCameraEnabled.value = false;
};

const onDecode = (result: any) => {
  if (result) activationCode.value = result;
  isCameraEnabled.value = false;
};
</script>

<style scoped>
.scanning-preview {
  justify-self: center;
  max-width: 360px;
}


</style>
