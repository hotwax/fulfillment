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
        <ion-item v-for="message, index in gatewayMessages" :key="index">
          <ion-label>{{ message }}</ion-label>
        </ion-item>
      </ion-list>
    </div>
  </ion-content>
</template>

<script>
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  modalController,
  IonCard
} from "@ionic/vue";
import { defineComponent } from "vue";
import { addCircleOutline, closeOutline, pricetag } from "ionicons/icons";
export default defineComponent({
  name: "ShippingLabelErrorModal",
  components: { 

    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    // IonCard
  },
  props: ['gatewayMessages'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  mounted(){
    console.log(this.response);
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
  /* border-bottom: var(--border-medium); */
  padding: var(--ion-item-like-padding);
  align-items: center;
}
</style>