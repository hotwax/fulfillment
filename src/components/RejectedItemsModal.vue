<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Rejected items") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list v-if="rejectedItems.length">
      <ion-item v-for="(item, index) in rejectedItems" :key="item.val" :lines="rejectedItems.length -1 === index ? 'none' : 'inset'">
        <ion-thumbnail slot="start" v-image-preview="getProduct(item.val)" :key="getProduct(item.val)?.mainImageUrl">
          <DxpShopifyImg :src="getProduct(item.val).mainImageUrl" size="small"/>
        </ion-thumbnail>
        <ion-label>
          <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.val)) }}</p>
          {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.val)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.val)) : item.val }}
        </ion-label>
        <ion-note slot="end">{{ item.count }}</ion-note>
      </ion-item>
    </ion-list>
    <div class="empty-state" v-else>
      <p>{{ translate("No data found") }}</p>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonTitle, IonThumbnail, IonToolbar, modalController } from "@ionic/vue";
import { computed } from "vue";
import { useRejectionStore } from "@/store/rejection";
import { useProductStore } from "@/store/product";
import { closeOutline } from "ionicons/icons";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
const rejectedItems = computed(() => useRejectionStore().getRejectedItems);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};
</script>
