<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Historical Manifests") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ translate("Manifests from the last seven days") }}
      </ion-list-header>
      <ion-item>
        <ion-label>
          {{ "3:19pm 12th december 2024" }}
        </ion-label>
        <ion-button>
          <ion-icon :icon="printOutline" slot="start"/>
          {{ translate("Print") }}
        </ion-button>
      </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div class="empty-state" v-if="!items.length">
      <p v-html="emptyStateMessage">{{ translate("No historical manifests found.") }}</p>
    </div>
  </ion-content>
</template>

<script>
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, printOutline } from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components';
import { mapGetters, useStore } from "vuex";
import { DateTime } from 'luxon';

export default defineComponent({
  name: "HistoricalManifestModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  },
  data() {
    return {
      items: [],
      emptyStateMessage: translate("No shipments have been shipped yet")
    }
  },
  props: ["productId"],
  mounted() {
    const shippedHistory = [];
    this.currentOrder.shipments.forEach(shipment => {
      if (shipment.statusId === 'SHIPMENT_SHIPPED') {
        shipment.items.forEach(item => {
          if (item.productId === this.productId) {
            shippedHistory.push({...shipment, ...item});
          }
        });
      }
    });
    this.items = shippedHistory;
  },
  computed: {
    ...mapGetters({
      currentOrder: 'transferorder/getCurrent',
      getProduct: 'product/getProduct'
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    getTime(time) {
      return DateTime.fromMillis(time).toFormat("H:mm a dd/MM/yyyy")
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      printOutline,
      store,
      translate
    };
  },
});
</script>
