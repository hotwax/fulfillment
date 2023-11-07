<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button :default-href="'/transfer-shipments'" slot="start" />
        <ion-title>{{ translate("Shipment details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ShipmentDetails />     
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { add, checkmarkDone, barcodeOutline } from 'ionicons/icons';
import { useStore } from "vuex";
import { translate } from '@hotwax/dxp-components';
import { copyToClipboard, formatUtcDate } from '@/utils'
import { Actions, hasPermission } from '@/authorization'
import ShipmentDetails from '@/components/ShipmentDetails.vue';


export default defineComponent({
  name: "TransferShipmentDetails",
  components: {
    IonBackButton,
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    ShipmentDetails
  },
  data() {
    return {
      queryString: ''
    }
  },
  mounted() {
    this.store.dispatch('transferShipments/setCurrentShipment', { jobId: this.$route.params.jobId })
  }, 
  setup() {
    const store = useStore();

    return {
      Actions,
      add,
      barcodeOutline,
      checkmarkDone,
      hasPermission,
      copyToClipboard,
      formatUtcDate,
      store,
      translate
    };
  },
});
</script>
