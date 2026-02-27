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
          <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
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
  
  <script setup lang="ts">
import { defineProps } from "vue";
  import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonThumbnail, IonTitle, IonToolbar, modalController } from "@ionic/vue";
  import { computed, onMounted, ref } from "vue";
  import { closeOutline } from "ionicons/icons";
  import { DxpShopifyImg, translate } from "@hotwax/dxp-components";
  import { DateTime } from "luxon";
  import { useTransferOrderStore } from "@/store/transferorder";
  import { useProductStore } from "@/store/product";
  
  const props = defineProps(["productId"]);
  const items = ref([] as any[]);
  const emptyStateMessage = translate("No shipments have been shipped yet");
  
  const currentOrder = computed(() => useTransferOrderStore().getCurrent);
  const getProduct = (productId: string) => useProductStore().getProduct(productId);
  
  onMounted(() => {
    const shippedHistory = [] as any[];
    currentOrder.value.shipments.forEach((shipment: any) => {
      if (shipment.shipmentStatusId === "SHIPMENT_SHIPPED") {
        shipment.items.forEach((item: any) => {
          if (item.productId === props.productId) {
            shippedHistory.push({ ...shipment, ...item });
          }
        });
      }
    });
    items.value = shippedHistory;
  });
  
  const closeModal = () => {
    modalController.dismiss({ dismissed: true });
  };
  
  const getTime = (time: any) => {
    return DateTime.fromMillis(time).toFormat("H:mm a dd/MM/yyyy");
  };
  </script>
  
  <style scoped>
  ion-note {
    display: block;
    text-align: end;
  }
  </style>
