<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="viewmore-close-modal" @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add a product") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar data-testid="viewmore-search-products-input" :value="queryString" :placeholder="translate('Search SKU or product name')" @keyup.enter="queryString = $event.target.value; getProducts()"/>
    <!-- Product list -->
    <template v-if="products.length">
      <ion-item v-for="product in products" :key="product.productId">
        <ion-avatar slot="start">
          <DxpShopifyImg :src="product.mainImageUrl" />
        </ion-avatar>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, product) }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, product) }}</p>
        </ion-label>

        <!-- Show Add button if not in currentOrder -->
        <ion-button data-testid="viewmore-add-to-transfer-btn" v-if="!isItemAlreadyInOrder(product.productId)" slot="end" fill="outline" @click="addTransferOrderItem(product)">
          {{ translate("Add to Transfer") }}
        </ion-button>

        <!-- Display a checkmark icon if the product is already added, otherwise display nothing. -->
        <ion-icon v-else slot="end" :icon="checkmarkCircle" color="success" />
      </ion-item>

      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable()">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </template>

    <!-- Empty state -->
    <div class="empty-state" v-else-if="!isLoading && queryString">
      <ion-text>{{ translate("No products found") }}</ion-text>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonSearchbar, IonText, IonTitle, IonToolbar } from '@ionic/vue';
import { checkmarkCircle, closeOutline } from "ionicons/icons";
import { computed, defineProps, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { TransferOrderService } from '@/services/TransferOrderService';
import { modalController } from '@ionic/vue';
import { ProductService } from '@/services/ProductService';
import { StockService } from '@/services/StockService';
import { hasError, showToast } from '@/utils';
import { DxpShopifyImg, getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import logger from '@/logger';

const props = defineProps(["query"])

const store = useStore()
const productIdentificationStore = useProductIdentificationStore();

const queryString = ref(props.query)
const products = ref([]) as any;
const total = ref(0) as any;
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

/**
 * Adds a product to the current transfer order.
 * - Builds order item object
 * - Calls API to create order item
 * - Updates local currentOrder state
 */
async function addTransferOrderItem(product: any) {
  if (!product?.productId) return;

  // Build new order item object
  const newItem: any = {
    productId: product.productId,
    sku: product.sku,
    quantity: 1,
    pickedQuantity: 1,
    shipGroupSeqId: "00001",
    scannedId: queryString.value
  };

  // Fetch available stock
  const stock = product.productId ? await fetchStock(product.productId) : null;
  if (stock) newItem.qoh = stock.qoh ?? 0;

  try {
    // Fetch product's average cost before committing to order
    const unitPrice = await ProductService.fetchProductAverageCost(
      newItem.productId,
      currentOrder.value.orderFacilityId
    );

    // Prepare payload and call API to add order item
    const payload = {
      orderId: currentOrder.value.orderId,
      productId: newItem.productId,
      quantity: newItem.quantity,
      shipGroupSeqId: newItem.shipGroupSeqId,
      unitPrice: unitPrice || 0
    };
    const resp = await TransferOrderService.addOrderItem(payload);

    if (!hasError(resp)) {
      // Update local state with order item & refresh order in store
      newItem.orderId = currentOrder.value.orderId;
      newItem.orderItemSeqId = resp.data?.orderItemSeqId;

      currentOrder.value.items.push(newItem);
      await store.dispatch('transferorder/updateCurrentTransferOrder', currentOrder.value);
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
    showToast(translate("Failed to add product to order"));
  }
}

function isScrollable() {
  return products.value.length < total.value;
}

async function loadMoreProducts(event: any) {
  await getProducts(
    undefined,
    Math.ceil(products.value.length / Number(process.env.VUE_APP_VIEW_SIZE || 20)).toString()
  );
  event.target.complete();
}

// product search
async function getProducts(vSize?: any, vIndex?: any) {
  const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  isLoading.value = true;

  try {
    const resp = await ProductService.fetchProducts({
      keyword: queryString.value.trim(),
      viewSize, 
      viewIndex,
      filters: ['isVirtual: false', 'isVariant: true'],
    });

    if (!hasError(resp) && resp.data.response?.docs?.length) {
      const productsList = resp.data.response.docs;
      if(viewIndex) {
        products.value = products.value.concat(productsList); 
      } else {
        products.value = productsList;
        total.value = resp.data.response.numFound;
      }
    } else {
      products.value = viewIndex ? products.value : [];
    }
  } catch(err) {
    logger.error("Failed to fetch products", err)
  }
  isLoading.value = false;
}
</script>