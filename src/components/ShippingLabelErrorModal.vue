<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Shipping label error") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <div class="box-type">
      <ion-list lines="none">
        <ion-item v-for="message, index in shipmentLabelErrorMessages" :key="index">
          <ion-label>{{ message }}</ion-label>
        </ion-item>
        <div v-if="!shipmentLabelErrorMessages.length">{{ $t("No data Found.") }}</div>
      </ion-list>
    </div>
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
import { closeOutline } from "ionicons/icons";
import { OrderService } from "@/services/OrderService";
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
  props: ['shipmentIds'],
  async mounted() {
    // Fetching shipment label errors
    this.shipmentLabelErrorMessages = await OrderService.fetchShipmentLabelError(this.shipmentIds);
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    return {
      closeOutline
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