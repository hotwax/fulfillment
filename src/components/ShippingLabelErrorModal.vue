<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Shipping label error") }}</ion-title>
      <ion-buttons slot="end">
        <!-- Copying first message, assuming only one message will be received -->
        <ion-button @click="commonUtil.copyToClipboard(shipmentLabelErrorMessage, 'Copied to clipboard')"> 
          <ion-icon slot="icon-only" :icon="copyOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list lines="none">
      <ion-item v-if="shipmentLabelErrorMessage">
        <ion-label class="ion-text-wrap">{{ shipmentLabelErrorMessage }}</ion-label>
      </ion-item>
      <ion-item v-else>
        {{ translate("No shipping label error received from carrier") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, modalController, IonButton, IonButtons, IonLabel, IonItem, IonList } from "@ionic/vue";
import { defineProps, onMounted, ref } from "vue";
import { closeOutline, copyOutline } from "ionicons/icons";
import { OrderService } from "@/services/OrderService";
import { translate } from "@hotwax/dxp-components";
import { commonUtil } from "@/utils/commonUtil";

const props = defineProps(["shipmentId"]);

const shipmentLabelErrorMessage = ref("");

onMounted(async () => {
  shipmentLabelErrorMessage.value = await OrderService.fetchShipmentLabelError(props.shipmentId);
});

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};
</script>

<style scoped>
.box-type {
  display: flex;
  gap: var(--spacer-sm);
  padding: var(--ion-item-like-padding);
  align-items: center;
}
</style>
