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

<script setup lang="ts">
import { IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonThumbnail, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { computed, defineProps, onMounted, ref } from "vue";
import { cameraOutline, closeOutline, saveOutline } from "ionicons/icons";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { getFeatures, showToast, hasWebcamAccess } from "@/utils";
import Scanner from "@/components/Scanner.vue";
import { isKit } from "@/utils/order";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";

const props = defineProps(["order"]);
const orderItems = ref([] as any[]);
const queryString = ref("");
const lastScannedId = ref("");

const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);
const barcodeIdentifier = computed(() => useUtilStore().getBarcodeIdentificationPref);
const getProduct = (productId: string) => useProductStore().getProduct(productId);

onMounted(() => {
  const items = props.order.items.length ? JSON.parse(JSON.stringify(props.order.items)) : [];
  orderItems.value = items ? items.filter((item: any) => !item.rejectReason) : [];
});

const closeModal = (payload = {}) => {
  modalController.dismiss({ dismissed: true, ...payload });
};

const scan = async () => {
  if (!(await hasWebcamAccess())) {
    showToast(translate("Camera access not allowed, please check permissons."));
    return;
  }
  const modal = await modalController.create({ component: Scanner });
  modal.onDidDismiss().then((result) => {
    if (result.role) {
      updateProductScannedStatus(result.role);
    }
  });
  modal.present();
};

const updateProductScannedStatus = async (payload?: any) => {
  if (!payload) payload = queryString.value;

  let currentItem = {} as any;
  const item = orderItems.value.find((orderItem: any) => {
    const itemVal = getProductIdentificationValue(barcodeIdentifier.value, getProduct(orderItem.productId)) ? getProductIdentificationValue(barcodeIdentifier.value, getProduct(orderItem.productId)) : getProduct(orderItem.productId)?.internalName;
    if (itemVal === payload) currentItem = orderItem;
    return itemVal === payload && !orderItem.isChecked;
  });

  if (item) {
    item.isChecked = true;
    showToast(translate("Scanned successfully.", { itemName: payload }));

    lastScannedId.value = item.orderItemSeqId;
    const scannedElement = document.getElementById(item.orderItemSeqId);
    scannedElement && scannedElement.scrollIntoView();

    setTimeout(() => {
      lastScannedId.value = "";
    }, 3000);
  } else {
    showToast(translate((currentItem.productId ? "Product is already scanned:" : "Scanned item is not present within the shipment:"), { itemName: payload }));
  }
  queryString.value = "";
};

const areAllItemsSelected = () => {
  return !orderItems.value.some((item: any) => !item.isChecked);
};

const packOrder = () => {
  closeModal({ packOrder: true });
};
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
