<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start"/>
        <ion-title>{{ translate("Create transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!--Transfer order cards -->
      <div class="transfer-order">
        <!-- order details -->
        <ion-card class="order-info">
          <ion-list lines="none">
            <ion-item>
              <ion-label>
                <p class="overline">{{ currentOrder.orderId }}</p>
                <h1>{{ currentOrder.orderName }}</h1>
              </ion-label>
              <ion-button slot="end" color="medium" fill="outline" @click="editOrderName">{{ translate("Edit") }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-icon :icon="storefrontOutline" slot="start"/>
              <!-- currently the facility name is coming in the api -->
              <ion-label>Store name</ion-label>
              <ion-button slot="end" color="medium" fill="outline" size="small">{{ translate("Edit") }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-icon :icon="checkmarkDoneOutline" slot="start"/>
              <ion-toggle :checked="currentOrder.statusFlowId === 'TO_Fulfill_Only'" @ionChange="toggleStatusFlow">
                {{ translate("Complete order on fulfillment") }}
              </ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card>

        <!-- adding product card -->
        <ion-card class="add-items">
          <div class="search-type ion-margin-start">
            <h4>{{ translate("Add items") }}</h4>
            <ion-segment v-model="mode" @ionChange="segmentChange($event.target.value)">
              <ion-segment-button value="scan" content-id="scan">
                <ion-icon :icon="barcodeOutline"/>
              </ion-segment-button>
              <ion-segment-button value="search" content-id="search">
                <ion-icon :icon="searchOutline"/>
              </ion-segment-button>
            </ion-segment>
          </div>
          <!-- Scanning -->
          <div v-show="mode === 'scan'">
            <!-- scanning input -->
            <ion-item lines="full">
              <ion-input ref="scanInput" :disabled="!isScanningEnabled" :value="queryString" :label="translate('Scan barcode')" :placeholder="barcodeIdentifier" @keyup.enter="queryString = $event.target.value; scanProduct()" />
            </ion-item>
            <!-- product found after scan (reads from searchedProduct) -->
            <ion-item lines="none" v-if="searchedProduct.productId">
              <ion-thumbnail>
                <DxpShopifyImg :src="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" />
              </ion-thumbnail>
              <ion-label>
                {{ getProductIdentificationValue(barcodeIdentifier, getProduct(searchedProduct.productId)) }}
                <p>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) }}</p>
                <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
              </ion-label>
              <ion-icon :icon="checkmarkDoneOutline" color="success" slot="end"/>
            </ion-item>
            
            <!-- scanned no match -->
            <ion-item lines="none" v-else-if="searchedProduct.scannedId && !searchedProduct.productId">
              <ion-icon :icon="cloudOfflineOutline" slot="start"/>
              <ion-label>
                {{ searchedProduct.scannedId }} {{ translate("not found") }}
                <p>{{ translate("Try searching using a keyword instead") }}</p>
              </ion-label>
              <!-- need to add match product button -->
              <ion-button size="small" slot="end" color="primary">
                <ion-icon slot="start" :icon="searchOutline"/>
                {{ translate("Search") }}
              </ion-button>
            </ion-item>

            <!-- scanner not focused -->
            <ion-item lines="none" v-else-if="!isScanningEnabled">
              <ion-thumbnail>
                <DxpShopifyImg/>
              </ion-thumbnail>
              <ion-label>
                {{ translate("Your scanner isn’t focused yet.") }}
                <p>{{ translate("Scanning is set to") }} {{ (barcodeIdentifier || '').toUpperCase() }}</p>
                <p>{{ translate("Swap to SKU from the settings page") }}</p>
              </ion-label>
              <ion-button slot="end" color="warning" size="small" @click="enableScan">
                <ion-icon slot="start" :icon="locateOutline"/>
                {{ translate("Focus scanning") }}
              </ion-button>
            </ion-item>

            <!-- default / idle state -->
            <ion-item lines="none" v-else>
              <ion-thumbnail>
                <DxpShopifyImg/>
              </ion-thumbnail>
              <ion-label>
                {{ translate("Begin scanning products to add them to this transfer") }}
                <p>{{ translate("Scanning is set to") }} {{ (barcodeIdentifier || '').toUpperCase() }}</p>
                <p>{{ translate("Swap to SKU from the settings page") }}</p>
              </ion-label>
              <ion-badge slot="end" color="success">start scanning</ion-badge>
            </ion-item>
          </div>
          <!-- Searching -->
          <div v-show="mode === 'search'">
            <!-- searching products input-->
            <ion-searchbar ref="searchInput" v-model="queryString" :placeholder="translate('Search')" @ionClear="clearSearch" />

            <!-- searching spinner -->
            <ion-item lines="none" v-if="isSearchingProduct">
              <ion-spinner name="crescent" />
            </ion-item>
            
            <!-- result found -->
            <ion-list lines="none" v-else-if="searchedProduct.productId">
              <ion-item>
                <ion-thumbnail>
                  <DxpShopifyImg :product="searchedProduct" />
                </ion-thumbnail>
                <ion-label>
                  {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) }}
                  <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                </ion-label>
                <template v-if="!isItemAlreadyInOrder(searchedProduct.productId)">
                  <ion-button slot="end" fill="outline" @click="addSearchedProductToOrder">
                    {{ translate("Add to Transfer") }}
                  </ion-button>
                </template>
                <template v-else>
                  <ion-icon slot="end" :icon="checkmarkCircle" color="success" />
                </template>
              </ion-item>
              <ion-item detail @click="openAddProductModal">
                {{ translate("View result count more results") }}
              </ion-item>
            </ion-list>
            
            <!-- no search result -->
            <ion-list lines="none" v-else-if="queryString">
              <ion-item>
                <ion-icon :icon="cloudOfflineOutline" slot="start"/>
                <ion-label>
                  {{ translate("No product found") }}
                  <p>{{ translate("Try a different keyword") }}</p>
                </ion-label>
              </ion-item>
              <ion-item detail @click="openAddProductModal">
                {{ translate("View result count more results") }}
              </ion-item>
            </ion-list>

            <!-- before searching -->
            <ion-item lines="none" v-else>
              <ion-icon :icon="shirtOutline" slot="start"/>
              {{ translate("Search for products by their Parent name, SKU or UPC") }}
            </ion-item>
          </div>
        </ion-card>
      </div>

      <!-- content below the card before searching -->
      <div class="ion-text-center" v-if="!currentOrder.items?.length">
        <p>{{ translate("Add items to this transfer by scanning or searching for products using keywords") }}</p>
        <ion-button :color="mode === 'scan' ? 'primary' : 'medium'" :fill="mode === 'scan' ? 'solid' : 'outline'" @click="enableScan">
          <ion-icon :icon="barcodeOutline" slot="start"/>
          {{ translate("Start scanning") }}
        </ion-button>
        <ion-button :color="mode === 'search' ? 'primary' : 'medium'" :fill="mode === 'search' ? 'solid' : 'outline'" @click="enableSearch">
          <ion-icon :icon="searchOutline" slot="start"/>
          {{ translate("Search products") }}
        </ion-button>
      </div>
      <div v-else>
        <h1 class="ion-padding">{{ translate("Transfer items") }}</h1>
        <TransferOrderItem v-for="item in currentOrder.items" :key="item.productId" :itemDetail="item" :lastScannedId="lastScannedId" />
      </div>
    </ion-content>
    <!-- footer -->
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button size="small" color="danger" fill="outline" @click="discardOrder">
            {{ translate("Discard order") }}
          </ion-button>
          <ion-button size="small" fill="outline" :disabled="!currentOrder.items?.length" @click="shiplater">
            {{ translate("Ship later") }}
          </ion-button>
          <ion-button size="small" color="primary" fill="solid" :disabled="!currentOrder.items?.length" @click="packAndShipOrder">
            {{ translate("Pack and ship order") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonBackButton, IonTitle, IonContent, IonCard, IonList, IonItem, IonLabel, IonButton, IonIcon, IonToggle, IonSegment, IonSegmentButton, IonThumbnail, IonBadge, IonSearchbar, IonSpinner, IonFooter, IonButtons, onIonViewWillEnter, alertController, modalController } from '@ionic/vue';
import {
  barcodeOutline,
  checkmarkDoneOutline,
  checkmarkCircle,
  cloudOfflineOutline,
  locateOutline,
  searchOutline,
  shirtOutline,
  storefrontOutline,
} from 'ionicons/icons';
import emitter from "@/event-bus";
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import router from '@/router';
import { DxpShopifyImg, getProductIdentificationValue, useProductIdentificationStore, translate } from '@hotwax/dxp-components';
import { ProductService } from '@/services/ProductService';
import { StockService } from '@/services/StockService';
import { hasError } from '@/adapter';
import logger from '@/logger';
import { showToast } from '@/utils';
import { TransferOrderService } from '@/services/TransferOrderService';
import { OrderService } from '@/services/OrderService';
import TransferOrderItem from '@/components/TransferOrderItem.vue'
import AddProductModal from "@/components/AddProductModal.vue";

const store = useStore();
const route = useRoute();
const productIdentificationStore = useProductIdentificationStore();
const productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

const mode = ref('scan');
const queryString = ref('');
const isSearchingProduct = ref(false);
const searchedProduct = ref({}) as any;
const isScanningEnabled = ref(false);
const lastScannedId = ref('');
const scanInput = ref('') as any
const searchInput = ref('') as any
let timeoutId: any = null;

const barcodeIdentifier = computed(() => store.getters["util/getBarcodeIdentificationPref"]);
const getProduct = computed(() => store.getters["product/getProduct"]);
const currentOrder = computed(() => store.getters["transferorder/getCurrent"]);

watch(queryString, (value) => {
  if(mode.value === 'scan') return;
  const searchedString = value?.trim();

  if(timeoutId) clearTimeout(timeoutId);
  if(!searchedString) {
    isSearchingProduct.value = false;
    return;
  }

  isSearchingProduct.value = true;
  timeoutId = setTimeout(() => {
    findProduct();
  }, 800);
}, { deep: true });

onIonViewWillEnter(async () => {
  emitter.emit('presentLoader');
  await fetchTransferOrderDetail(route.params.orderId as string);
  await fetchProductInformation();
  emitter.emit('dismissLoader');
});

async function fetchTransferOrderDetail(orderId: string) {
  try {
    const orderResp = await TransferOrderService.fetchTransferOrderDetail(orderId);
    if(!hasError(orderResp)) {
      const order = orderResp.data.order;
      order.items = order.items.map((item: any) => ({
        ...item,
        pickedQuantity: item.pickedQuantity ?? item.quantity
      }))
      await store.dispatch('transferorder/updateCurrentTransferOrder', order)
    } else {
      throw orderResp.data;
    }
  } catch (error) {
    logger.error('Error fetching transfer order details:', error);
  }
}

async function fetchProductInformation() {
  try {
    const items = currentOrder.value.items;
    if(!items.length) return;
    const productIds = items.map((item: any) => item.productId)
    await store.dispatch('product/fetchProducts', { productIds });
  } catch (err) {
    logger.error("Failed to fetch product information", err);
  }
}

async function editOrderName() {
  const alert = await alertController.create({
    header: translate("Edit order name"),
    inputs: [
      {
        name: 'orderName',
        value: currentOrder.value?.orderName || '',
        placeholder: translate('Enter order name')
      }
    ],
    buttons: [
      {
        text: translate("Cancel"),
        role: 'cancel'
      },
      {
        text: translate("Save"),
        handler: async(data: any) => {
          const newName = (data.orderName || '').trim();
          if(!newName) {
            showToast(translate('Please enter a valid order name'));
            return false;
          }
          await updateOrderProperty("orderName", newName);
          return true;
        }
      }
    ]
  });
  await alert.present();
}

async function toggleStatusFlow(event: any) {
  const updatedStatusFlowId = event.detail.checked ? 'TO_Fulfill_Only' : 'TO_Fulfill_And_Receive';
  await updateOrderProperty("statusFlowId", updatedStatusFlowId);
}

async function updateOrderProperty(property: string, value: any) {
  try {
    const payload = {
      orderId: currentOrder.value.orderId,
      [property]: value
    };

    const resp = await OrderService.updateOrderHeader(payload);

    if(!hasError(resp)) {
      await store.dispatch('transferorder/updateCurrentTransferOrder', {
        ...currentOrder.value,
        [property]: value
      });

      property === "orderName" ? showToast(translate("Order name updated successfully")) : showToast(translate("Order flow updated successfully"));
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(`Failed to update order ${property}`, err);
    property === "orderName" ? showToast(translate("Failed to update order name")) : showToast(translate("Failed to update order flow"));
  }
}

function clearQuery() {
  queryString.value = ''
  searchedProduct.value = {}
}

// Scanning/Searching helpers
async function enableScan() {
  clearQuery();
  mode.value = 'scan';
  isScanningEnabled.value = true;
}

async function enableSearch() {
  clearQuery();
  mode.value = 'search';
  await nextTick();
  searchInput.value?.$el.setFocus?.()
}

function segmentChange(mode: string) {
  mode === 'scan' ? enableScan() : enableSearch()
}

async function openAddProductModal() {
  const addProductModal = await modalController.create({
    component: AddProductModal,
    componentProps: {
      query: queryString.value,
    }
  });

  addProductModal.onDidDismiss().then(async () => {
    queryString.value = '';
    await fetchTransferOrderDetail(currentOrder.value.orderId as string);
    await fetchProductInformation();
  })
  await addProductModal.present();
}

async function scanProduct() {
  const scannedId = queryString.value?.trim();
  if(!scannedId) return;

  // clear any watcher-scheduled timeout to avoid a later duplicate call
  if(timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  isSearchingProduct.value = true;
  // call findProduct which will update searchedProduct (found or not)
  const productFound: any = await findProduct();
  if(productFound) {
    await commitProductToOrder(productFound, scannedId);
  } 
}

async function addSearchedProductToOrder() {
  const productId = searchedProduct.value?.productId;
  if(!productId) return;
  const product = getProduct.value(productId);
  await commitProductToOrder(product);
}

// Find a product (shared by scan & search)
// - On search: sets a preview in `searchedProduct`
// - Returns the found product (or null)
async function findProduct() {
  const query = queryString.value?.trim();
  if(!query) { 
    isSearchingProduct.value = false; 
    return null; 
  }

  try {
    const resp = await ProductService.fetchProducts({
      filters: [
        'isVirtual: false',
        `goodIdentifications: ${barcodeIdentifier.value}/${mode.value === 'scan' ? query : `*${query}*`}`
      ],
      viewSize: 1
    });

    if(!hasError(resp) && resp.data.response?.docs?.length) {
      const item = resp.data.response.docs[0];
      store.dispatch("product/addProductToCached", item);
      searchedProduct.value = { productId: item.productId, mainImageUrl: item.mainImageUrl };
      isSearchingProduct.value = false;
      return item;
    } else {
      searchedProduct.value = { scannedId: query };
      isSearchingProduct.value = false;
      return null;
    }
  } catch (err) {
    logger.error(err);
    searchedProduct.value = {};
  }
}
// Commit a product to the order (single source of truth)
// - Used by scan immediately, and by search on button click
async function commitProductToOrder(product: any, scannedId?: string) {
  if(!product?.productId) return;

  // If already in order, just increment
  const alreadyAdded = findAndScrollToExisting(scannedId, product.productId);
  if(alreadyAdded) {
    queryString.value = '';
    return;
  }

  const newItem: any = {
    productId: product.productId,
    sku: product.sku,
    quantity: 1,
    pickedQuantity: 1,
    shipGroupSeqId: "00001",
    scannedId
  };

  // qoh/atp & instant UI feedback
  const stock = product.productId ? await fetchStock(product.productId) : null;
  if(stock) {
    newItem.qoh = stock.qoh ?? 0;
    newItem.atp = stock.atp ?? 0;
  }
  searchedProduct.value = { ...newItem };

  try {
    const resp = await addProductToOrderApi(newItem);
    if(!hasError(resp)) {
      newItem.orderId = route.params.orderId;
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
  queryString.value = '';
}

async function addProductToOrderApi(newItem: any) {
  const unitPrice = await ProductService.fetchProductAverageCost(newItem.productId, currentOrder.value.orderFacilityId)

  const payload = {
    orderId: currentOrder.value.orderId,
    productId: newItem.productId,
    quantity: newItem.quantity,
    shipGroupSeqId: newItem.shipGroupSeqId,
    unitPrice: unitPrice
  }
  return await TransferOrderService.addProductToOrder(payload)
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

// Utility functions
function findAndScrollToExisting(identifier?: string, productId?: string) {
  const items = currentOrder.value.items || [];
  const existing = items.find((item: any) => {
    if(productId && item.productId === productId) return true;
    const idVal = item.scannedId ? item.scannedId : getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId));
    return identifier && idVal === identifier;
  });

  if(existing) {
    scrollToProduct(existing);
    return true;
  }
  return false;
}

// check if product already exists in currentOrder
function isItemAlreadyInOrder(productId: string) {
  return currentOrder.value?.items?.some((item: any) => item.productId === productId)
}

function scrollToProduct(item: any) {
  lastScannedId.value = item.scannedId ? item.scannedId : getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId));
  const el = document.getElementById(item.scannedId ? item.scannedId : getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId)));
  if(el) el.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => lastScannedId.value = '', 3000);
}

function clearSearch() {
  queryString.value = '';
  searchedProduct.value = {};
}

async function discardOrder() {
  const orderId = currentOrder.value.orderId;
  try {
    const resp = await TransferOrderService.cancelTransferOrder(orderId);
    if(!hasError(resp)) {
      showToast(translate("Order discarded successfully"));
      router.replace({ path: '/transfer-orders' });
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to discard order", err);
    showToast(translate("Failed to discard order"));
  }
}

async function approveOrder(orderId: string) {
  try {
    const resp = await TransferOrderService.approveTransferOrder(orderId);
    if(!hasError(resp)) {
      return true;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to approve the transfer order', err);
    return false;
  }
}

async function shiplater() {
  try {
    const success = await approveOrder(currentOrder.value.orderId);    
    if(success) {
      router.replace({ path: '/transfer-orders' })
    }
  } catch (err) {
    logger.error('Failed to approve the transfer order to ship later', err);
  }
}

async function packAndShipOrder() {
  let shipmentId;
  try {
    const success = await approveOrder(currentOrder.value.orderId);
    if(!success) {
      showToast(translate("Order approval failed"));
      return;
    }
    const eligibleItems = currentOrder.value.items.filter((item: any) => item.quantity > 0);
    if(!eligibleItems.length) return;

    // Group items into packages — assuming we're sending one package for now
    const packages = [{
      items: eligibleItems.map((item: any) => ({
        orderItemSeqId: item.orderItemSeqId,
        productId: item.productId,
        quantity: parseInt(item.quantity),
        shipGroupSeqId: item.shipGroupSeqId
      }))
    }];

    const params = {
      "payload": {
        "orderId": currentOrder.value.orderId,
        "packages": packages
      }
    }
    const resp = await TransferOrderService.createOutboundTransferShipment(params)
    if(!hasError(resp)) {
      shipmentId = resp.data.shipmentId;
      router.push({ path: `/ship-transfer-order/${shipmentId}` })
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error(error);
    showToast(translate('Failed to create shipment'));
  }
}
</script>

<style scoped>
.transfer-order {
  display: flex;
  align-items: start;
  gap: var(--spacer-base);
  padding: var(--spacer-base);
}

.transfer-order > * {
  margin: 0;
}

.order-info {
  flex: 1;
}

.add-items {
  flex: 3;
}

.search-type { 
  display: flex;
}

.order-items{
  padding: var(--spacer-base);
}
</style>
