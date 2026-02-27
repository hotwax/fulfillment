<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="create-transfer-orders-back-btn" default-href="/transfer-orders" slot="start" />
        <ion-title>{{ translate("Create transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="isOrderLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Loading...") }}</ion-label>
      </div>
      <div v-else-if="currentOrder.statusId === 'ORDER_CREATED'">
        <div class="transfer-order">
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
                <ion-icon :icon="storefrontOutline" slot="start" />
                <ion-label>{{ getFacilityName(currentOrder.shipGroups?.[0]?.orderFacilityId) }}</ion-label>
                <ion-button data-testid="store-name-edit-btn" slot="end" color="medium" fill="outline" size="small" @click="openSelectFacilityModal">{{ translate("Edit") }}</ion-button>
              </ion-item>
              <ion-item>
                <ion-icon :icon="checkmarkDoneOutline" slot="start" />
                <ion-label>
                  {{ translate("Return to warehouse") }}
                  <p>{{ translate("Complete order on fulfillment") }}</p>
                </ion-label>
                <ion-toggle slot="end" data-testid="toggle-complete-on-fulfillment" :checked="currentOrder.statusFlowId === 'TO_Fulfill_Only'" @ionChange="toggleStatusFlow">
                </ion-toggle>
              </ion-item>
            </ion-list>
          </ion-card>

          <ion-card class="add-items">
            <div class="mode">
              <h5 class="ion-margin-horizontal">{{ translate("Add items") }}</h5>
              <ion-segment v-model="mode" @ionChange="segmentChange($event.target.value)">
                <ion-segment-button value="scan" content-id="scan">
                  <ion-icon :icon="barcodeOutline" />
                </ion-segment-button>
                <ion-segment-button :disabled="isForceScanEnabled" value="search" content-id="search">
                  <ion-icon :icon="searchOutline" />
                </ion-segment-button>
              </ion-segment>
            </div>
            <div v-show="mode === 'scan'">
              <ion-item lines="full">
                <ion-input ref="scanInput" v-model="queryString" :label="translate('Scan barcode')" :placeholder="barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier" @ionBlur="isScanningEnabled = false" @ionFocus="isScanningEnabled = true" @keyup.enter="queryString = $event.target.value; scanProduct()" />
              </ion-item>
              <ion-item lines="none" v-if="searchedProduct.productId">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" :key="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ getProductIdentificationValue(barcodeIdentifier, getProduct(searchedProduct.productId)) }}
                  <p>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) : getProduct(searchedProduct.productId)?.internalName }}</p>
                  <p v-if="getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) !== 'null'">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                </ion-label>
                <ion-icon v-if="!pendingProductIds.has(searchedProduct.productId)" :icon="checkmarkDoneOutline" color="success" slot="end" />
                <ion-spinner v-else name="crescent" slot="end" />
              </ion-item>

              <ion-item lines="none" v-else-if="searchedProduct.scannedId && !searchedProduct.productId">
                <ion-icon :icon="cloudOfflineOutline" slot="start" />
                <ion-label>
                  {{ searchedProduct.scannedId }} {{ translate("not found") }}
                  <p>{{ translate("Try searching using a keyword instead") }}</p>
                </ion-label>
                <ion-button size="small" slot="end" color="primary" @click="openAddProductModal">
                  <ion-icon slot="start" :icon="searchOutline" />
                  {{ translate("Search") }}
                </ion-button>
              </ion-item>

              <ion-item lines="none" v-else-if="!isScanningEnabled">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg />
                </ion-thumbnail>
                <ion-label>
                  {{ translate("Your scanner isn’t focused yet.") }}
                  <p>{{ translate("Scanning is set to") }} {{ barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier }}</p>
                  <p v-if="barcodeIdentifier !== 'SKU'">{{ translate("Swap to SKU from the settings page") }}</p>
                </ion-label>
                <ion-button slot="end" color="warning" size="small" @click="enableScan">
                  <ion-icon slot="start" :icon="locateOutline" />
                  {{ translate("Focus scanning") }}
                </ion-button>
              </ion-item>

              <ion-item lines="none" v-else>
                <ion-thumbnail slot="start">
                  <DxpShopifyImg />
                </ion-thumbnail>
                <ion-label>
                  {{ translate("Begin scanning products to add them to this transfer") }}
                  <p>{{ translate("Scanning is set to") }} {{ barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier }}</p>
                  <p v-if="barcodeIdentifier !== 'SKU'">{{ translate("Swap to SKU from the settings page") }}</p>
                </ion-label>
                <ion-badge slot="end" color="success">{{ translate("start scanning") }}</ion-badge>
              </ion-item>
            </div>
            <div v-show="mode === 'search'">
              <ion-searchbar data-testid="search-product-input" ref="searchInput" v-model="queryString" :placeholder="translate('Search')" @ionClear="clearSearch" />

              <ion-item lines="none" v-if="isSearchingProduct">
                <ion-spinner name="crescent" />
              </ion-item>

              <ion-list lines="none" v-else-if="searchedProduct.productId">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg :src="searchedProduct.mainImageUrl" :key="searchedProduct.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) : getProduct(searchedProduct.productId)?.internalName }}
                    <p v-if="getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) !== 'null'">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                  </ion-label>
                  <template v-if="!productQueue.isProductInOrder(searchedProduct.productId)">
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

              <ion-list lines="none" v-else-if="queryString">
                <ion-item>
                  <ion-icon :icon="cloudOfflineOutline" slot="start" />
                  <ion-label>
                    {{ translate("No product found") }}
                    <p>{{ translate("Try a different keyword") }}</p>
                  </ion-label>
                </ion-item>
              </ion-list>

              <ion-item lines="none" v-else>
                <ion-icon :icon="shirtOutline" slot="start" />
                {{ translate("Search for products by their Parent name, SKU or UPC") }}
              </ion-item>
            </div>
          </ion-card>
        </div>

        <div class="ion-text-center" v-if="!currentOrder.items?.length">
          <p>{{ translate("Add items to this transfer by scanning or searching for products using keywords") }}</p>
          <ion-button class="ion-margin-end" :color="mode === 'scan' ? 'primary' : 'medium'" :fill="mode === 'scan' ? 'solid' : 'outline'" @click="enableScan">
            <ion-icon :icon="barcodeOutline" slot="start" />
            {{ translate("Start scanning") }}
          </ion-button>
          <ion-button :disabled="isForceScanEnabled" :color="mode === 'search' ? 'primary' : 'medium'" :fill="mode === 'search' ? 'solid' : 'outline'" @click="enableSearch">
            <ion-icon :icon="searchOutline" slot="start" />
            {{ translate("Search products") }}
          </ion-button>
        </div>
        <div v-else>
          <h1 class="ion-padding">{{ translate("Transfer items") }}</h1>
          <TransferOrderItem v-for="item in currentOrder.items" :key="item.productId" :itemDetail="item" :lastScannedId="lastScannedId" orderStatus="created" />
        </div>
      </div>
      <div v-else class="empty-state">
        <ion-label>{{ translate("No order found") }}</ion-label>
      </div>
    </ion-content>
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
import { ref, computed, watch, nextTick } from "vue";
import { IonPage, IonHeader, IonToolbar, IonBackButton, IonTitle, IonContent, IonCard, IonList, IonItem, IonInput, IonLabel, IonButton, IonIcon, IonToggle, IonSegment, IonSegmentButton, IonThumbnail, IonBadge, IonSearchbar, IonSpinner, IonFooter, IonButtons, onIonViewWillEnter, alertController, modalController, onIonViewWillLeave } from "@ionic/vue";
import { barcodeOutline, checkmarkDoneOutline, checkmarkCircle, cloudOfflineOutline, locateOutline, searchOutline, shirtOutline, storefrontOutline } from "ionicons/icons";
import emitter from "@/event-bus";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import router from "@/router";
import { DxpShopifyImg, getProductIdentificationValue, useProductIdentificationStore, translate } from "@hotwax/dxp-components";
import { ProductService } from "@/services/ProductService";
import { StockService } from "@/services/StockService";
import { hasError } from "@/adapter";
import logger from "@/logger";
import { commonUtil } from "@/utils/commonUtil";
import { TransferOrderService } from "@/services/TransferOrderService";
import { UtilService } from "@/services/UtilService";
import { OrderService } from "@/services/OrderService";
import TransferOrderItem from "@/components/TransferOrderItem.vue";
import AddProductModal from "@/components/AddProductModal.vue";
import SelectFacilityModal from "@/components/SelectFacilityModal.vue";
import { useProductQueue } from "@/composables/useProductQueue";
import { searchProducts } from "@/adapter";
import { useProductStore } from "@/store/product";
import { useTransferOrderStore } from "@/store/transferorder";
import { useUtilStore } from "@/store/util";

const route = useRoute();
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

const productQueue = useProductQueue();
const { pendingProductIds } = productQueue;

const mode = ref("scan");
const queryString = ref("");
const isOrderLoading = ref(false);
const isSearchingProduct = ref(false);
const searchedProduct = ref({}) as any;
const isScanningEnabled = ref(false);
const lastScannedId = ref("");
const scanInput = ref("") as any;
const searchInput = ref("") as any;
let timeoutId: any = null;
const productSearchCount = ref(0);
const facilities = ref([]) as any;
const preventLeave = ref(false);
const barcodeIdentificationDesc = ref({}) as any;

const barcodeIdentifier = computed(() => useUtilStore().getBarcodeIdentificationPref);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const currentOrder = computed(() => useTransferOrderStore().getCurrent);
const isForceScanEnabled = computed(() => useUtilStore().isForceScanEnabled);

watch(queryString, (value) => {
  if (mode.value === "scan") return;
  const searchedString = value?.trim();

  if (timeoutId) clearTimeout(timeoutId);
  if (!searchedString) {
    isSearchingProduct.value = false;
    searchedProduct.value = {};
    return;
  }

  isSearchingProduct.value = true;
  timeoutId = setTimeout(() => {
    findProduct(searchedString);
  }, 800);
}, { deep: true });

onIonViewWillEnter(async () => {
  isOrderLoading.value = true;
  emitter.on("clearSearchedProduct", clearSearchedProduct as any);
  const isValidOrder = await fetchTransferOrderDetail(route?.params?.orderId as string);
  if (isValidOrder) {
    await productQueue.fetchProductInformation();
    await fetchBarcodeIdentificationDesc();
    facilities.value = await UtilService.fetchProductStoreFacilities();
  }
  isOrderLoading.value = false;
});

onBeforeRouteLeave(async () => {
  if (preventLeave.value || currentOrder.value.statusId !== "ORDER_CREATED") return true;

  let canLeave = false;
  const alert = await alertController.create({
    header: translate("Discard order"),
    message: translate("Are you sure you want to discard this transfer order?"),
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel",
        htmlAttributes: {
          "data-testid": "discard-order-cancel-btn"
        },
        handler: () => {
          canLeave = false;
        }
      },
      {
        text: translate("Discard"),
        htmlAttributes: {
          "data-testid": "discard-order-discard-btn"
        },
        handler: async () => {
          const orderId = currentOrder.value.orderId;
          let resp;

          try {
            if (!currentOrder.value?.items?.length) {
              const payload = { orderId, statusId: "ORDER_CANCELLED" };
              resp = await OrderService.updateOrderHeader(payload);
            } else {
              resp = await TransferOrderService.cancelTransferOrder(orderId);
            }

            if (!hasError(resp)) {
              commonUtil.showToast(translate("Order discarded successfully"));
              canLeave = true;
              alertController.dismiss();
            } else {
              throw resp.data;
            }
          } catch (err) {
            logger.error("Failed to discard order", err);
            commonUtil.showToast(translate("Failed to discard order"));
            canLeave = false;
          }
        }
      }
    ]
  });

  await alert.present();
  await alert.onDidDismiss();
  return canLeave;
});

const clearSearchedProduct = () => {
  searchedProduct.value = {};
  queryString.value = "";
};

onIonViewWillLeave(() => {
  emitter.off("clearSearchedProduct", clearSearchedProduct as any);
  productQueue.clearQueue();
});

async function fetchTransferOrderDetail(orderId: string) {
  try {
    const orderResp = await TransferOrderService.fetchTransferOrderDetail(orderId);
    if (!hasError(orderResp) && Object.keys(orderResp.data?.order).length) {
      const order = orderResp.data.order;
      if (order.statusId !== "ORDER_CREATED") {
        await useTransferOrderStore().updateCurrentTransferOrder(order);
        return false;
      }

      if (order.items && order.items.length) {
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
        order.items = items.map((item: any) => item.value);
      } else {
        order.items = [];
      }

      await useTransferOrderStore().updateCurrentTransferOrder(order);
      return true;
    } else {
      throw orderResp.data;
    }
  } catch (error) {
    logger.error("Error fetching transfer order details:", error);
  }
  return false;
}

async function fetchBarcodeIdentificationDesc() {
  try {
    const resp = await ProductService.fetchBarcodeIdentificationDesc({ parentTypeId: "HC_GOOD_ID_TYPE" });

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
        name: "orderName",
        value: currentOrder.value?.orderName || "",
        placeholder: translate("Enter order name"),
        attributes: {
          "data-testid": "edited-order-name-input"
        }
      }
    ],
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel",
        htmlAttributes: {
          "data-testid": "cancel-editting-transfer-order-name-btn"
        }
      },
      {
        text: translate("Save"),
        htmlAttributes: {
          "data-testid": "save-edited-transfer-order-name-btn"
        },
        handler: async (data: any) => {
          const updatedOrderName = (data.orderName || "").trim();
          const currentOrderName = (currentOrder.value?.orderName || "").trim();

          if (!updatedOrderName) {
            commonUtil.showToast(translate("Please enter a valid order name"));
            return false;
          }
          if (currentOrderName === updatedOrderName) {
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
  const updatedStatusFlowId = event.detail.checked ? "TO_Fulfill_Only" : "TO_Fulfill_And_Receive";
  await updateOrderProperty("statusFlowId", updatedStatusFlowId);
}

async function updateOrderProperty(property: string, value: any) {
  try {
    const payload = {
      orderId: currentOrder.value.orderId,
      [property]: value
    };

    const resp = await OrderService.updateOrderHeader(payload);

    if (!hasError(resp)) {
      await useTransferOrderStore().updateCurrentTransferOrder({
        ...currentOrder.value,
        [property]: value
      });

      property === "orderName" ? commonUtil.showToast(translate("Order name updated successfully")) : commonUtil.showToast(translate("Order flow updated successfully"));
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(`Failed to update order ${property}`, err);
    property === "orderName" ? commonUtil.showToast(translate("Failed to update order name")) : commonUtil.showToast(translate("Failed to update order flow"));
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
    if (result.data?.selectedFacilityId) {
      await updateOrderFacility(result.data?.selectedFacilityId);
    }
  });

  await addressModal.present();
}

async function updateOrderFacility(facilityId: string) {
  const shipGroup = currentOrder.value?.shipGroups?.[0];

  const payload = {
    orderId: currentOrder.value.orderId,
    orderFacilityId: facilityId,
    shipGroupSeqId: shipGroup?.shipGroupSeqId
  };

  try {
    const resp = await OrderService.updateOrderFacility(payload);
    if (!hasError(resp)) {
      if (shipGroup) shipGroup.orderFacilityId = facilityId;
      await useTransferOrderStore().updateCurrentTransferOrder(currentOrder.value);
      commonUtil.showToast(translate("Store name updated successfully"));
    } else {
      throw resp.data;
    }
  } catch (error) {
    logger.error("Failed to update destination facility", error);
    commonUtil.showToast(translate("Failed to update store"));
  }
}

function clearQuery() {
  queryString.value = "";
  searchedProduct.value = {};
}

async function enableScan() {
  mode.value = "scan";
  isScanningEnabled.value = true;
  setTimeout(() => {
    scanInput.value?.$el.setFocus?.();
  }, 0);
}

async function enableSearch() {
  mode.value = "search";
  await nextTick();
  searchInput.value?.$el.setFocus?.();
  isScanningEnabled.value = false;
}

function segmentChange(modeValue: string) {
  clearQuery();
  modeValue === "search" ? enableSearch() : isScanningEnabled.value = false;
}

async function openAddProductModal() {
  const addProductModal = await modalController.create({
    component: AddProductModal,
    componentProps: {
      query: searchedProduct.value.scannedId || queryString.value,
      addProductToQueue: productQueue.addProductToQueue,
      isProductInOrder: productQueue.isProductInOrder,
      pendingProductIds: productQueue.pendingProductIds.value
    }
  });

  addProductModal.onDidDismiss().then(async () => {
    queryString.value = "";
  });
  await addProductModal.present();
}

function getFacilityName(facilityId: string) {
  const facility = facilities.value.find((facility: any) => facility.facilityId === facilityId);
  return facility ? facility.facilityName || facility.facilityId : facilityId;
}

async function scanProduct() {
  const scannedId = queryString.value?.trim();
  if (!scannedId) return;
  queryString.value = "";

  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  isSearchingProduct.value = true;
  const productFound: any = await findProduct(scannedId);
  if (productFound) {
    await addProductViaQueue(productFound, scannedId);
  }
}

async function addProductViaQueue(product: any, scannedId?: string) {
  if (!product?.productId) return;

  const alreadyAdded = findAndScrollToExisting(scannedId, product.productId);
  if (alreadyAdded) {
    queryString.value = "";
    return;
  }

  const itemToAdd = {
    product: product,
    orderId: currentOrder.value.orderId,
    facilityId: currentOrder.value.shipGroups?.[0]?.facilityId,
    scannedId: scannedId,
    onSuccess: (product: any, newItem: any) => {
      if (scannedId) {
        searchedProduct.value = { ...newItem, productId: product.productId };
      } else {
        searchedProduct.value = {};
        queryString.value = "";
      }
    },
    onError: (product: any, error: any) => {
      searchedProduct.value = {};
      logger.error(`Failed to add product ${product.productId}:`, error);
    }
  };

  productQueue.addProductToQueue(itemToAdd);
}

async function addSearchedOrderItem() {
  const productId = searchedProduct.value?.productId;
  if (!productId) return;
  const product = getProduct(productId);
  await addProductViaQueue(product);
}

async function findProduct(value: string) {
  if (!value) {
    isSearchingProduct.value = false;
    return null;
  }

  try {
    const payload: any = {
      filters: {},
      viewSize: 1
    };

    if (mode.value === "scan") {
      payload.filters["goodIdentifications"] = { value: `${barcodeIdentifier.value}/${value}` };
    } else {
      payload.keyword = value;
    }
    const resp = await searchProducts(payload);

    if (resp.total) {
      productSearchCount.value = resp.total;
      const item = resp.products[0];
      useProductStore().addProductToCached(item);
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

async function fetchStock(productId: string) {
  try {
    const resp: any = await StockService.getInventoryAvailableByFacility({
      productId,
      facilityId: commonUtil.getCurrentFacilityId()
    });
    if (!hasError(resp)) return resp.data;
  } catch (err) {
    logger.error(err);
  }
  return null;
}

function findAndScrollToExisting(identifier?: string, productId?: string) {
  const items = currentOrder.value.items || [];
  const existing = items.find((item: any) => {
    if (productId && item.productId === productId) return true;
    const idVal = item.scannedId ? item.scannedId : getProductIdentificationValue(barcodeIdentifier.value, getProduct(item.productId));
    return identifier && idVal === identifier;
  });

  if (existing) {
    scrollToProduct(existing);
    return true;
  }
  return false;
}

function scrollToProduct(item: any) {
  lastScannedId.value = item.scannedId ? item.scannedId : getProductIdentificationValue(barcodeIdentifier.value, getProduct(item.productId));
  const el = document.getElementById(item.scannedId ? item.scannedId : getProductIdentificationValue(barcodeIdentifier.value, getProduct(item.productId)));
  if (el) el.scrollIntoView({ behavior: "smooth" });
  setTimeout(() => lastScannedId.value = "", 3000);
}

function clearSearch() {
  queryString.value = "";
  searchedProduct.value = {};
}

function hasInvalidPickedQuantity() {
  return currentOrder.value.items.some((item: any) => !item.pickedQuantity || item.pickedQuantity <= 0);
}

async function approveOrder(orderId: string) {
  try {
    const resp = await TransferOrderService.approveTransferOrder(orderId);
    if (!hasError(resp)) {
      currentOrder.value.statusId = "ORDER_APPROVED";
      await useTransferOrderStore().updateCurrentTransferOrder(currentOrder.value);
      return true;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to approve the transfer order", err);
    return false;
  }
}

async function shiplater() {
  const message = translate("Save this order without tracking details to ship later.");
  const alert = await alertController.create({
    header: translate("Ship later"),
    message,
    buttons: [
      {
        text: translate("Go back"),
        role: "cancel",
        htmlAttributes: {
          "data-testid": "shiplater-goback-btn"
        }
      },
      {
        text: translate("Continue"),
        htmlAttributes: {
          "data-testid": "shiplater-continue-btn"
        },
        handler: async () => {
          preventLeave.value = true;
          const success = await approveOrder(currentOrder.value.orderId);
          if (success) {
            router.replace({ path: "/transfer-orders" });
          } else {
            preventLeave.value = false;
            commonUtil.showToast(translate("Failed to approve the transfer order to ship later."));
          }
        }
      }
    ]
  });
  return alert.present();
}

async function packAndShipOrder() {
  let shipmentId;
  try {
    if (currentOrder.value.statusId === "ORDER_CREATED") {
      const success = await approveOrder(currentOrder.value.orderId);
      if (!success) {
        commonUtil.showToast(translate("Order approval failed"));
        return;
      }
    }

    const packages = [{
      items: currentOrder.value.items.map((item: any) => ({
        orderItemSeqId: item.orderItemSeqId,
        productId: item.productId,
        quantity: parseInt(item.pickedQuantity),
        shipGroupSeqId: item.shipGroupSeqId
      }))
    }];

    const params = {
      payload: {
        orderId: currentOrder.value.orderId,
        packages
      }
    };
    preventLeave.value = true;

    const resp = await TransferOrderService.createOutboundTransferShipment(params);
    if (!hasError(resp)) {
      shipmentId = resp.data.shipmentId;
      router.replace({ path: `/ship-transfer-order/${shipmentId}` });
    } else {
      throw resp.data;
    }
  } catch (error) {
    preventLeave.value = false;
    logger.error(error);
    commonUtil.showToast(translate("Failed to create shipment"));
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

.order-items {
  padding: var(--spacer-base);
}
</style>
