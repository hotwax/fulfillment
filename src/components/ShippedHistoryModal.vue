<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("History") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-for="(item, index) in items" :key="index">
        <ion-item>
          <ion-thumbnail slot="start">
            <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            {{ item.changeByUserLoginId }}
            <p>{{ translate("Shipment ID") }}: {{ item.shipmentId }}</p>
          </ion-label>
          <ion-label>
            <ion-note>{{ item.quantity }} {{ translate("shipped") }}</ion-note>
            <ion-note>{{ item.statusDate ? getTime(item.statusDate) : "-" }}</ion-note>
          </ion-label>
        </ion-item>
      </ion-list>
  
      <!-- Empty state -->
      <div class="empty-state" v-if="!items.length">
        <p v-html="emptyStateMessage"></p>
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
    IonNote,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    modalController,
  } from '@ionic/vue';
  import { defineComponent } from 'vue';
  import { closeOutline } from 'ionicons/icons';
  import { DxpShopifyImg, translate } from '@hotwax/dxp-components';
  import { mapGetters, useStore } from "vuex";
  import { DateTime } from 'luxon';
  
  export default defineComponent({
    name: "ShippedHistoryModal",
    components: {
      DxpShopifyImg,
      IonButton,
      IonButtons,
      IonContent,
      IonHeader,
      IonIcon,
      IonItem,
      IonLabel,
      IonList,
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
        if (shipment.shipmentStatusId === 'SHIPMENT_SHIPPED') {
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
        store,
        translate
      };
    },
  });
  </script>
  
  <style scoped>
  ion-note {
    display: block;
    text-align: end;
  }
  </style>