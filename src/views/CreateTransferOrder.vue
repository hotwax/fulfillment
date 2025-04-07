<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/transfer-orders" slot="start" />
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

        <aside class="create-filters">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Assign") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-icon :icon="sendOutline" slot="start" />
              <ion-label>{{ translate("Origin") }}</ion-label>
              <template v-if="currentOrder.originFacilityId" slot="end">
                <ion-chip outline @click="openSelectFacilityModal('originFacilityId')">
                  {{ getFacilityName(currentOrder.originFacilityId) ? getFacilityName(currentOrder.originFacilityId) : currentOrder.originFacilityId }}
                </ion-chip>
              </template>
              <ion-button v-else slot="end" fill="outline" @click="openSelectFacilityModal('originFacilityId')">
                <ion-icon slot="start" :icon="addCircleOutline" />
                <ion-label>{{ translate("Assign") }}</ion-label>
              </ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-icon :icon="downloadOutline" slot="start" />
              <ion-label>{{ translate("Destination") }}</ion-label>
              <template v-if="currentOrder.destinationFacilityId" slot="end">
                <ion-chip outline @click="openSelectFacilityModal('destinationFacilityId')">
                  {{ getFacilityName(currentOrder.destinationFacilityId) ? getFacilityName(currentOrder.destinationFacilityId) : currentOrder.destinationFacilityId }}
                </ion-chip>
              </template>
              <ion-button v-else slot="end" fill="outline" @click="openSelectFacilityModal('destinationFacilityId')">
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
              <ion-input :label="translate('Add product')" label-placement="floating" :clear-input="true" v-model="queryString" :placeholder="translate('Searching on SKU')" @keyup.enter="addProductToCount()" />
            </ion-item>
            <ion-item lines="none" v-if="isSearchingProduct">
              <ion-spinner color="secondary" name="crescent"></ion-spinner>
            </ion-item>
            <ion-item lines="none" v-else-if="searchedProduct.productId">
              <ion-thumbnail slot="start">
                <Image :src="getProduct(searchedProduct.productId).mainImageUrl"/>
              </ion-thumbnail>
              <ion-label>
                <p class="overline">{{ translate("Search result") }}</p>
                {{ searchedProduct.internalName || searchedProduct.sku || searchedProduct.productId }}
              </ion-label>
              <ion-button size="default" slot="end" fill="clear" @click="addProductToCount" :color="isProductAvailableInOrder() ? 'success' : 'primary'">
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
                <ion-thumbnail slot="start">
                  <Image :src="getProduct(item.productId)?.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                  <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                </ion-label>
              </ion-item>
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

<script lang="ts">
import { IonBackButton, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCheckbox, IonChip, IonContent, IonDatetime, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonModal, IonPage, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewDidEnter, alertController, modalController, popoverController } from '@ionic/vue';
import { addCircleOutline, checkmarkCircle, checkmarkDoneOutline, cloudUploadOutline, downloadOutline, ellipsisVerticalOutline, informationCircleOutline, listOutline, sendOutline, storefrontOutline } from 'ionicons/icons';
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components'
import { defineComponent  } from "vue";
import { getDateWithOrdinalSuffix, jsonToCsv, parseCsv, showToast } from '@/utils';
import logger from '@/logger';
import { mapGetters, useStore } from 'vuex';
import Image from '@/components/Image.vue';
import TransferOrderItemActionsPopover from '@/components/TransferOrderItemActionsPopover.vue';
import SelectFacilityModal from '@/components/SelectFacilityModal.vue';
import { ProductService } from '@/services/ProductService';
import { UserService } from '@/services/UserService';
import { UtilService } from '@/services/UtilService';
import { OrderService } from '@/services/OrderService';
import router from '@/router';
import { DateTime } from 'luxon';
import { hasError } from "@/adapter";
import emitter from '@/event-bus';
import { StockService } from '@/services/StockService';
import ImportTOItemsCsvModal from '@/components/ImportTOItemsCsvModal.vue';

export default defineComponent({
  name: 'RejectionReasons',
  components: {
    IonBackButton,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCheckbox,
    IonChip,
    IonContent,
    IonDatetime,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonModal,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      currentOrder: {
        name: "",
        productStoreId: "",
        originFacilityId: "",
        destinationFacilityId: "",
        carrierPartyId: "",
        shipmentMethodTypeId: "", 
        items: []
      } as any,
      currentStore: {} as any,
      facilities: [] as any,
      timeoutId: {} as any,
      isSearchingProduct: false as boolean,
      searchedProduct: {} as any,
      queryString: "",
      stores: [] as any,
      dateTimeModalOpen: false,
      selectedDateFilter: "",
      content: [] as any,
      fileColumns: [] as any,
      uploadedFile: {} as any,
      fileUploaded: false
    }
  },
  computed: {
    ...mapGetters({
      getProduct: "product/getProduct",
      shipmentMethodsByCarrier: "util/getShipmentMethodsByCarrier",
      getCarrierDesc: "util/getCarrierDesc",
      sampleProducts: "util/getSampleProducts"
    })
  },
  watch: {
    queryString: {
      handler(value) {
        const searchedString = value.trim();

        if (searchedString?.length) {
          this.isSearchingProduct = true;
        } else {
          this.searchedProduct = {};
          this.isSearchingProduct = false;
        }

        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
          if (searchedString?.length) {
            this.findProduct();
          }
        }, 1000);
      },
      deep: true
    }
  },
  async ionViewDidEnter() {
    emitter.emit("presentLoader")
    this.currentStore = useUserStore().getCurrentEComStore
    this.currentOrder.productStoreId = this.currentStore?.productStoreId
    await Promise.allSettled([this.fetchFacilitiesByCurrentStore(), this.store.dispatch("util/fetchStoreCarrierAndMethods", this.currentOrder.productStoreId), this.store.dispatch("util/fetchCarriersDetail"), this.store.dispatch("util/fetchSampleProducts")])
    if(Object.keys(this.shipmentMethodsByCarrier)?.length) {
      this.currentOrder.carrierPartyId = Object.keys(this.shipmentMethodsByCarrier)[0]
      this.selectUpdatedMethod()
    }
    this.currentOrder.originFacilityId = this.facilities[0]?.facilityId
    // uploadedFile.value = {}
    // content.value = []
    emitter.emit("dismissLoader")
  },
  methods: {
    async createOrder() {
      if(!this.currentOrder.items?.length) {
        showToast(translate("Please add atleast one item in the order."));
        return;
      }

      if(!this.currentOrder.name.trim()) {
        showToast(translate("Please give some valid transfer order name."))
        return;
      }

      if(!this.currentOrder.productStoreId || !this.currentOrder.originFacilityId || !this.currentOrder.destinationFacilityId || !this.currentOrder.carrierPartyId || !this.currentOrder.shipmentMethodTypeId) {
        showToast(translate("Please select all the required properties assigned to the order."))
        return;
      }

      if(this.currentOrder.originFacilityId === this.currentOrder.destinationFacilityId) {
        showToast(translate("Origin and destination facility can't be same."))
        return;
      }


      const isItemQuantityInvalid = currentOrder.value.items.some((item: any) => !Number(item.quantity) || Number(item.quantity) < 0)
      if(isItemQuantityInvalid) {
        showToast(translate("Order items must have a valid ordered quantity."))
        return;
      }

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
              unitPrice: item.unitPrice
            }
          })
        }]
      } as any;

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
        if(!hasError(resp)) {
          router.replace(`/order-detail/${resp.data.orderId}`)
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error)
        showToast(translate("Failed to create order."))
      }
    }

    async fetchFacilitiesByCurrentStore() {
      let availableFacilities = [];

      try {
        const resp = await UtilService.fetchFacilities({
          inputFields: {
            productStoreId: this.currentOrder.productStoreId,
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
      this.facilities = availableFacilities
    },
    async openSelectFacilityModal(facilityType: any) {
      const addressModal = await modalController.create({
        component: SelectFacilityModal,
        componentProps: { selectedFacilityId: this.currentOrder[facilityType], facilities: this.facilities }
      })

      addressModal.onDidDismiss().then(async(result: any) => {
        if(result.data?.selectedFacilityId) {
          this.currentOrder[facilityType] = result.data.selectedFacilityId
          if(facilityType === "originFacilityId") {
            this.refetchAllItemsStock()
          }
        }
      })

      addressModal.present()
    },
    async refetchAllItemsStock() {
      const responses = await Promise.allSettled(this.currentOrder.items.map((item: any) => this.fetchStock(item.productId)))
      this.currentOrder.items.map((item: any, index: any) => {
        if(responses[index].status === "fulfilled") {
          item["qoh"] = responses[index]?.value.quantityOnHandTotal 
          item["atp"] = responses[index]?.value.availableToPromiseTotal 
        }
      })
    },
    selectUpdatedMethod() {
      const shipmentMethods = this.getCarrierShipmentMethods()
      if(shipmentMethods?.length) this.currentOrder.shipmentMethodTypeId = shipmentMethods[0]?.shipmentMethodTypeId
    },

    async parse(event: any) {
      let file = event.target.files[0];
      try {
        if (file) { 
          this.uploadedFile = file;
          this.content = await parseCsv(this.uploadedFile);
          this.fileColumns = Object.keys(this.content[0]);
          showToast(translate("File uploaded successfully"));
          this.fileUploaded =!this.fileUploaded; 
          this.openImportCsvModal();
        } else {
          showToast(translate("No new file upload. Please try again"));
        }
      } catch {
        this.content = []
        showToast(translate("Please upload a valid csv to continue"));
      }
    },
    async openOrderItemActionsPopover(event: any, selectedItem: any, isBulkOperation = false){
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
            this.currentOrder.items.map((item: any) => {
              if(item.isChecked) {
                item.quantity = (action === "boolean") ? item.qoh : item.atp
              }
            })
          } else {
            selectedItem.quantity = (action === "bookQOH") ? selectedItem.qoh : selectedItem.atp
          }
        } else if(action === "remove") {
          this.currentOrder.items = isBulkOperation ? this.currentOrder.items.filter((item: any) => !item.isChecked) : this.currentOrder.items.filter((item: any) => selectedItem.productId !== item.productId)
        }
      })

      await popover.present();
    },
    async openImportCsvModal() {
      const importCsvModal = await modalController.create({
        component: ImportTOItemsCsvModal,
        componentProps: {
          fileColumns: this.fileColumns,
          content: this.content
        }
      })
      importCsvModal.onDidDismiss().then((result: any) => {
        if (result?.data?.identifierData && Object.keys(result?.data?.identifierData).length) {
          this.findProductFromIdentifier(result.data.identifierData)
        }
      })
      importCsvModal.present();
    },
    downloadSampleCsv() {
      jsonToCsv(this.sampleProducts, {
        download: true,
        name: "Sample CSV.csv"
      })
    },
    getCarrierShipmentMethods() {
      return this.currentOrder.carrierPartyId && this.shipmentMethodsByCarrier[this.currentOrder.carrierPartyId]
    },
    getFacilityName(facilityId: any) {
      return this.facilities.find((facility: any) => facility.facilityId === facilityId)?.facilityName
    },
    async findProductFromIdentifier(payload: any) {
      const productField = payload.productField
      const quantityField = payload.quantityField
      const idType = payload.idType
      const uploadedItemsByIdValue = {} as any;
      this.content.map((row: any) => {
        uploadedItemsByIdValue[row[productField]] = row
      })

      const idValues = Object.keys(uploadedItemsByIdValue);
      const productIdsAlreadyAddedInList = this.currentOrder.items.map((item: any) => item.productId)
      const filterString = (idType === 'productId') ? `${idType}: (${idValues.join(' OR ')})` : `goodIdentifications: (${idValues.map((value: any) => `${idType}/${value}`).join(' OR ')})`;

      try {
        const resp = await ProductService.fetchProducts({
          "filters": [filterString],
          "viewSize": idValues.length
        })

        if(!hasError(resp) && resp.data.response?.docs?.length) {
          const productsToAdd = resp.data.response.docs
          this.store.dispatch("product/addProductToCachedMultiple", { products: productsToAdd })
          const productsByIdValue = {} as any;
          productsToAdd.map((product: any) => {
            if(idType === "SKU") {
              productsByIdValue[product["sku"]] = product
            } else {
              const idValue = getProductIdentificationValue(idType, product)
              productsByIdValue[idValue] = product
            }
          })

          Object.entries(productsByIdValue).map(async ([idValue, product]: any) => {
            if(productIdsAlreadyAddedInList.includes(product.productId)) {
              if(quantityField) {
                const item = this.currentOrder.items.find((item: any) => item.productId === product.productId)
                item.quantity = Number(item.quantity) + (Number(uploadedItemsByIdValue[idValue][quantityField]) || 0)
              }
            } else {
              const stock = await this.fetchStock(product.productId);
              this.currentOrder.items.push({
                productId: product.productId,
                sku: product.sku,
                quantity: (Number(uploadedItemsByIdValue[idValue][quantityField]) || 0),
                isChecked: false,
                unitPrice: product.BASE_PRICE_PURCHASE_USD_STORE_GROUP_price,
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
    },
    async addProductToCount() {
      if (!this.searchedProduct.productId ||!this.queryString) return;
      if (this.isProductAvailableInOrder()) return;

      let newProduct = { 
        productId: this.searchedProduct.productId,
        sku: this.searchedProduct.sku,
        quantity: 0,
        isChecked: false,
        unitPrice: this.searchedProduct.BASE_PRICE_PURCHASE_USD_STORE_GROUP_price
      } as any;

      const stock = await this.fetchStock(newProduct.productId);
      if(stock?.quantityOnHandTotal || stock?.quantityOnHandTotal === 0) {
        newProduct = { ...newProduct, qoh: stock.quantityOnHandTotal, atp: stock.availableToPromiseTotal }
      }

      this.currentOrder.items.push(newProduct);
    },
    async findProduct() {
      if(!this.queryString.trim()) {
        showToast(translate("Enter a valid product sku"));
        return;
      }

      this.isSearchingProduct = true;
      try {
        const resp = await ProductService.fetchProducts({
          "filters": ['isVirtual: false', `sku: *${this.queryString}*`],
          "viewSize": 1
        })
        if (!hasError(resp) && resp.data.response?.docs?.length) {
          this.searchedProduct = resp.data.response.docs[0];
          this.store.dispatch("product/addProductToCached", this.searchedProduct)      
        } else {
          throw resp.data
        }
      } catch(err) {
        this.searchedProduct = {}
        logger.error("Product not found", err)
      }
      this.isSearchingProduct = false
    },
    isProductAvailableInOrder() {
      return this.currentOrder.items.some((item: any) => item.productId === this.searchedProduct.productId)
    },
    async fetchStock(productId: string) {
      try {
        const resp: any = await StockService.getInventoryAvailableByFacility({
          productId,
          facilityId: this.currentOrder.originFacilityId
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
    },
    async updateBulkOrderItemQuantity(action: any) {
      if(!this.isEligibleForBulkAction()) {
        showToast(translate("No order item is selected for bulk action."))
        return;
      }

      if(action === "bookQOH" || action === "bookATP") {
        this.currentOrder.items.map((item: any) => {
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
              this.currentOrder.items.map((item: any) => {
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
    },
    toggleBulkSelection(isChecked: any) {
      this.currentOrder.items.map((item: any) => item.isChecked = isChecked)
    },
    isEligibleForBulkAction() {
      return this.currentOrder.items?.some((item: any) => item.isChecked)
    },
    isQOHAvailable(item: any) {
      return item.qoh && Number(item.qoh) > Number(item.quantity)
    },
    formatDateTime(date: any) {
      const dateTime = DateTime.fromISO(date);
      return getDateWithOrdinalSuffix(dateTime.toMillis());
    },

    updateDateTimeFilter(value: any) {
      this.currentOrder[this.selectedDateFilter] = value;
    },
    closeDateTimeModal() {
      this.dateTimeModalOpen = false;
      this.selectedDateFilter = "";
    },
    openDateTimeModal(type: any) {
      this.dateTimeModalOpen = true;
      this.selectedDateFilter = type;
    }
  },
  setup() {
    const store = useStore()
    const productIdentificationStore = useProductIdentificationStore();

    return {
      addCircleOutline, checkmarkCircle, checkmarkDoneOutline, cloudUploadOutline, downloadOutline, ellipsisVerticalOutline, informationCircleOutline, listOutline, sendOutline, storefrontOutline,
      DateTime,
      getProductIdentificationValue,
      productIdentificationStore,
      store,
      translate,
      
    }
  }
});
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

.find > .filters{
  display: unset;
}

.date-time-modal {
  --width: 320px;
  --height: 400px;
  --border-radius: 8px;
}

.pointer {
  cursor: pointer;
}

@media (min-width: 991px) {
  .item-search {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 40px;
  }

  .find {
    margin-right: 0;
  }
}
</style>