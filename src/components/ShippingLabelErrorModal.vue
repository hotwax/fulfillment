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
        <ion-button @click="copyToClipboard(shipmentLabelErrorMessages[0], 'Copied to clipboard')"> 
          <ion-icon slot="icon-only" :icon="copyOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list lines="none">
      <ion-item v-for="message, index in shipmentLabelErrorMessages" :key="index">
        <ion-label class="ion-text-wrap">{{ message }}</ion-label>
      </ion-item>
      <ion-item v-if="!shipmentLabelErrorMessages.length">
        {{ translate("No shipping label error received from carrier") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  modalController,
  IonButton,
  IonButtons,
  IonLabel,
  IonItem,
  IonList
} from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline, copyOutline } from "ionicons/icons";
import { OrderService } from "@/services/OrderService";
import { translate } from "@hotwax/dxp-components";
import { copyToClipboard } from "@/utils";

export default defineComponent({
  name: "ShippingLabelErrorModal",
  components: { 
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonLabel,
    IonItem,
    IonList
  },
  data() {
    return {
      shipmentLabelErrorMessages: []
    }
  },
  props: ['shipmentId'],
  async mounted() {
    // Fetching shipment label errors
    this.shipmentLabelErrorMessages = await OrderService.fetchShipmentLabelError(this.shipmentId);
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    return {
      closeOutline,
      copyOutline,
      copyToClipboard,
      translate
    };
  },
});
</script>

<style scoped>
.box-type {
  display: flex;
  gap: var(--spacer-sm);
  padding: var(--ion-item-like-padding);
  align-items: center;
}
</style>
