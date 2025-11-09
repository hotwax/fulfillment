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
    <ion-searchbar data-testid="viewmore-search-products-input" :value="queryString" :placeholder="translate('Search products')" @keyup.enter="queryString = $event.target.value; getProducts()"/>
    <!-- Product list -->
    <template v-if="products.length">
      <ion-item v-for="product in products" :key="product.productId">
        <ion-avatar slot="start">
          <DxpShopifyImg :src="product.mainImageUrl" />
        </ion-avatar>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, product) ? getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, product) : product?.internalName }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, product) }}</p>
        </ion-label>

        <!-- Show Add button if product is NOT in order -->
        <ion-button data-testid="viewmore-add-to-transfer-btn" v-if="!isProductInOrder(product.productId)" slot="end" fill="outline" @click="addTransferOrderItem(product)" :disabled="pendingProductIds.has(product.productId)">
          {{ pendingProductIds.has(product.productId) ? translate("Adding...") : translate("Add to Transfer") }}
        </ion-button>

        <!-- Display checkmark only when product is actually in order -->
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
import { computed, defineProps, onMounted, ref, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { modalController } from '@ionic/vue';
import { ProductService } from '@/services/ProductService';
import { hasError } from '@/utils';
import { DxpShopifyImg, getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { useProductQueue } from '@/composables/useProductQueue';
import logger from '@/logger';
import emitter from '@/event-bus';

const props = defineProps(["query"])

const store = useStore()
const productIdentificationStore = useProductIdentificationStore();

const queryString = ref(props.query)
const products = ref([]) as any;
const total = ref(0) as any;
const isLoading = ref(false)

const currentOrder = computed(() => store.getters['transferorder/getCurrent'])

// Use the composable
const { addProductToQueue, clearQueue, pendingProductIds, isProductInOrder } = useProductQueue();

onMounted(() => {
  if(queryString.value) {
    getProducts()
  }
})

onUnmounted(() => {
  clearQueue();
})

function closeModal() {
  modalController.dismiss()
}

function addTransferOrderItem(product: any) {

  const itemToAdd = {
    product: product,
    orderId: currentOrder.value.orderId,
    facilityId: currentOrder.value.shipGroups?.[0]?.facilityId,
    scannedId: queryString.value,
    onSuccess: () => {
      emitter.emit('clearSearchedProduct');
    },
    onError: (product: any, error: any) => {
      logger.error(`Failed to add product ${product.productId}:`, error);
    }
  }
  
  addProductToQueue(itemToAdd);
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