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

<script>
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonThumbnail,
  IonToolbar,
  modalController } from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters } from 'vuex';
import { closeOutline, pricetag } from "ionicons/icons";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
  

export default defineComponent({
  name: "RejectedItemsModal",
  components: { 
      DxpShopifyImg,
      IonButtons,
      IonButton,
      IonContent,
      IonHeader,
      IonIcon,
      IonItem,
      IonLabel,
      IonList,
      IonNote,
      IonTitle,
      IonThumbnail,
      IonToolbar
  },
  computed: {
    ...mapGetters({
      rejectedItems: 'rejection/getRejectedItems',
      getProduct: 'product/getProduct'
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      closeOutline,
      pricetag,
      productIdentificationPref,
      productIdentificationStore,
      getProductIdentificationValue,
      translate
    };
  },
});
</script>
