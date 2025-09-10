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
            <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
              <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
            </ion-thumbnail>
            <ion-label>
              <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
              <div>
                {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
                <ion-badge class="kit-badge" color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
              </div>
              <p>{{ getFeatures(getProduct(item.productId).productFeatures)}}</p>
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
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore, useAuthStore, openPosScanner } from '@hotwax/dxp-components';
import { mapGetters } from 'vuex';
import { getFeatures, showToast, hasWebcamAccess } from "@/utils"
import Scanner from "@/components/Scanner.vue"
import { isKit } from '@/utils/order'

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
      barcodeIdentifier: 'util/getBarcodeIdentificationPref'
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
    const orderItems = this.order.items.length ? JSON.parse(JSON.stringify(this.order.items)) : []
    this.orderItems = orderItems ? orderItems.filter((item: any) => !item.rejectReason) : []
  },
  methods: {
    closeModal(payload= {}) {
      modalController.dismiss({ dismissed: true, ...payload });
    },
    async scan() {
      if (useAuthStore().isEmbedded) {
        const scanData = await openPosScanner();
        if(scanData) {
          this.updateProductScannedStatus(scanData);
        } else {
          showToast(translate("No data received from scanner"));
        }
        return;
      }
      if (!(await hasWebcamAccess())) {
        showToast(translate("Camera access not allowed, please check permissons."));
        return;
      } 
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
        const itemVal = getProductIdentificationValue(this.barcodeIdentifier, this.getProduct(orderItem.productId)) ? getProductIdentificationValue(this.barcodeIdentifier, this.getProduct(orderItem.productId)) : this.getProduct(orderItem.productId)?.internalName
        if(itemVal === payload) currentItem = orderItem;
        return itemVal === payload && !orderItem.isChecked;
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
        showToast(translate((currentItem.productId ? "Product is already scanned:" : "Scanned item is not present within the shipment:"), { itemName: payload }))
      }
      this.queryString = ''
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
      getFeatures,
      getProductIdentificationValue,
      isKit,
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

.list-item:hover {
  cursor: default;
}

ion-label {
  width: 100%;
}

.scanned-item {
  outline: 2px solid var( --ion-color-medium-tint);
}
</style>