<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/transfer-orders" />
        <ion-title>{{ translate("Create transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter-content">
      <div class="find">
        <section class="search">
          <ion-item>
            <ion-input :label="translate('Transfer name')" :placeholder="translate('name')" v-model="currentOrder.name" />
          </ion-item>
        </section>

        <aside class="to-filters">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Assign") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-icon :icon="sendOutline" slot="start" />
              <ion-label>{{ translate("Origin") }}</ion-label>
              <ion-label slot="end">{{ getFacilityName(currentOrder.originFacilityId) ? getFacilityName(currentOrder.originFacilityId) : currentOrder.originFacilityId }}</ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-icon :icon="downloadOutline" slot="start" />
              <ion-label>{{ translate("Destination") }}</ion-label>
              <template v-if="currentOrder.destinationFacilityId" slot="end">
                <ion-chip outline @click="openSelectFacilityModal()">
                  {{ getFacilityName(currentOrder.destinationFacilityId) ? getFacilityName(currentOrder.destinationFacilityId) : currentOrder.destinationFacilityId }}
                </ion-chip>
              </template>
              <ion-button v-else slot="end" fill="outline" @click="openSelectFacilityModal()">
                <ion-icon slot="start" :icon="addCircleOutline" />
                <ion-label>{{ translate("Assign") }}</ion-label>
              </ion-button>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Shipping Method") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-select :label="translate('Carrier')" :placeholder="translate('Select')" v-model="currentOrder.carrierPartyId" interface="popover" @ionChange="selectUpdatedMethod()">
                <ion-select-option :value="carrierPartyId" v-for="(carrierPartyId, index) in Object.keys(shipmentMethodsByCarrier)" :key="index">{{ getCarrierDesc(carrierPartyId) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Method')" :placeholder="translate('Select')" v-model="currentOrder.shipmentMethodTypeId" v-if="getCarrierShipmentMethods()?.length" interface="popover">
                <ion-select-option :value="shipmentMethod.shipmentMethodTypeId" v-for="(shipmentMethod, index) in getCarrierShipmentMethods()" :key="index">{{ shipmentMethod.description ? shipmentMethod.description : shipmentMethod.shipmentMethodTypeId }}</ion-select-option>
              </ion-select>
              <template v-else>
                <ion-icon :icon="informationCircleOutline" slot="start" />
                <ion-label>{{ translate("No shipment methods found") }}</ion-label>
              </template>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Plan") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ translate("Ship Date") }}</ion-label>
              <ion-button slot="end" class="date-time-button" @click="openDateTimeModal('shipDate')">{{ currentOrder.shipDate ? formatDateTime(currentOrder.shipDate) : translate("Select date") }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Delivery Date") }}</ion-label>
              <ion-button slot="end" class="date-time-button" @click="openDateTimeModal('deliveryDate')">{{ currentOrder.deliveryDate ? formatDateTime(currentOrder.deliveryDate) : translate("Select date") }}</ion-button>
            </ion-item>
          </ion-card>

          <ion-item>
            <ion-icon :icon="cloudUploadOutline" slot="start" />
            <ion-label>
              {{ translate("Import items CSV") }}
              <p @click="downloadSampleCsv()">
                <a>{{ translate("Download example") }}</a>
              </p>
            </ion-label>
            <input @change="parse" ref="file" class="ion-hide" type="file" id="updateProductFile" :key="fileUploaded.toString()"/>
            <label for="updateProductFile" class="pointer">{{ translate("Upload") }}</label>
          </ion-item>
        </aside>

        <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="closeDateTimeModal">
          <ion-content force-overscroll="false">
            <ion-datetime 
              :value="currentOrder[selectedDateFilter] ? currentOrder[selectedDateFilter] : DateTime.now().toISO()"
              show-clear-button
              show-default-buttons
              presentation="date"
              :min="currentOrder.shipDate"
              :max="currentOrder.deliveryDate" 
              @ionChange="updateDateTimeFilter($event.detail.value)"
            />
          </ion-content>
        </ion-modal>

        <main>
          <div class="item-search">
            <ion-item>
              <ion-icon slot="start" :icon="listOutline"/>
              <ion-input ref="addProductInput" :label="translate('Add product')" label-placement="floating" :clear-input="true" v-model="queryString" :placeholder="translate('Search product')" @keyup.enter="isScanningEnabled ? scanProduct(queryString) : addProductToOrder()" />
              <ion-button fill="outline" @click="toggleScan()">
                <ion-icon slot="start" :icon="isScanningEnabled? stopOutline : cameraOutline" />
                {{ isScanningEnabled ? translate("Stop scanning") :translate("Scan") }}
              </ion-button>
            </ion-item>
            <ion-item lines="none" v-if="isSearchingProduct">
              <ion-spinner color="secondary" name="crescent"></ion-spinner>
            </ion-item>
            <ion-item lines="none" v-else-if="searchedProduct.productId">
              <ion-thumbnail slot="start" v-image-preview="getProduct(searchedProduct.productId)">
                <Image :src="getProduct(searchedProduct.productId).mainImageUrl"/>
              </ion-thumbnail>
              <ion-label>
                <p class="overline">{{ translate("Search result") }}</p>
                {{ searchedProduct.internalName || searchedProduct.sku || searchedProduct.productId }}
              </ion-label>
              <ion-button size="default" slot="end" fill="clear" @click="addProductToOrder" :color="isProductAvailableInOrder() ? 'success' : 'primary'">
                <ion-icon slot="icon-only" :icon="isProductAvailableInOrder() ? checkmarkCircle : addCircleOutline"/>
              </ion-button>
            </ion-item>
            <p v-else-if="queryString">{{ translate("No product found") }}</p>
          </div>

          <hr />

          <template v-if="currentOrder.items?.length">
            <div class="list-item ion-padding-vertical">
              <ion-item lines="none" class="item-qty-actions" style="grid-column: span 2;">
                <ion-button fill="outline" color="medium" @click="updateBulkOrderItemQuantity('bookQOH')">{{ translate("Book QoH") }}</ion-button>
                <ion-button fill="outline" color="medium" @click="updateBulkOrderItemQuantity('bookATP')">{{ translate("Book ATP") }}</ion-button>
                <ion-button fill="outline" color="medium" @click="updateBulkOrderItemQuantity('customQty')">{{ translate("Custom Qty") }}</ion-button>
              </ion-item>
              <div></div>
              <div class="tablet">
                <ion-checkbox :modelValue="isEligibleForBulkAction()" @ionChange="toggleBulkSelection($event.detail.checked)" />
              </div>
              <ion-button slot="end" fill="clear" color="medium" :disabled="!isEligibleForBulkAction()" @click="openOrderItemActionsPopover($event, null, true)">
                <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
              </ion-button>
            </div>

            <div class="list-item" v-for="(item, index) in currentOrder.items" :key="index">
              <ion-item lines="none">
                <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)">
                  <Image :src="getProduct(item.productId)?.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ item.scannedId ? item.scannedId : getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                  <p>{{ item.isMatching ? translate("Matching...") : item.noMatchFound ? translate("no match found") : getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                </ion-label>
              </ion-item>
              <template v-if="item.isMatching || item.noMatchFound">
                <div></div>
                <div></div>
                <div class="ion-margin-end">
                  <ion-button fill="clear" v-if="item.noMatchFound" @click="openMatchProductModal(item)">
                    <ion-label>{{ translate("Match product") }}</ion-label>
                  </ion-button>
                </div>
              </template>
              <template v-else>
                <div class="tablet">
                  <ion-chip outline :color="isQOHAvailable(item) ? '' : 'warning'">
                    <ion-icon slot="start" :icon="sendOutline" />
                    <ion-label>{{ item.qoh }} {{ translate("QOH") }}</ion-label>
                  </ion-chip>
                </div>
                <ion-item>
                  <ion-input type="number" placeholder="Qty" v-model="item.quantity" />
                </ion-item>
                <div class="tablet">
                  <ion-checkbox v-model="item.isChecked" />
                </div>
              </template>
              <ion-button slot="end" fill="clear" color="medium" @click="openOrderItemActionsPopover($event, item)">
                <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
              </ion-button>
            </div>
          </template>
          <div v-else class="empty-state">
            <p>{{ translate("No item added to order") }}</p>
          </div>
        </main>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createOrder()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCheckbox, IonChip, IonContent, IonDatetime, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonModal, IonPage, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewDidEnter, alertController, modalController, popoverController } from '@ionic/vue';
import { addCircleOutline, cameraOutline, checkmarkCircle, checkmarkDoneOutline, cloudUploadOutline, downloadOutline, ellipsisVerticalOutline, informationCircleOutline, listOutline, sendOutline, stopOutline, storefrontOutline } from 'ionicons/icons';
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components'
import { computed, ref, watch } from "vue";
import { getDateWithOrdinalSuffix, jsonToCsv, parseCsv, showToast } from '@/utils';
import logger from '@/logger';
import { useStore } from 'vuex';
import Image from '@/components/Image.vue';
import TransferOrderItemActionsPopover from '@/components/TransferOrderItemActionsPopover.vue';
import SelectFacilityModal from '@/components/SelectFacilityModal.vue';
import ImportTOItemsCsvModal from '@/components/ImportTOItemsCsvModal.vue';
import { ProductService } from '@/services/ProductService';
import { UtilService } from '@/services/UtilService';
import { OrderService } from '@/services/OrderService';
import router from '@/router';
import { DateTime } from 'luxon';
import { hasError } from "@/adapter";
import emitter from '@/event-bus';
import { StockService } from '@/services/StockService';
import MatchProductModal from "@/components/MatchProductModal.vue";

const store = useStore();
const productIdentificationStore = useProductIdentificationStore();

let timeoutId = ref();
const isSearchingProduct = ref(false);
const searchedProduct = ref({}) as any;
const queryString = ref("");
const facilities = ref([]) as any;
const dateTimeModalOpen = ref(false);
const selectedDateFilter = ref("");
const currentOrder = ref({
  name: "",
  productStoreId: "",
  originFacilityId: "",
  destinationFacilityId: "",
  carrierPartyId: "",
  shipmentMethodTypeId: "", 
  items: []
}) as any;

let content = ref([]) as any 
let fileColumns = ref([]) as any 
let uploadedFile = ref({}) as any
let isScanningEnabled = ref(false)
const fileUploaded = ref(false);
const addProductInput = ref("") as any

const getProduct = computed(() => store.getters["product/getProduct"])
const getProducts = computed(() => store.getters["product/getProducts"])
const shipmentMethodsByCarrier = computed(() => store.getters["util/getShipmentMethodsByCarrier"])
const getCarrierDesc = computed(() => store.getters["util/getCarrierDesc"])
const sampleProducts = computed(() => store.getters["product/getSampleProducts"])
const barcodeIdentifier = computed(() => store.getters["util/getBarcodeIdentificationPref"])

// Implemented watcher to display the search spinner correctly. Mainly the watcher is needed to not make the findProduct call always and to create the debounce effect.
// Previously we were using the `debounce` property of ion-input but it was updating the searchedString and making other related effects after the debounce effect thus the spinner is also displayed after the debounce
// effect is completed.
watch(queryString, (value) => {
  if(isScanningEnabled.value) return;
  const searchedString = value.trim()

  if(searchedString?.length) {
    isSearchingProduct.value = true
  } else {
    searchedProduct.value = {}
    isSearchingProduct.value = false
  }

  if(timeoutId.value) {
    clearTimeout(timeoutId.value)
  }

  // Storing the setTimeoutId in a variable as watcher is invoked multiple times creating multiple setTimeout instance those are all called, but we only need to call the function once.
  timeoutId.value = setTimeout(() => {
    if(searchedString?.length) findProduct()
  }, 1000)

}, { deep: true })

onIonViewDidEnter(async () => {
  emitter.emit("presentLoader")
  currentOrder.value.productStoreId = useUserStore().getCurrentEComStore?.productStoreId
  currentOrder.value.originFacilityId = useUserStore().getCurrentFacility?.facilityId
  await Promise.allSettled([fetchFacilitiesByCurrentStore(), store.dispatch("util/fetchStoreCarrierAndMethods", currentOrder.value.productStoreId), store.dispatch("util/fetchCarriersDetail"), store.dispatch("product/fetchSampleProducts")])
  if(Object.keys(shipmentMethodsByCarrier.value)?.length) {
    currentOrder.value.carrierPartyId = Object.keys(shipmentMethodsByCarrier.value)[0]
    selectUpdatedMethod()
  }
  uploadedFile.value = {}
  content.value = []
  emitter.emit("dismissLoader")
})

async function parse(event: any) {
  let file = event.target.files[0];
  try {
    if (file) { 
      uploadedFile.value = file;
      content.value = await parseCsv(uploadedFile.value);
      fileColumns.value = Object.keys(content.value[0]);
      showToast(translate("File uploaded successfully"));
      fileUploaded.value =!fileUploaded.value; 
      openImportCsvModal();
    } else {
      showToast(translate("No new file upload. Please try again"));
    }
  } catch {
    content.value = []
    showToast(translate("Please upload a valid csv to continue"));
  }
}

async function findProductFromIdentifier(payload: any) {
  const productField = payload.productField
  const quantityField = payload.quantityField
  const idType = payload.idType
  const uploadedItemsByIdValue = {} as any;
  content.value.map((row: any) => {
    uploadedItemsByIdValue[row[productField]] = row
  })

  const idValues = Object.keys(uploadedItemsByIdValue);
  const productIdsAlreadyAddedInList = currentOrder.value.items.map((item: any) => item.productId)
  const filterString = (idType === 'productId') ? `${idType}: (${idValues.join(' OR ')})` : `goodIdentifications: (${idValues.map((value: any) => `${idType}/${value}`).join(' OR ')})`;

  try {
    const resp = await ProductService.fetchProducts({
      "filters": [filterString],
      "viewSize": idValues.length
    })

    if(!hasError(resp) && resp.data.response?.docs?.length) {
      const productsToAdd = resp.data.response.docs
      store.dispatch("product/addProductToCachedMultiple", { products: productsToAdd })
      const productsByIdValue = {} as any;
      productsToAdd.map((product: any) => {
        if(idType === "SKU") {
          productsByIdValue[product["sku"]] = product
        } else {
          const idValue = getProductIdentificationValue(idType, product)
          productsByIdValue[idValue] = product
        }
      })

      Object.entries(productsByIdValue).map(async ([idValue, product]) => {
        if(productIdsAlreadyAddedInList.includes(product.productId)) {
          if(quantityField) {
            const item = currentOrder.value.items.find((item: any) => item.productId === product.productId)
            item.quantity = Number(item.quantity) + (Number(uploadedItemsByIdValue[idValue][quantityField]) || 0)
          }
        } else {
          const stock = await fetchStock(product.productId);
          currentOrder.value.items.push({
            productId: product.productId,
            sku: product.sku,
            quantity: quantityField ? (Number(uploadedItemsByIdValue[idValue][quantityField]) || 0) : 0,
            isChecked: false,
            qoh: stock.quantityOnHandTotal || 0,
            atp: stock.availableToPromiseTotal || 0
          })
        }
      })
    } else {
      throw resp.data;
    }
  } catch(error) {
    logger.error(error)
    showToast(translate("Failed to add items to the order due to incorrect SKU mapping or invalid SKUs."))
  }
}

function toggleScan() {
  isScanningEnabled.value = !isScanningEnabled.value;
  isScanningEnabled.value ? addProductInput.value.$el.setFocus() : addProductInput.value.$el.blur();
}

async function addProductToOrder(scannedId?: any, product?: any) {
  if(!isScanningEnabled.value) {
    if(!searchedProduct.value.productId ||!queryString.value) return;
    if(isProductAvailableInOrder()) return;
  }

  let newProduct = { 
    productId: product ? product.productId :searchedProduct.value.productId,
    sku: product ? product.sku : searchedProduct.value.sku,
    quantity: 0,
    isChecked: false,
    isMatching: false,
    noMatchFound: false
  } as any;

  const stock = await fetchStock(newProduct.productId);
  if(stock?.quantityOnHandTotal || stock?.quantityOnHandTotal === 0) {
    newProduct = { ...newProduct, qoh: stock.quantityOnHandTotal, atp: stock.availableToPromiseTotal }
  }
  
  if(product) {
    currentOrder.value.items = currentOrder.value.items.map((item: any) => {
      if(item.scannedId === scannedId) {
        return newProduct;
      }
      return item;
    });
  } else {
    currentOrder.value.items.push(newProduct);
  }
}

// Updates the scanned product by checking if it already exists in the order and adding it if not
async function scanProduct(scannedItem: string) {
  // Check if the product already exists in the order
  const existingItem = currentOrder.value.items.some((item: any) => getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId)) === scannedItem);
  if(existingItem) {
    showToast(translate("Product already added to the order."));
    queryString.value = "";
    return;
  }

  let newProduct = { 
    scannedId: scannedItem,
    quantity: 0,
    isChecked: false,
    isMatching: true,
    noMatchFound: true
  } as any;

  currentOrder.value.items.push(newProduct);
  await findProduct();
}

// Validates the scanned product by checking if it matches any product in the cachedProducts and updating the order accordingly
async function validateScannedProduct() {
  queryString.value = "";
  const itemsWithNoMatch = currentOrder.value.items.filter((item: any) => item.noMatchFound);
  const allProducts = Object.values(getProducts.value);

  for(const item of itemsWithNoMatch) {
    const matchedProduct = allProducts.find((product: any) => getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(product.productId)) === item.scannedId);
    // If a matched product is found, call addProductToOrder
    if(matchedProduct) {
      await addProductToOrder(item.scannedId, matchedProduct);
    } else {
      // If no match found, set the noMatchFound flag for the scanned item
      currentOrder.value.items = currentOrder.value.items.map((existingItem: any) => {
        if(existingItem.scannedId === item.scannedId) {
          return { ...existingItem, isMatching: false, noMatchFound: true };
        }
        return existingItem;
      });
    }
  }
}

async function openMatchProductModal(currentItem: any) {
  const addProductModal = await modalController.create({
    component: MatchProductModal,
    componentProps: { items: currentOrder.value.items },
    showBackdrop: false,
  });

  addProductModal.onDidDismiss().then(async (result) => {
    if(result.data?.selectedProduct) {
      await addProductToOrder(currentItem.scannedId, result.data.selectedProduct);
    }
  })

  addProductModal.present();
}

function selectUpdatedMethod() {
  const shipmentMethods = getCarrierShipmentMethods()
  if(shipmentMethods?.length) currentOrder.value.shipmentMethodTypeId = shipmentMethods[0]?.shipmentMethodTypeId
}

function isQOHAvailable(item: any) {
  return item.qoh && Number(item.qoh) > Number(item.quantity)
}

function getCarrierShipmentMethods() {
  return currentOrder.value.carrierPartyId && shipmentMethodsByCarrier.value[currentOrder.value.carrierPartyId]
}

async function fetchFacilitiesByCurrentStore() {
  let availableFacilities = [];

  try {
    const resp = await UtilService.fetchFacilities({
      inputFields: {
        productStoreId: currentOrder.value.productStoreId,
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_op: "notEqual",
        parentFacilityTypeId: "VIRTUAL_FACILITY",
        parentFacilityTypeId_op: "notEqual"
      },
      fieldList: ["facilityId", "facilityName"],
      viewSize: 200,
      entityName: "FacilityAndProductStore"
    })

    if(!hasError(resp)) {
      availableFacilities = resp.data.docs
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error);
  }
  facilities.value = availableFacilities
}

function getFacilityName(facilityId: any) {
  return facilities.value.find((facility: any) => facility.facilityId === facilityId)?.facilityName
}

async function updateBulkOrderItemQuantity(action: any) {
  if(!isEligibleForBulkAction()) {
    showToast(translate("No order item is selected for bulk action."))
    return;
  }

  if(action === "bookQOH" || action === "bookATP") {
    currentOrder.value.items.map((item: any) => {
      if(item.isChecked) {
        item.quantity = (action === "bookQOH") ? item.qoh : item.atp
      }
    })
  } else if(action === "customQty") {
    const alert = await alertController.create({
      header: translate("Custom Qty"),
      buttons: [{
        text: translate("Cancel"),
        role: "cancel"
      }, {
        text: translate("Save"),
        handler: async (data: any) => {
          if(!data?.quantity) return false;
          const customQty = Number(data.quantity);
          currentOrder.value.items.map((item: any) => {
            if(item.isChecked) {
              item.quantity = customQty
            }
          }) 
        }
      }],
      inputs: [{
        name: "quantity",
        placeholder: translate("ordered quantity"),
        min: 0,
        type: "number"
      }]
    })
    alert.present()
  }
}

async function createOrder() {
  if(!currentOrder.value.items?.length) {
    showToast(translate("Please add atleast one item in the order."));
    return;
  }

  if(!currentOrder.value.name.trim()) {
    showToast(translate("Please give some valid transfer order name."))
    return;
  }

  if(!currentOrder.value.productStoreId || !currentOrder.value.originFacilityId || !currentOrder.value.destinationFacilityId || !currentOrder.value.carrierPartyId || !currentOrder.value.shipmentMethodTypeId) {
    showToast(translate("Please select all the required properties assigned to the order."))
    return;
  }

  if(currentOrder.value.originFacilityId === currentOrder.value.destinationFacilityId) {
    showToast(translate("Origin and destination facility can't be same."))
    return;
  }


  const isItemQuantityInvalid = currentOrder.value.items.some((item: any) => !Number(item.quantity) || Number(item.quantity) < 0)
  if(isItemQuantityInvalid) {
    showToast(translate("Order items must have a valid ordered quantity."))
    return;
  }

  const productIds = currentOrder.value.items?.map((item: any) => item.productId);
  const productAverageCostDetail = await ProductService.fetchProductsAverageCost(productIds, currentOrder.value.originFacilityId)

  const order = {
    orderName: currentOrder.value.name.trim(),
    orderTypeId: "TRANSFER_ORDER",
    customerId: "COMPANY",
    statusId: "ORDER_CREATED",
    productStoreId: currentOrder.value.productStoreId,
    statusFlowId: "FULFILL_AND_RECEIVE",
    shipGroup: [{
      shipGroupSeqId: "00001",
      facilityId: currentOrder.value.originFacilityId,
      orderFacilityId: currentOrder.value.destinationFacilityId,
      carrierPartyId: currentOrder.value.carrierPartyId,
      shipmentMethodTypeId: currentOrder.value.shipmentMethodTypeId,
      estimatedShipDate: currentOrder.value.shipDate ? DateTime.fromISO(currentOrder.value.shipDate).toFormat("yyyy-mm-dd 23:59:59.000") : "",
      estimatedDeliveryDate: currentOrder.value.deliveryDate ? DateTime.fromISO(currentOrder.value.deliveryDate).toFormat("yyyy-mm-dd 23:59:59.000") : "",
      items: currentOrder.value.items.map((item: any) => {
        return {
          productId: item.productId,
          sku: item.sku,
          status: "ITEM_CREATED",
          quantity: Number(item.quantity),
          unitPrice: productAverageCostDetail[item.productId] || 0.00
        }
      })
    }]
  } as any;

  let grandTotal = 0;
  order.shipGroup[0].items.map((item: any) => {
    grandTotal += Number(item.quantity) * Number(item.unitPrice)
  })
  order["grandTotal"] = grandTotal

  const addresses = await store.dispatch("util/fetchFacilityAddresses", [currentOrder.value.originFacilityId, currentOrder.value.destinationFacilityId])
  
  addresses.map((address: any) => {
    if(address.facilityId === currentOrder.value.originFacilityId) {
      order.shipGroup[0].shipFrom = {
        postalAddress: {
          id: address.contactMechId
        }
      }
    }
    if(address.facilityId === currentOrder.value.destinationFacilityId) {
      order.shipGroup[0].shipTo = {
        postalAddress: {
          id: address.contactMechId
        }
      }
    }
  })

  try {
    const resp = await OrderService.createOrder({ order })
    if(!hasError(resp) && resp.data?.orderId) {
      const orderId = resp.data.orderId
      const isApproved = await OrderService.approveOrder({ orderId })
      if(!isApproved) {
        router.replace("/transfer-orders");
        const toast = await showToast(translate("Order is created successfully, but approval failed. Please contact administrator.", { orderId }), { canDismiss: true, manualDismiss: true })
        toast?.present();
        return;
      }
      router.replace(`/transfer-order-details/${orderId}`)
      showToast(translate("Transfer order created successfully."))
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error)
    showToast(translate("Failed to create order."))
  }
}

function toggleBulkSelection(isChecked: any) {
  currentOrder.value.items.map((item: any) => item.isChecked = isChecked)
}

function isEligibleForBulkAction() {
  return currentOrder.value.items?.some((item: any) => item.isChecked)
}

async function openOrderItemActionsPopover(event: any, selectedItem: any, isBulkOperation = false){
  const popover = await popoverController.create({
    component: TransferOrderItemActionsPopover,
    componentProps: { item: selectedItem },
    event,
    showBackdrop: false,
  });

  popover.onDidDismiss().then((result: any) => {
    const action = result.data?.action

    if(action === "bookQOH" || action === "bookATP") {
      if(isBulkOperation) {
        currentOrder.value.items.map((item: any) => {
          if(item.isChecked) {
            item.quantity = (action === "boolean") ? item.qoh : item.atp
          }
        })
      } else {
        selectedItem.quantity = (action === "bookQOH") ? selectedItem.qoh : selectedItem.atp
      }
    } else if(action === "remove") {
      currentOrder.value.items = isBulkOperation ? currentOrder.value.items.filter((item: any) => !item.isChecked) : selectedItem.noMatchFound ? currentOrder.value.items.filter((item: any) => item.scannedId !== item.scannedId) : currentOrder.value.items.filter((item: any) => selectedItem.productId !== item.productId)
    }
  })

  await popover.present();
}

async function openImportCsvModal() {
  const importCsvModal = await modalController.create({
    component: ImportTOItemsCsvModal,
    componentProps: {
      fileColumns: fileColumns.value,
      content: content.value
    }
  })
  importCsvModal.onDidDismiss().then((result: any) => {
    if (result?.data?.identifierData && Object.keys(result?.data?.identifierData).length) {
      findProductFromIdentifier(result.data.identifierData)
    }
  })
  importCsvModal.present();
}

function downloadSampleCsv() {
  jsonToCsv(sampleProducts.value, {
    download: true,
    name: "Sample CSV.csv"
  })
}

async function openSelectFacilityModal() {
  const addressModal = await modalController.create({
    component: SelectFacilityModal,
    componentProps: { selectedFacilityId: currentOrder.value.destinationFacilityId, facilities: facilities.value }
  })

  addressModal.onDidDismiss().then(async(result: any) => {
    if(result.data?.selectedFacilityId) {
      currentOrder.value.destinationFacilityId = result.data.selectedFacilityId
    }
  })

  addressModal.present()
}

function isProductAvailableInOrder() {
  return currentOrder.value.items.some((item: any) => item.productId === searchedProduct.value.productId)
}

async function findProduct() {
  if(!queryString.value.trim()) {
    showToast(translate("Enter a valid product sku"));
    return;
  }

  isSearchingProduct.value = true;
  try {
    const resp = await ProductService.fetchProducts({
      "filters": [
        'isVirtual: false', 
        `goodIdentifications: ${barcodeIdentifier.value}/${isScanningEnabled.value ? queryString.value : `*${queryString.value}*`}`
      ],
      "viewSize": 1
    })
    if (!hasError(resp) && resp.data.response?.docs?.length) {
      if(!isScanningEnabled.value) searchedProduct.value = resp.data.response.docs[0];
      store.dispatch("product/addProductToCached", resp.data.response.docs[0])      
    } else {
      throw resp.data
    }
  } catch(err) {
    searchedProduct.value = {}
    logger.error("Product not found", err)
  }
  isSearchingProduct.value = false
  if(isScanningEnabled.value) await validateScannedProduct()
}

async function fetchStock(productId: string) {
  try {
    const resp: any = await StockService.getInventoryAvailableByFacility({
      productId,
      facilityId: currentOrder.value.originFacilityId
    });

    if(!hasError(resp)) {
      return resp.data;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err)
    return null;
  }
}

function formatDateTime(date: any) {
  const dateTime = DateTime.fromISO(date);
  return getDateWithOrdinalSuffix(dateTime.toMillis());
}

function updateDateTimeFilter(value: any) {
  currentOrder.value[selectedDateFilter.value] = value;
}

function closeDateTimeModal() {
  dateTimeModalOpen.value = false;
  selectedDateFilter.value = "";
}

function openDateTimeModal(type: any) {
  dateTimeModalOpen.value = true;
  selectedDateFilter.value = type;
}
</script>

<style scoped>
.list-item {
  --columns-desktop: 5;
  border-bottom: var(--border-medium);
}

/* Added width property as after updating to ionic7 min-width is getting applied on ion-label inside ion-item
which results in distorted label text and thus reduced ion-item width */
.list-item > ion-item {
  width: 100%;
}

.item-qty-actions {
  grid-column: span 2;
}

.date-time-modal {
  --width: 320px;
  --height: 400px;
  --border-radius: 8px;
}

.pointer {
  cursor: pointer;
}

.find {
  display: grid;
  grid-template-areas: "search"
                       "to-filters"
                       "main";
  align-items: start;
}

.find > main {
  grid-area: main;
}

.to-filters {
  grid-area: to-filters;
}

.search {
  grid-area: search;
}

@media (min-width: 991px) {

  .find {
    grid: "search  main" min-content
    "to-filters main" 1fr
    / 375px;
    column-gap: var(--spacer-xl);
    margin: var(--spacer-lg);
    margin-right: 0;
  }

  .to-filters {
    margin-top: var(--spacer-lg);
  }

  .find > .to-filters{
    display: unset;
  }
}
</style>