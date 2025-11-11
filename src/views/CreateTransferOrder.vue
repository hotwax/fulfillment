<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="create-transfer-orders-back-btn" default-href="/transfer-orders" slot="start"/>
        <ion-title>{{ translate("Create transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- Loader -->
      <div v-if="isOrderLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Loading...") }}</ion-label>
      </div>
      <!-- Order Found -->
      <div v-else-if="currentOrder.statusId === 'ORDER_CREATED'">
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
                <ion-button data-testid="order-name-edit-btn" slot="end" color="medium" fill="outline" @click="editOrderName">{{ translate("Edit") }}</ion-button>
              </ion-item>
              <ion-item>
                <ion-icon :icon="storefrontOutline" slot="start"/>
                <!-- currently the facility name is coming in the api -->
                <ion-label>{{ getFacilityName(currentOrder.shipGroups?.[0]?.orderFacilityId) }}</ion-label>
                <ion-button data-testid="store-name-edit-btn" slot="end" color="medium" fill="outline" size="small" @click="openSelectFacilityModal">{{ translate("Edit") }}</ion-button>
              </ion-item>
              <ion-item>
                <ion-icon :icon="checkmarkDoneOutline" slot="start"/>
                <ion-label>
                  {{ translate("Return to warehouse") }}
                  <p>{{ translate("Complete order on fulfillment") }}</p>
                </ion-label>
                <ion-toggle slot="end" data-testid="toggle-complete-on-fulfillment" :checked="currentOrder.statusFlowId === 'TO_Fulfill_Only'" @ionChange="toggleStatusFlow">
                </ion-toggle>
              </ion-item>
            </ion-list>
          </ion-card>
  
          <!-- adding product card -->
          <ion-card class="add-items">
            <div class="mode">
              <h5 class="ion-margin-horizontal">{{ translate("Add items") }}</h5>
              <ion-segment v-model="mode" @ionChange="segmentChange($event.target.value)">
                <ion-segment-button value="scan" content-id="scan">
                  <ion-icon :icon="barcodeOutline"/>
                </ion-segment-button>
                <ion-segment-button :disabled="isForceScanEnabled" value="search" content-id="search">
                  <ion-icon :icon="searchOutline"/>
                </ion-segment-button>
              </ion-segment>
            </div>
            <!-- Scanning -->
            <div v-show="mode === 'scan'">
              <!-- scanning input -->
              <ion-item lines="full">
                <ion-input ref="scanInput" v-model="queryString" :label="translate('Scan barcode')" :placeholder="barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier" @ionBlur="isScanningEnabled = false" @ionFocus="isScanningEnabled = true" @keyup.enter="queryString = $event.target.value; scanProduct()" />
              </ion-item>
              <!-- product found after scan (reads from searchedProduct) -->
              <ion-item lines="none" v-if="searchedProduct.productId">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" :key="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ getProductIdentificationValue(barcodeIdentifier, getProduct(searchedProduct.productId)) }}
                  <p>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) : getProduct(searchedProduct.productId)?.internalName }}</p>
                  <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                </ion-label>
                <ion-icon v-if="!pendingProductIds.has(searchedProduct.productId)" :icon="checkmarkDoneOutline" color="success" slot="end"/>
                <ion-spinner v-else name="crescent" slot="end" />
              </ion-item>
              
              <!-- scanned no match -->
              <ion-item lines="none" v-else-if="searchedProduct.scannedId && !searchedProduct.productId">
                <ion-icon :icon="cloudOfflineOutline" slot="start"/>
                <ion-label>
                  {{ searchedProduct.scannedId }} {{ translate("not found") }}
                  <p>{{ translate("Try searching using a keyword instead") }}</p>
                </ion-label>
                <!-- need to add match product button -->
                <ion-button size="small" slot="end" color="primary" @click="openAddProductModal">
                  <ion-icon slot="start" :icon="searchOutline"/>
                  {{ translate("Search") }}
                </ion-button>
              </ion-item>
  
              <!-- scanner not focused -->
              <ion-item lines="none" v-else-if="!isScanningEnabled">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg/>
                </ion-thumbnail>
                <ion-label>
                  {{ translate("Your scanner isn’t focused yet.") }}
                  <p>{{ translate("Scanning is set to") }} {{ barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier }}</p>
                  <p v-if="barcodeIdentifier !== 'SKU'">{{ translate("Swap to SKU from the settings page") }}</p>
                </ion-label>
                <ion-button slot="end" color="warning" size="small" @click="enableScan">
                  <ion-icon slot="start" :icon="locateOutline"/>
                  {{ translate("Focus scanning") }}
                </ion-button>
              </ion-item>
  
              <!-- default / idle state -->
              <ion-item lines="none" v-else>
                <ion-thumbnail slot="start">
                  <DxpShopifyImg/>
                </ion-thumbnail>
                <ion-label>
                  {{ translate("Begin scanning products to add them to this transfer") }}
                  <p>{{ translate("Scanning is set to") }} {{ barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier }}</p>
                  <p v-if="barcodeIdentifier !== 'SKU'">{{ translate("Swap to SKU from the settings page") }}</p>
                </ion-label>
                <ion-badge slot="end" color="success">{{ translate("start scanning") }}</ion-badge>
              </ion-item>
            </div>
            <!-- Searching -->
            <div v-show="mode === 'search'">
              <!-- searching products input-->
              <ion-searchbar data-testid="search-product-input" ref="searchInput" v-model="queryString" :placeholder="translate('Search')" @ionClear="clearSearch" />
  
              <!-- searching spinner -->
              <ion-item lines="none" v-if="isSearchingProduct">
                <ion-spinner name="crescent" />
              </ion-item>
              
              <!-- result found -->
              <ion-list lines="none" v-else-if="searchedProduct.productId">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg :src="searchedProduct.mainImageUrl" :key="searchedProduct.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) : getProduct(searchedProduct.productId)?.internalName }}
                    <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                  </ion-label>
                  <template v-if="!isProductInOrder(searchedProduct.productId)">
                    <ion-button data-testid="add-to-transfer-btn" :disabled="pendingProductIds.has(searchedProduct.productId)" slot="end" fill="outline" @click="addSearchedOrderItem">
                      {{ pendingProductIds.has(searchedProduct.productId) ? translate("Adding...") : translate("Add to Transfer") }}
                    </ion-button>
                  </template>
                  <template v-else>
                    <ion-icon slot="end" :icon="checkmarkCircle" color="success" />
                  </template>
                </ion-item>
                <ion-item button v-if="productSearchCount > 1" data-testid="view-more-results" detail @click="openAddProductModal">
                  {{ translate("View more results", { count: productSearchCount - 1 }) }}
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
          <ion-button class="ion-margin-end" :color="mode === 'scan' ? 'primary' : 'medium'" :fill="mode === 'scan' ? 'solid' : 'outline'" @click="enableScan">
            <ion-icon :icon="barcodeOutline" slot="start"/>
            {{ translate("Start scanning") }}
          </ion-button>
          <ion-button :disabled="isForceScanEnabled" :color="mode === 'search' ? 'primary' : 'medium'" :fill="mode === 'search' ? 'solid' : 'outline'" @click="enableSearch">
            <ion-icon :icon="searchOutline" slot="start"/>
            {{ translate("Search products") }}
          </ion-button>
        </div>
        <div v-else>
          <h1 class="ion-padding">{{ translate("Transfer items") }}</h1>
          <TransferOrderItem v-for="item in currentOrder.items" :key="item.productId" :itemDetail="item" :lastScannedId="lastScannedId" orderStatus="created" />
        </div>
      </div>
      <!-- No Order Found -->
      <div v-else class="empty-state">
        <ion-label>{{ translate("No order found") }}</ion-label>
      </div>
    </ion-content>
    <!-- footer -->
    <ion-footer v-if="currentOrder.statusId === 'ORDER_CREATED'">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button data-testid="discard-order-btn" size="small" color="danger" fill="outline" @click="router.replace('/transfer-orders')">
            {{ translate("Discard order") }}
          </ion-button>
          <ion-button data-testid="ship-later-btn-create-transfer-order-page" size="small" fill="outline" :disabled="!currentOrder.items?.length || hasInvalidPickedQuantity() || pendingProductIds.size" @click="shiplater">
            {{ translate("Ship later") }}
          </ion-button>
          <ion-button data-testid="pack-and-ship-order-btn" size="small" color="primary" fill="solid" :disabled="!currentOrder.items?.length || hasInvalidPickedQuantity() || pendingProductIds.size" @click="packAndShipOrder">
            {{ translate("Pack and ship order") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonBackButton, IonTitle, IonContent, IonCard, IonList, IonItem, IonInput, IonLabel, IonButton, IonIcon, IonToggle, IonSegment, IonSegmentButton, IonThumbnail, IonBadge, IonSearchbar, IonSpinner, IonFooter, IonButtons, onIonViewWillEnter, alertController, modalController, onIonViewWillLeave } from '@ionic/vue';
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
import { onBeforeRouteLeave, useRoute } from 'vue-router';
import router from '@/router';
import { DxpShopifyImg, getProductIdentificationValue, useProductIdentificationStore, translate } from '@hotwax/dxp-components';
import { ProductService } from '@/services/ProductService';
import { StockService } from '@/services/StockService';
import { hasError } from '@/adapter';
import logger from '@/logger';
import { getCurrentFacilityId, showToast } from '@/utils';
import { TransferOrderService } from '@/services/TransferOrderService';
import { UtilService } from '@/services/UtilService';
import { OrderService } from '@/services/OrderService';
import TransferOrderItem from '@/components/TransferOrderItem.vue'
import AddProductModal from "@/components/AddProductModal.vue";
import SelectFacilityModal from "@/components/SelectFacilityModal.vue"
import { useProductQueue } from '@/composables/useProductQueue';

const store = useStore();
const route = useRoute();
const productIdentificationStore = useProductIdentificationStore();
const productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
const { addProductToQueue, clearQueue, pendingProductIds, isProductInOrder } = useProductQueue();

const mode = ref('scan');
const queryString = ref('');
const isOrderLoading = ref(false);
const isSearchingProduct = ref(false);
const searchedProduct = ref({}) as any; // Stores the product found from scan/search - used to display product details below input
const isScanningEnabled = ref(false);
const lastScannedId = ref(''); // Stores the last successfully scanned product ID - used to highlight recently scanned items
const scanInput = ref('') as any
const searchInput = ref('') as any
let timeoutId: any = null;
let productSearchCount = ref(0);
let facilities = ref([]) as any;
let preventLeave = ref(false);
let barcodeIdentificationDesc = ref({}) as any;

const barcodeIdentifier = computed(() => store.getters["util/getBarcodeIdentificationPref"]);
const getProduct = computed(() => store.getters["product/getProduct"]);
const currentOrder = computed(() => store.getters["transferorder/getCurrent"]);
const isForceScanEnabled = computed(() => store.getters['util/isForceScanEnabled']);

watch(queryString, (value) => {
  if(mode.value === 'scan') return;
  const searchedString = value?.trim();

  if(timeoutId) clearTimeout(timeoutId);
  if(!searchedString) {
    isSearchingProduct.value = false;
    searchedProduct.value = {}
    return;
  }

  isSearchingProduct.value = true;
  timeoutId = setTimeout(() => {
    findProduct(searchedString);
  }, 800);
}, { deep: true });

onIonViewWillEnter(async () => {
  isOrderLoading.value = true;
  emitter.on('clearSearchedProduct', clearSearchedProduct as any);
  const isValidOrder = await fetchTransferOrderDetail(route?.params?.orderId as string);
  if(isValidOrder) {
    await fetchProductInformation();
    await fetchBarcodeIdentificationDesc();
    facilities.value = await UtilService.fetchProductStoreFacilities();
  }
  isOrderLoading.value = false;
});

// Discards the current transfer order by calling the cancel API and navigates to the transfer orders list.
onBeforeRouteLeave(async () => {
  if(preventLeave.value || currentOrder.value.statusId !== 'ORDER_CREATED') return true;

  let canLeave = false;
  const alert = await alertController.create({
    header: translate('Discard order'),
    message: translate('Are you sure you want to discard this transfer order?'),
    buttons: [
      {
        text: translate('Cancel'),
        role: 'cancel',
        htmlAttributes: { 
          'data-testid': 'discard-order-cancel-btn'
        },
        handler: () => {
          canLeave = false;
        },
      },
      {
        text: translate('Discard'),
        htmlAttributes: { 
          'data-testid': 'discard-order-discard-btn'
        },
        handler: async () => {
          const orderId = currentOrder.value.orderId;
          let resp;

          try {
            if (!currentOrder.value?.items?.length) {
              // No items — update order header directly
              const payload = { orderId, statusId: 'ORDER_CANCELLED' };
              resp = await OrderService.updateOrderHeader(payload);
            } else {
              // Items present — cancel via transfer order API
              resp = await TransferOrderService.cancelTransferOrder(orderId);
            }

            if (!hasError(resp)) {
              showToast(translate('Order discarded successfully'));
              canLeave = true;
              alertController.dismiss();
            } else {
              throw resp.data;
            }
          } catch (err) {
            logger.error('Failed to discard order', err);
            showToast(translate('Failed to discard order'));
            canLeave = false;
          }
        },
      },
    ],
  });

  await alert.present();
  await alert.onDidDismiss();
  return canLeave;
});

const clearSearchedProduct = () => {
  searchedProduct.value = {};
  queryString.value = '';
};

onIonViewWillLeave(() => {
  emitter.off('clearSearchedProduct', clearSearchedProduct as any);
  clearQueue();
});

// Fetches transfer order details by orderId, including its items, and updates the store.
async function fetchTransferOrderDetail(orderId: string) {
  try {
    const orderResp = await TransferOrderService.fetchTransferOrderDetail(orderId);
    if(!hasError(orderResp) && Object.keys(orderResp.data?.order).length) {
      const order = orderResp.data.order;
      if(order.statusId !== 'ORDER_CREATED') {
        await store.dispatch('transferorder/updateCurrentTransferOrder', order)
        return false;
      }

      // Process items and add additional information
      if(order.items && order.items.length) {
        const items = await Promise.allSettled(
          order.items.map(async (item: any) => {
            const stock = await fetchStock(item.productId);
            return {
              ...item,
              pickedQuantity: item.pickedQuantity ?? item.quantity,
              qoh: stock?.qoh
            };
          })
        );
        // Update order items with stock information
        order.items = items.map((item: any) => item.value);
      } else {
        order.items = [];
      }

      // Dispatch to store
      await store.dispatch('transferorder/updateCurrentTransferOrder', order)
      return true;
    } else {
      throw orderResp.data;
    }
  } catch (error) {
    logger.error('Error fetching transfer order details:', error);
  }
  return false;
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

async function fetchBarcodeIdentificationDesc() {
  try {
    const resp = await ProductService.fetchBarcodeIdentificationDesc({ parentTypeId: 'HC_GOOD_ID_TYPE' });
    
    if (!hasError(resp) && resp.data?.length) {
      barcodeIdentificationDesc.value = resp.data.reduce((identifierDesc: any, identifier: any) => {
        identifierDesc[identifier.goodIdentificationTypeId] = identifier.description;
        return identifierDesc;
      }, {});
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch product identification descriptions", err);
  }
}

async function editOrderName() {
  const alert = await alertController.create({
    header: translate("Edit order name"),
    inputs: [
      {
        name: 'orderName',
        value: currentOrder.value?.orderName || '',
        placeholder: translate('Enter order name'),
        attributes: {
          'data-testid': "edited-order-name-input"
        }
      }
    ],
    buttons: [
      {
        text: translate("Cancel"),
        role: 'cancel',
        htmlAttributes: { 
          'data-testid': "cancel-editting-transfer-order-name-btn"
        }
      },
      {
        text: translate("Save"),
        htmlAttributes: { 
          'data-testid': "save-edited-transfer-order-name-btn"
        },
        handler: async(data: any) => {
          const updatedOrderName = (data.orderName || '').trim();
          const currentOrderName = (currentOrder.value?.orderName || '').trim();

          if(!updatedOrderName) {
            showToast(translate('Please enter a valid order name'));
            return false;
          }
          if(currentOrderName === updatedOrderName) {
            return true;
          }

          await updateOrderProperty("orderName", updatedOrderName);
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

// Updates a transfer order's property (name or flow) and shows success/failure toast messages
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

async function openSelectFacilityModal() {
  const addressModal = await modalController.create({
    component: SelectFacilityModal,
    componentProps: {
      currentFacilityId: currentOrder.value.shipGroups?.[0]?.facilityId,
      selectedFacilityId: currentOrder.value.shipGroups?.[0]?.orderFacilityId,
      facilities: facilities.value
    }
  });

  addressModal.onDidDismiss().then(async (result: any) => {
    if(result.data?.selectedFacilityId) {
      await updateOrderFacility(result.data?.selectedFacilityId);
    }
  });
  
  await addressModal.present();
}

// Updates the order facility with the given facility ID.
async function updateOrderFacility(facilityId: string) {
  const shipGroup = currentOrder.value?.shipGroups?.[0];

  const payload = {
    orderId: currentOrder.value.orderId,
    orderFacilityId: facilityId,
    shipGroupSeqId: shipGroup?.shipGroupSeqId
  }

  try {
    const resp = await OrderService.updateOrderFacility(payload)
    if(!hasError(resp)) {
      if(shipGroup) shipGroup.orderFacilityId = facilityId;
      await store.dispatch('transferorder/updateCurrentTransferOrder', currentOrder.value);
      showToast(translate("Store name updated successfully"))
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error("Failed to update destination facility", error)
    showToast(translate("Failed to update store"))
  }
}

function clearQuery() {
  queryString.value = ''
  searchedProduct.value = {}
}

// Scanning/Searching helpers
// Enables scan mode and activates scanning.
async function enableScan() {
  mode.value = 'scan';
  isScanningEnabled.value = true;
  setTimeout(() => {
    scanInput.value?.$el.setFocus?.()
  }, 0)
}

// Activates search mode: sets mode, focuses input after DOM update, and disables scanning.
// Used by the "Search products" button.
async function enableSearch() {
  mode.value = 'search';
  await nextTick();
  searchInput.value?.$el.setFocus?.()
  isScanningEnabled.value = false
}

// Handles segment changes: clears query, switches to search mode or disables scanning.
// Used by the segment change toggle UI.
function segmentChange(mode: string) {
  clearQuery();
  mode === 'search' ? enableSearch() : isScanningEnabled.value = false;
}

async function openAddProductModal() {
  const addProductModal = await modalController.create({
    component: AddProductModal,
    componentProps: {
      query: searchedProduct.value.scannedId || queryString.value,
    }
  });

  addProductModal.onDidDismiss().then(async () => {
    queryString.value = '';
    await fetchProductInformation();
  })
  await addProductModal.present();
}

function getFacilityName(facilityId: string) {
  const facility = facilities.value.find((facility: any) => facility.facilityId === facilityId)
  return facility ? facility.facilityName || facility.facilityId : facilityId
}

async function scanProduct() {
  const scannedId = queryString.value?.trim();
  if(!scannedId) return;
  queryString.value = '';

  // clear any watcher-scheduled timeout to avoid a later duplicate call
  if(timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  isSearchingProduct.value = true;
  // call findProduct which will update searchedProduct (found or not)
  const productFound: any = await findProduct(scannedId);
  if(productFound) {
    await addProductViaQueue(productFound, scannedId);
  }
}

async function addProductViaQueue(product: any, scannedId?: string) {
  if (!product?.productId) return;

  // If product is already in order → scroll to existing row & exit
  const alreadyAdded = findAndScrollToExisting(scannedId, product.productId);
  if(alreadyAdded) {
    queryString.value = '';
    return;
  }

  const itemToAdd = {
    product: product,
    orderId: currentOrder.value.orderId,
    facilityId: currentOrder.value.shipGroups?.[0]?.facilityId,
    scannedId: scannedId,
    onSuccess: (product: any, newItem: any) => {
      // Only keep the searchedProduct for scanning flow
      if (scannedId) {
        // Scanning flow - show success state
        searchedProduct.value = { ...newItem, productId: product.productId };
      } else {
        // Search flow - clear and return to initial state
        searchedProduct.value = {};
        queryString.value = '';
      }
    },
    onError: (product: any, error: any) => {
      searchedProduct.value = {};
      logger.error(`Failed to add product ${product.productId}:`, error);
    }
  };
  
  addProductToQueue(itemToAdd);
}

async function addSearchedOrderItem() {
  const productId = searchedProduct.value?.productId;
  if(!productId) return;
  const product = getProduct.value(productId);
  // Use the queue system for search flow
  await addProductViaQueue(product);
}

// Find a product (shared by scan & search)
// - On search: sets a preview in `searchedProduct`
// - Returns the found product (or null)
async function findProduct(value: string) {
  if(!value) { 
    isSearchingProduct.value = false; 
    return null; 
  }

  try {
    const payload: any = {
      filters: ['isVirtual: false', 'isVariant: true'],
      viewSize: 1
    }

    if(mode.value === 'scan') {
      payload.filters.push(`goodIdentifications: ${barcodeIdentifier.value}/${value}`);
    } else {
      payload.keyword = value;
    }
    const resp = await ProductService.fetchProducts(payload);

    if(!hasError(resp) && resp.data.response?.docs?.length) {
      productSearchCount.value = resp.data.response?.numFound
      const item = resp.data.response.docs[0];
      store.dispatch("product/addProductToCached", item);
      searchedProduct.value = { productId: item.productId, mainImageUrl: item.mainImageUrl };
      isSearchingProduct.value = false;
      return item;
    } else {
      searchedProduct.value = { scannedId: value };
      isSearchingProduct.value = false;
      return null;
    }
  } catch (err) {
    logger.error(err);
    searchedProduct.value = {};
    isSearchingProduct.value = false;
  }
}

// Stock fetch helper
async function fetchStock(productId: string) {
  try {
    const resp: any = await StockService.getInventoryAvailableByFacility({
      productId,
      facilityId: getCurrentFacilityId()
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

// Scrolls the view to the specified product item and highlights it temporarily.
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

// Returns true if any order item has invalid (zero or negative) picked quantity
function hasInvalidPickedQuantity() {
  return currentOrder.value.items.some((item: any) => !item.pickedQuantity || item.pickedQuantity <= 0);
}

async function approveOrder(orderId: string) {
  try {
    const resp = await TransferOrderService.approveTransferOrder(orderId);
    if(!hasError(resp)) {
      currentOrder.value.statusId = "ORDER_APPROVED"
      await store.dispatch('transferorder/updateCurrentTransferOrder', currentOrder.value);
      return true;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to approve the transfer order', err);
    return false;
  }
}

// Approves the current transfer order and redirects to the transfer orders page.
async function shiplater() {
  const message = translate("Save this order without tracking details to ship later.");
  const alert = await alertController.create({
    header: translate("Ship later"),
    message,
    buttons: [
      {
        text: translate("Go back"),
        role: 'cancel',
        htmlAttributes: { 
          'data-testid': "shiplater-goback-btn"
        },
      },
      {
        text: translate("Continue"),
        htmlAttributes: { 
          'data-testid': "shiplater-continue-btn"
        },
        handler: async () => {
          preventLeave.value = true;
          const success = await approveOrder(currentOrder.value.orderId);
          if(success) {
            router.replace({ path: '/transfer-orders' });
          } else {
            preventLeave.value = false;
            showToast(translate('Failed to approve the transfer order to ship later.'));
          }
        }
      }
    ],
  });
  return alert.present();
}

// Packs and ships the order by approving it, grouping items into packages, and creating an outbound transfer shipment.
async function packAndShipOrder() {
  let shipmentId;
  try {
    if(currentOrder.value.statusId === 'ORDER_CREATED') {
      const success = await approveOrder(currentOrder.value.orderId);
      if(!success) {
        showToast(translate("Order approval failed"));
        return;
      }
    }

    // Group items into packages — assuming we're sending one package for now
    const packages = [{
      items: currentOrder.value.items.map((item: any) => ({
        orderItemSeqId: item.orderItemSeqId,
        productId: item.productId,
        quantity: parseInt(item.pickedQuantity),
        shipGroupSeqId: item.shipGroupSeqId
      }))
    }];

    const params = {
      "payload": {
        "orderId": currentOrder.value.orderId,
        "packages": packages
      }
    }
    preventLeave.value = true;

    const resp = await TransferOrderService.createOutboundTransferShipment(params)
    if(!hasError(resp)) {
      shipmentId = resp.data.shipmentId;
      router.replace({ path: `/ship-transfer-order/${shipmentId}` })
    } else {
      throw resp.data;
    }
  } catch (error) {
    preventLeave.value = false;
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
  flex-wrap: wrap;
}

.transfer-order > * {
  margin: 0;
}

.order-info {
  flex: 1 0 350px;
}

.add-items {
  flex: 3 1 375px;
}

.add-items .mode { 
  display: flex;
}

.add-items .mode ion-segment {
  grid-auto-columns: minmax(auto, 150px);
  justify-content: start;
  flex: 0 1 max-content;
}

.order-items{
  padding: var(--spacer-base);
}
</style>
