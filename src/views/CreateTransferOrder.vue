<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="create-transfer-orders-back-btn" default-href="/transfer-orders" slot="start"/>
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
              <ion-button data-testid="order-name-edit-btn" slot="end" color="medium" fill="outline" @click="editOrderName">{{ translate("Edit") }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-icon :icon="storefrontOutline" slot="start"/>
              <!-- currently the facility name is coming in the api -->
              <ion-label>{{ getFacilityName(currentOrder.orderFacilityId) }}</ion-label>
              <ion-button data-testid="store-name-edit-btn" slot="end" color="medium" fill="outline" size="small" @click="openSelectFacilityModal">{{ translate("Edit") }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-icon :icon="checkmarkDoneOutline" slot="start"/>
              <ion-toggle data-testid="toggle-complete-on-fulfillment" class="ion-text-wrap" :checked="currentOrder.statusFlowId === 'TO_Fulfill_Only'" @ionChange="toggleStatusFlow">
                {{ translate("Complete order on fulfillment") }}
              </ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card>

        <!-- adding product card -->
        <ion-card class="add-items">
          <div class="search-type">
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
              <ion-input ref="scanInput" :disabled="!isScanningEnabled" :value="queryString" :label="translate('Scan barcode')" :placeholder="barcodeIdentifier" @keyup.enter="queryString = $event.target.value; scanProduct()" />
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
                <p>{{ translate("Scanning is set to") }} {{ (barcodeIdentifier || '').toUpperCase() }}</p>
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
                <p>{{ translate("Scanning is set to") }} {{ (barcodeIdentifier || '').toUpperCase() }}</p>
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
                <template v-if="!isItemAlreadyInOrder(searchedProduct.productId)">
                  <ion-button data-testid="add-to-transfer-btn" slot="end" fill="outline" @click="addSearchedOrderItem">
                    {{ translate("Add to Transfer") }}
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
    </ion-content>
    <!-- footer -->
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button data-testid="discard-order-btn" size="small" color="danger" fill="outline" @click="discardOrder">
            {{ translate("Discard order") }}
          </ion-button>
          <ion-button data-testid="ship-later-btn-create-transfer-order-page" size="small" fill="outline" :disabled="!currentOrder.items?.length" @click="shiplater">
            {{ translate("Ship later") }}
          </ion-button>
          <ion-button data-testid="pack-and-ship-order-btn" size="small" color="primary" fill="solid" :disabled="!currentOrder.items?.length" @click="packAndShipOrder">
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
import { getCurrentFacilityId, showToast } from '@/utils';
import { TransferOrderService } from '@/services/TransferOrderService';
import { UtilService } from '@/services/UtilService';
import { OrderService } from '@/services/OrderService';
import TransferOrderItem from '@/components/TransferOrderItem.vue'
import AddProductModal from "@/components/AddProductModal.vue";
import SelectFacilityModal from "@/components/SelectFacilityModal.vue"

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
let productSearchCount = ref(0);
let facilities = ref([]) as any;

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
    findProduct();
  }, 800);
}, { deep: true });

onIonViewWillEnter(async () => {
  emitter.emit('presentLoader');
  await fetchTransferOrderDetail(route?.params?.orderId as string);
  await fetchProductInformation();
  facilities.value = await UtilService.fetchProductStoreFacilities();
  emitter.emit('dismissLoader');
});

// Fetches transfer order details by orderId, including its items, and updates the store.
async function fetchTransferOrderDetail(orderId: string) {
  try {
    const orderResp = await TransferOrderService.fetchTransferOrderDetailByShipGroup(orderId);
    if(!hasError(orderResp)) {
      const order = orderResp.data[0];
      // Fetch items and attach to order
      const items = await fetchOrderItems(order.orderId);
      order.items = items;

      // Dispatch to store
      await store.dispatch('transferorder/updateCurrentTransferOrder', order)
    } else {
      throw orderResp.data;
    }
  } catch (error) {
    logger.error('Error fetching transfer order details:', error);
  }
}

async function fetchOrderItems(orderId: string) {
  try {
    const resp = await TransferOrderService.findTransferOrderItems({ orderId });

    if(hasError(resp) && !resp?.data?.transferOrderItems?.length) {
      throw resp.data;
    }

    const items = await Promise.allSettled(
      resp.data.transferOrderItems.map(async (item: any) => {
        const stock = await fetchStock(item.productId);
        return {
          ...item,
          pickedQuantity: item.pickedQuantity ?? item.quantity,
          qoh: stock?.qoh
        };
      })
    );
    // Keep only fulfilled results
    return items.filter(item => item.status === "fulfilled").map((item: any) => item.value);

  } catch (error) {
    logger.error("Error fetching order items:", error);
    return [];
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
      currentFacilityId: currentOrder.value.facilityId,
      selectedFacilityId: currentOrder.value.orderFacilityId,
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
  const payload = {
    orderId: currentOrder.value.orderId,
    orderFacilityId: facilityId,
    shipGroupSeqId: currentOrder.value.shipGroupSeqId
  }

  try {
    const resp = await OrderService.updateOrderFacility(payload)
    if(!hasError(resp)) {
      currentOrder.value.orderFacilityId = facilityId;
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
    scanInput.value?.setFocus?.()
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

function getFacilityName(facilityId: string) {
  const facility = facilities.value.find((facility: any) => facility.facilityId === facilityId)
  return facility ? facility.facilityName || facility.facilityId : facilityId
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
    await addTransferOrderItem(productFound, scannedId);
  }
  // clear the input field after scanning the product
  queryString.value = '';
}

async function addSearchedOrderItem() {
  const productId = searchedProduct.value?.productId;
  if(!productId) return;
  const product = getProduct.value(productId);
  await addTransferOrderItem(product);
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
    const payload: any = {
      filters: ['isVirtual: false', 'isVariant: true'],
      viewSize: 1
    }

    if(mode.value === 'scan') {
      payload.filters.push(`goodIdentifications: ${barcodeIdentifier.value}/${query}`);
    } else {
      payload.keyword = queryString.value.trim();
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
      searchedProduct.value = { scannedId: query };
      isSearchingProduct.value = false;
      return null;
    }
  } catch (err) {
    logger.error(err);
    searchedProduct.value = {};
    isSearchingProduct.value = false;
  }
}

/**
 * Commits a product to the current transfer order.
 * - Handles scanning or manual search add
 * - Fetches stock + average cost
 * - Calls API to create order item
 * - Updates local currentOrder state
 */
async function addTransferOrderItem(product: any, scannedId?: string) {
  if (!product?.productId) return;

  // If product is already in order → scroll to existing row & exit
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

  // Fetch available stock
  const stock = product.productId ? await fetchStock(product.productId) : null;
  newItem.qoh = stock?.qoh;
  searchedProduct.value = { ...newItem };

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

    if(!hasError(resp)) {
      // Update local state with order item & refresh order in store
      newItem.orderId = currentOrder.value.orderId;
      newItem.orderItemSeqId = resp.data?.orderItemSeqId;

      currentOrder.value.items.push(newItem);
      await store.dispatch('transferorder/updateCurrentTransferOrder', currentOrder.value);
    } else {
      searchedProduct.value = {};
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
    showToast(translate("Failed to add product to order"));
    searchedProduct.value = {};
  }
  queryString.value = '';
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

// check if product already exists in currentOrder
function isItemAlreadyInOrder(productId: string) {
  return currentOrder.value?.items?.some((item: any) => item.productId === productId)
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

// Discards the current transfer order by calling the cancel API and navigates to the transfer orders list.
async function discardOrder() {
  const alert = await alertController.create({
    header: translate('Discard order'),
    message: translate("Are you sure you want to discard this transfer order?"),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel',
      htmlAttributes: { 
        'data-testid': "discard-order-cancel-btn"
      }
    },
    {
      text: translate('Discard'),
      htmlAttributes: { 
        'data-testid': "discard-order-discard-btn"
      },
      handler: async () => {
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
    }]
  });
  return alert.present();
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
  try {
    const success = await approveOrder(currentOrder.value.orderId);    
    if(success) {
      router.replace({ path: '/transfer-orders' })
    }
  } catch (err) {
    logger.error('Failed to approve the transfer order to ship later', err);
  }
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
    const hasInvalidItem = currentOrder.value.items.some((item: any) => item.pickedQuantity <= 0);
    if(hasInvalidItem) {
      showToast(translate("Please enter a valid quantity for all items."));
      return;
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
    const resp = await TransferOrderService.createOutboundTransferShipment(params)
    if(!hasError(resp)) {
      shipmentId = resp.data.shipmentId;
      router.replace({ path: `/ship-transfer-order/${shipmentId}` })
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

ion-segment {
  grid-auto-columns: minmax(auto, 150px);
  width: auto;
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
