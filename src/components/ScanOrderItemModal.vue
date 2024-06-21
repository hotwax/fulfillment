<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Scan order items") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <main>
      <div class="scanner">
        <ion-item>
          <ion-input :label="translate('Scan items')" label-placement="fixed" autofocus :placeholder="translate('Scan barcodes to receive them')" v-model="queryString" @keyup.enter="updateProductScannedStatus()" />
        </ion-item>
        <ion-button expand="block" fill="outline" @click="scan()">
          <ion-icon slot="start" :icon="cameraOutline" />
          {{ translate("Scan") }}
        </ion-button>
      </div>

      <div class="list-item" v-for="(item, index) in orderItems" :key="index" :class="item.orderItemSeqId === lastScannedId ? 'scanned-item' : '' " :id="item.productSku">
        <div class="product-info">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
            </ion-thumbnail>
            <ion-label>
              <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
              {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
              <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
            </ion-label>
          </ion-item>
        </div>
        
        <ion-item lines="none">
          <ion-checkbox disabled :checked="item.isChecked" />
        </ion-item>
      </div>
    </main>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!areAllItemsSelected()" @click="packOrder()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import { 
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { cameraOutline, closeOutline, copyOutline, saveOutline } from "ionicons/icons";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { mapGetters } from 'vuex';
import { getFeature, showToast } from "@/utils"
import Scanner from "@/components/Scanner.vue"

export default defineComponent({
  name: "ScanOrderItemModal",
  components: { 
    DxpShopifyImg,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
    }),
  },
  data() {
    return {
      orderItems: [] as any,
      queryString: "",
      lastScannedId: ""
    }
  },
  props: ["order"],
  mounted() {
    this.orderItems = this.order.orderItems.length ? JSON.parse(JSON.stringify(this.order.orderItems)) : []
  },
  methods: {
    closeModal(payload= {}) {
      modalController.dismiss({ dismissed: true, ...payload });
    },
    async scan() {
      const modal = await modalController.create({
        component: Scanner,
      });

      modal.onDidDismiss().then((result) => {
        if (result.role) {
          this.updateProductScannedStatus(result.role);
        }
      })

      modal.present();
    },
    async updateProductScannedStatus(payload?: any) {
      if(!payload) payload = this.queryString

      let currentItem = {} as any;
      const item = this.orderItems.find((orderItem: any) => {
        if(orderItem.productSku === payload) currentItem = orderItem
        return orderItem.productSku === payload && !orderItem.isChecked;
      });

      if(item) {
        item.isChecked = true;
        showToast(translate("Scanned successfully.", { itemName: payload }))

        this.lastScannedId = item.orderItemSeqId
        // Highlight specific element
        const scannedElement = document.getElementById(item.orderItemSeqId);
        scannedElement && (scannedElement.scrollIntoView());

        // Scanned product should get un-highlighted after 3s for better experience hence adding setTimeOut
        setTimeout(() => {
          this.lastScannedId = ''
        }, 3000)
      } else {
        showToast(translate((currentItem.productSku ? "Product is already received:" : "Scanned item is not present within the shipment:"), { itemName: payload }))
      }
    },
    areAllItemsSelected() {
      return !this.orderItems.some((item: any) => !item.isChecked)
    },
    packOrder() {
      this.closeModal({ packOrder: true })
    },
  },
  setup() {
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      cameraOutline,
      closeOutline,
      copyOutline,
      getFeature,
      getProductIdentificationValue,
      productIdentificationPref,
      saveOutline,
      translate
    };
  },
});
</script>

<style scoped>
.list-item {
  --columns-desktop: 2;
}

ion-label {
  width: 100%;
}

.scanned-item {
  outline: 2px solid var( --ion-color-medium-tint);
}
</style>