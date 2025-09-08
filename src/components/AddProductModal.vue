<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add a product") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar :value="queryString" :placeholder="translate('Search SKU or product name')" @keyup.enter="queryString = $event.target.value; getProducts()"/>
    <!-- Product list -->
    <ion-list>
      <ion-item v-for="product in products" :key="product.productId">
        <ion-avatar slot="start">
          <DxpShopifyImg :src="product.mainImageUrl" />
        </ion-avatar>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, product) }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, product) }}</p>
        </ion-label>

        <!-- Show Add button if not in currentOrder -->
        <template v-if="!isItemAlreadyInOrder(product.productId)">
          <ion-button slot="end" fill="outline" @click="commitProductToOrder(product)">
            {{ translate("Add to Transfer") }}
          </ion-button>
        </template>
        <template v-else>
          <ion-icon slot="end" :icon="checkmarkCircle" color="success" />
        </template>
      </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div class="empty-state" v-if="!isLoading && products.length === 0 && queryString">
      <ion-text>{{ translate("No products found") }}</ion-text>
    </div>

    <!-- Loading spinner -->
    <div v-if="isLoading" class="empty-state">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Loading...") }}</ion-label>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent, IonSearchbar, IonList, IonItem, IonAvatar, IonLabel, IonText, IonSpinner } from '@ionic/vue';
import { checkmarkCircle, closeOutline } from "ionicons/icons";
import { computed, defineProps, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { modalController } from '@ionic/vue';
import { ProductService } from '@/services/ProductService';
import { OrderService } from '@/services/OrderService';
import { StockService } from '@/services/StockService';
import { hasError, showToast } from '@/utils';
import { DxpShopifyImg, getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import logger from '@/logger';

const props = defineProps(["query"])

const store = useStore()
const productIdentificationStore = useProductIdentificationStore();

const queryString = ref(props.query)
const products = ref([]) as any;
const isLoading = ref(false)

const currentOrder = computed(() => store.getters['transferorder/getCurrent'])

onMounted(() => {
  if(queryString.value) {
    getProducts()
  }
})

function closeModal() {
  modalController.dismiss()
}

// check if product already exists in currentOrder
function isItemAlreadyInOrder(productId: string) {
  return currentOrder.value?.items?.some((item: any) => item.productId === productId)
}

// Stock fetch helper
async function fetchStock(productId: string) {
  try {
    const resp: any = await StockService.getInventoryAvailableByFacility({
      productId,
      facilityId: currentOrder.value.orderFacilityId
    });
    if(!hasError(resp)) return resp.data;
  } catch (err) {
    logger.error(err);
  }
  return null;
}

// Add product to order
async function commitProductToOrder(product: any, scannedId?: string) {
  if (!product?.productId) return

  const newItem: any = {
    productId: product.productId,
    sku: product.sku,
    quantity: 1,
    pickedQuantity: 1,
    shipGroupSeqId: "00001",
    scannedId: queryString.value
  }

  // fetch stock
  const stock = product.productId ? await fetchStock(product.productId) : null
  if (stock) {
    newItem.qoh = stock.qoh ?? 0
    newItem.atp = stock.atp ?? 0
  }

  try {
    const resp = await addProductToOrderApi(product, newItem)
    if (!hasError(resp)) {
      newItem.orderId = currentOrder.value.orderId
      newItem.orderItemSeqId = resp.data?.orderItemSeqId

      currentOrder.value.items.push(newItem)
      await store.dispatch('transferorder/updateCurrentTransferOrder', currentOrder.value)
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error(err)
    showToast(translate("Failed to add product to order"))
  }
  queryString.value = ''
}

async function addProductToOrderApi(product: any, newItem: any) {
  const payload = {
    statusId: "ITEM_CREATED",
    orderId: currentOrder.value.orderId,
    productId: product.productId,
    quantity: newItem.quantity,
    shipGroupSeqId: newItem.shipGroupSeqId,
    unitListPrice: product.LIST_PRICE_PURCHASE_USD_STORE_GROUP_price,
    unitPrice: product.LIST_PRICE_PURCHASE_USD_STORE_GROUP_price,
  }
  return await OrderService.addProductToOrder(payload)
}

// product search
async function getProducts() {
  let productsList = [] as any;
  isLoading.value = true
  try {
    const resp = await ProductService.fetchProducts({
      "keyword": queryString.value.trim(),
      "viewSize": 100,
      "filters": ['isVirtual: false', 'isVariant: true'],
    })
    if(!hasError(resp)) {
      productsList = resp.data.response.docs;
    } else {
      throw resp.data;
    }
  } catch(err) {
    logger.error("Failed to fetch products", err)
  }
  products.value = productsList
  isLoading.value = false;
}
</script>