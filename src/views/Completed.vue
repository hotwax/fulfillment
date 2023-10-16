<template>
  <ion-page>
    <ViewSizeSelector content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!completedOrders.total">{{ completedOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ completedOrders.query.viewSize }} {{ translate('of') }} {{ completedOrders.total }} {{ completedOrders.total ? translate('order') : translate('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-menu-button menu="end" :disabled="!completedOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="view-size-selector">
      <ion-searchbar class="better-name-here" :value="completedOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)" />

      <div v-if="completedOrders.total">

        <div class="filters">
          <ion-item lines="none" v-for="carrierPartyId in carrierPartyIds" :key="carrierPartyId.val">
            <ion-checkbox slot="start" :checked="completedOrders.query.selectedCarrierPartyIds.includes(carrierPartyId.val)" @ionChange="updateSelectedCarrierPartyIds(carrierPartyId.val)"/>
            <ion-label>
              {{ getPartyName(carrierPartyId.val.split('/')[0]) }}
              <p>{{ carrierPartyId.groups }} {{ carrierPartyId.groups === 1 ? translate('package') : translate("packages") }}</p>
            </ion-label>
            <!-- TODO: make the print icon functional -->
            <!-- <ion-icon :icon="printOutline" /> -->
          </ion-item>

          <ion-item lines="none" v-for="shipmentMethod in shipmentMethods" :key="shipmentMethod.val">
            <ion-checkbox slot="start" :checked="completedOrders.query.selectedShipmentMethods.includes(shipmentMethod.val)" @ionChange="updateSelectedShipmentMethods(shipmentMethod.val)"/>
            <ion-label>
              {{ getShipmentMethodDesc(shipmentMethod.val) }}
              <p>{{ shipmentMethod.groups }} {{ shipmentMethod.groups > 1 ? translate('orders') : translate('order') }}, {{ shipmentMethod.itemCount }} {{ shipmentMethod.itemCount > 1 ? translate('items') : translate('item') }}</p>
            </ion-label>
          </ion-item>
        </div>
        <div class="results">
          <ion-button :disabled="!hasAnyPackedShipment() || hasAnyMissingInfo()" expand="block" class="bulk-action desktop-only" fill="outline" size="large" @click="bulkShipOrders()">{{ translate("Ship") }}</ion-button>

          <ion-card class="order" v-for="(order, index) in getCompletedOrders()" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ order.customerName }}</strong>
                  <p>{{ translate("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>

              <div class="order-tags">
                <ion-chip @click="copyToClipboard(order.orderName, 'Copied to clipboard')" outline>
                  <ion-icon :icon="pricetagOutline" />
                  <ion-label>{{ order.orderName }}</ion-label>
                </ion-chip>
              </div>

              <div class="order-metadata">
                <ion-label>
                  {{ order.shipmentMethodTypeDesc }}
                  <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="item.orderItemSeqId" class="order-item">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <ShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ item.productSku }}</p>
                    {{ item.virtualProductName }}
                    <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
                  </ion-label>
                </ion-item>
              </div>

              <!-- TODO: add a spinner if the api takes too long to fetch the stock -->
              <div class="product-metadata">
                <ion-note v-if="getProductStock(item.productId).quantityOnHandTotal">{{ getProductStock(item.productId).quantityOnHandTotal }} {{ translate('pieces in stock') }}</ion-note>
                <ion-button fill="clear" v-else size="small" @click="fetchProductStock(item.productId)">
                  <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
                </ion-button>
              </div>
            </div>

            <div class="mobile-only">
              <ion-item>
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true" fill="clear">{{ translate("Shipped") }}</ion-button>
                <ion-button v-else :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="clear" @click="shipOrder(order)">{{ translate("Ship Now") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click="shippingPopover($event, order)">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <!-- TODO: make the buttons functional -->
            <div class="actions">
              <div class="desktop-only">
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true">{{ translate("Shipped") }}</ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" @click="shipOrder(order)" v-else>{{ translate("Ship Now") }}</ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click="regenerateShippingLabel(order)">
                  {{ translate("Regenerate shipping label") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingShippingLabel" name="crescent" />
                </ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click="printPackingSlip(order)">
                  {{ translate("Print customer letter") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingPackingSlip" name="crescent" />
                </ion-button>
              </div>
              <div class="desktop-only">
                <ion-button v-if="order.missingLabelImage" fill="outline" @click="showShippingLabelErrorModal(order)">{{ translate("Shipping label error") }}</ion-button>
                <ion-button :disabled="!hasPermission(Actions.APP_UNPACK_ORDER) || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" fill="outline" color="danger" @click="unpackOrder(order)">{{ translate("Unpack") }}</ion-button>
              </div>
            </div>
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreCompletedOrders($event)" threshold="100px" :disabled="!isCompletedOrderScrollable()">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </div>
      </div>
      <!-- TODO: make mobile view functional -->
      <ion-fab v-if="completedOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button  @click="bulkShipOrders()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
      <div class="empty-state" v-else>
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonChip,
  IonContent,
  IonCheckbox,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  popoverController,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { cubeOutline, printOutline, downloadOutline, pricetagOutline, ellipsisVerticalOutline, checkmarkDoneOutline, optionsOutline } from 'ionicons/icons'
import ShippingPopover from '@/views/ShippingPopover.vue'
import { useRouter } from 'vue-router';
import { mapGetters, useStore } from 'vuex'
import { copyToClipboard, formatUtcDate, getFeature, showToast } from '@/utils'
import { hasError } from '@/adapter'
import { ShopifyImg } from '@hotwax/dxp-components';
import { UtilService } from '@/services/UtilService';
import { prepareOrderQuery } from '@/utils/solrHelper';
import emitter from '@/event-bus';
import ViewSizeSelector from '@/components/ViewSizeSelector.vue'
import { translate } from '@hotwax/dxp-components'
import { OrderService } from '@/services/OrderService';
import logger from '@/logger';
import ShippingLabelErrorModal from '@/components/ShippingLabelErrorModal.vue';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'Home',
  components: {
    ShopifyImg,
    IonButton,
    IonButtons,
    IonCard,
    IonChip,
    IonContent,
    IonCheckbox,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSearchbar,
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ViewSizeSelector
  },
  data() {
    return {
      shipmentMethods: [] as Array<any>,
      carrierPartyIds: [] as Array<any>,
      searchedQuery: ''
    }
  },
  computed: {
    ...mapGetters({
      completedOrders: 'order/getCompletedOrders',
      getProduct: 'product/getProduct',
      currentFacility: 'user/getCurrentFacility',
      currentEComStore: 'user/getCurrentEComStore',
      getPartyName: 'util/getPartyName',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      getProductStock: 'stock/getProductStock'
    })
  },
  async mounted() {
    await Promise.all([this.initialiseOrderQuery(), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
    emitter.on('updateOrderQuery', this.updateOrderQuery)
  },
  unmounted() {
    this.store.dispatch('order/clearCompletedOrders')
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  methods: {
    getErrorMessage() {
      return this.searchedQuery === '' ? translate("doesn't have any completed orders right now.", { facilityName: this.currentFacility.facilityName }) : translate( "No results found for . Try searching In Progress or Open tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: this.searchedQuery, lineBreak: '<br />' })
    },
    hasAnyPackedShipment(): boolean {
      return this.completedOrders.list.some((order: any) => {
        return order.shipments && order.shipments.some((shipment: any) => shipment.statusId === "SHIPMENT_PACKED");
      })
    },
    hasAnyMissingInfo(): boolean {
      return this.completedOrders.list.some((order: any) => {
        return order.hasMissingShipmentInfo || order.hasMissingPackageInfo;
      })
    },
    getCompletedOrders() {
      return this.completedOrders.list.slice(0, (this.completedOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any) );
    },
    async loadMoreCompletedOrders(event: any) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      completedOrdersQuery.viewIndex++;
      await this.store.dispatch('order/updateCompletedOrderIndex', { ...completedOrdersQuery })
      event.target.complete();
    },
    isCompletedOrderScrollable() {
      return ((this.completedOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) <  this.completedOrders.query.viewSize;
    },
    async initialiseOrderQuery() {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      completedOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async updateOrderQuery(size: any) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      completedOrdersQuery.viewSize = size
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async shipOrder(order: any) {

      const packedShipments = order.shipments.filter((shipment: any) => shipment.statusId === "SHIPMENT_PACKED");
      
      if (packedShipments.length === 0) {
        showToast(translate('There are no packed shipments. Failed to ship order.'))
        return;
      }
      const shipmentIds = new Set();
      let index = 0;

      const payload = packedShipments.reduce((formData: any, shipment: any) => {

        if (!shipmentIds.has(shipment.shipmentId)) {
          formData.append('shipmentId_o_' + index, shipment.shipmentId)
          formData.append('statusId_o_' + index, "SHIPMENT_SHIPPED")
          formData.append('shipmentTypeId_o_' + index, shipment.shipmentTypeId)
          formData.append('_rowSubmit_o_' + index, "Y")
          index++;
        }

        return formData;
      }, new FormData())

      try {
        const resp = await OrderService.shipOrder(payload)

        if(!hasError(resp)) {
          showToast(translate('Order shipped successfully'))
          // TODO: handle the case of data not updated correctly
          await Promise.all([this.initialiseOrderQuery(), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to ship order', err)
        showToast(translate('Failed to ship order'))
      }

    },
    async bulkShipOrders() {
      const packedOrdersCount = this.completedOrders.list.filter((order: any) => {
        return this.hasPackedShipments(order);
      }).length;
      const shipOrderAlert = await alertController
        .create({
           header: translate("Ship orders"),
           message: translate("You are shipping orders. You cannot unpack and edit orders after they have been shipped. Are you sure you are ready to ship this orders?", {count: packedOrdersCount, space: '<br /><br />'}),
           buttons: [{
            role: "cancel",
            text: translate("Cancel"),
          }, {
            text: translate("Ship"),
            handler: async () => {
              let orderList = JSON.parse(JSON.stringify(this.completedOrders.list))

              let shipmentIds = orderList.reduce((shipmentIds: any, order: any) => {
                if (order.shipments) {
                  order.shipments.reduce((shipmentIds: any, shipment: any) => {
                    if (shipment.statusId === "SHIPMENT_PACKED") {
                      shipmentIds.push(shipment.shipmentId)
                    }
                    return shipmentIds;
                  }, shipmentIds) 
                }
                return shipmentIds;
              }, []);

              // Considering only unique shipment IDs
              // TODO check reason for redundant shipment IDs
              shipmentIds = [...new Set(shipmentIds)] as Array<string>;

              if (shipmentIds.length === 0) {
                showToast(translate("No packed shipments to ship for these orders"))
                return;
              }
              const payload = {
                shipmentId: shipmentIds
              }

              try {
                const resp = await OrderService.bulkShipOrders(payload)

                if(resp.status == 200 && !hasError(resp)) {
                  showToast(translate('Orders shipped successfully'))
                  // TODO: handle the case of data not updated correctly
                  await Promise.all([this.initialiseOrderQuery(), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
                } else {
                  throw resp.data
                }
              } catch(err) {
                logger.error('Failed to ship orders', err)
                showToast(translate('Failed to ship orders'))
              }
            }
          }]
        });
      return shipOrderAlert.present();
    },

    async shippingPopover(ev: Event, order:any) {
      const popover = await popoverController.create({
        component: ShippingPopover,
        componentProps: {
          hasPackedShipments: this.hasPackedShipments(order),
          order
        },
        event: ev,
        translucent: true,
        showBackdrop: false,
      });

      popover.onDidDismiss().then(async(result) => {
        const selectedMethod = result.data?.selectedMethod

        // Retrieved the method name on popover dismissal and respective method is called.
        if(typeof(this[selectedMethod]) === 'function') {
          await (this as any)[selectedMethod](order);
        }
      })

      return popover.present();
    },
    async fetchShipmentMethods() {
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        groupBy: 'picklistBinId',
        sort: 'orderDate asc',
        defType: "edismax",
        filters: {
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId }
        },
        facet: {
          "shipmentMethodFacet": {
            "excludeTags": "shipmentMethodTypeIdFilter",
            "field": "shipmentMethodTypeId",
            "mincount": 1,
            "limit": -1,
            "sort": "index",
            "type": "terms",
            "facet": {
              "groups": "unique(orderId)",
              "itemCount": "sum(itemQuantity)"
            }
          }
        }
      })

      try {
        const resp = await UtilService.fetchShipmentMethods(payload)

        if(resp.status == 200 && !hasError(resp)) {
          this.shipmentMethods = resp.data.facets.shipmentMethodFacet.buckets
          this.store.dispatch('util/fetchShipmentMethodTypeDesc', this.shipmentMethods.map((shipmentMethod: any) => shipmentMethod.val))
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch shipment methods', err)
      }
    },
    async fetchCarrierPartyIds() {
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        groupBy: 'picklistBinId',
        sort: 'orderDate asc',
        defType: "edismax",
        filters: {
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId },
        },
        facet: {
          manifestContentIdFacet: {
            "excludeTags": "manifestContentIdFilter",
            "field": "manifestContentId",
            "mincount": 1,
            "limit": -1,
            "sort": "index",
            "type": "terms",
            "facet": {
              "groups": "unique(picklistBinId)"
            }
          }
        }
      })

      try {
        const resp = await UtilService.fetchCarrierPartyIds(payload)

        if(resp.status == 200 && !hasError(resp)) {
          this.carrierPartyIds = resp.data.facets.manifestContentIdFacet.buckets
          this.store.dispatch('util/fetchPartyInformation', this.carrierPartyIds.map((carrierPartyId) => carrierPartyId.val.split('/')[0]))
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch carrierPartyIds', err)
      }
    },
    async updateQueryString(queryString: string) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      completedOrdersQuery.queryString = queryString
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
      this.searchedQuery = queryString;
    },
    async updateSelectedShipmentMethods (method: string) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      const selectedShipmentMethods = completedOrdersQuery.selectedShipmentMethods
      const index = selectedShipmentMethods.indexOf(method)
      if (index < 0) {
        selectedShipmentMethods.push(method)
      } else {
        selectedShipmentMethods.splice(index, 1)
      }

      // making view size default when changing the shipment method to correctly fetch orders
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      completedOrdersQuery.selectedShipmentMethods = selectedShipmentMethods

      this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async updateSelectedCarrierPartyIds (carrierPartyId: string) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      const selectedCarrierPartyIds = completedOrdersQuery.selectedCarrierPartyIds
      const index = selectedCarrierPartyIds.indexOf(carrierPartyId)
      if (index < 0) {
        selectedCarrierPartyIds.push(carrierPartyId)
      } else {
        selectedCarrierPartyIds.splice(index, 1)
      }

      // making view size default when changing the shipment method to correctly fetch orders
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      completedOrdersQuery.selectedCarrierPartyIds = selectedCarrierPartyIds

      this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async unpackOrder(order: any) {
      const unpackOrderAlert = await alertController
        .create({
           header: translate("Unpack"),
           message: translate("Unpacking this order will send it back to 'In progress' and it will have to be repacked."),
           buttons: [{
            role: "cancel",
            text: translate("Cancel"),
          }, {
            text: translate("Unpack"),
            handler: async () => {
              const payload = {
                orderId: order.orderId,
                picklistBinId: order.groupValue
              }

              try {
                const resp = await OrderService.unpackOrder(payload)

                if(resp.status == 200 && !hasError(resp)) {
                  showToast(translate('Order unpacked successfully'))
                  // TODO: handle the case of data not updated correctly
                  await Promise.all([this.store.dispatch('order/findCompletedOrders'), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
                } else {
                  throw resp.data
                }
              } catch(err) {
                logger.error('Failed to unpack the order', err)
                showToast(translate('Failed to unpack the order'))
              }
            }
          }]
        });
      return unpackOrderAlert.present();
    },
    hasPackedShipments(order: any) {
      // TODO check if ternary check is needed or we could handle on UI
      return order.shipments ? Object.values(order.shipments).some((shipment: any) => shipment.statusId === 'SHIPMENT_PACKED') : {}
    },
    async retryShippingLabel(order: any) {
      // Getting all the shipmentIds from shipmentPackages, as we only need to pass those shipmentIds for which label is missing
      // In shipmentPackages only those shipmentInformation is available for which shippingLabel is missing
      const shipmentIds = order.shipmentPackages.map((shipmentPackage: any) => shipmentPackage.shipmentId);
      // TODO Handle error case
      const resp = await OrderService.retryShippingLabel(shipmentIds)
      if (!hasError(resp)) {
        showToast(translate("Shipping Label generated successfully"))
        await this.printShippingLabel(order)
        // TODO fetch specific order
        this.initialiseOrderQuery();
      } else {
        showToast(translate("Failed to generate shipping label"))
      }
    },
    async printPackingSlip(order: any) {
      // if the request to print packing slip is not yet completed, then clicking multiple times on the button
      // should not do anything
      if(order.isGeneratingPackingSlip) {
        return;
      }

      const shipmentIds = order.shipments.map((shipment: any) => shipment.shipmentId)
      order.isGeneratingPackingSlip = true;
      await OrderService.printPackingSlip(shipmentIds);
      order.isGeneratingPackingSlip = false;
    },
    async printShippingLabel(order: any) {
      const shipmentIds = order.shipments.map((shipment: any) => shipment.shipmentId)
      await OrderService.printShippingLabel(shipmentIds)
    },
    async regenerateShippingLabel(order: any) {
      // if the request to print shipping label is not yet completed, then clicking multiple times on the button
      // should not do anything
      if(order.isGeneratingShippingLabel) {
        return;
      }

      order.isGeneratingShippingLabel = true;

      if(order.missingLabelImage) {
        await this.retryShippingLabel(order)
      } else {
        await this.printShippingLabel(order)
      }

      order.isGeneratingShippingLabel = false;
    },
    async showShippingLabelErrorModal(order: any){
      // Getting all the shipment ids
      const shipmentIds = order.shipments.map((shipment: any) => shipment.shipmentId);
      const shippingLabelErrorModal = await modalController.create({
        component: ShippingLabelErrorModal,
        componentProps: {
          shipmentIds
        }
      });
      return shippingLabelErrorModal.present();
    },
    fetchProductStock(productId: string) {
      this.store.dispatch('stock/fetchStock', { productId })
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      copyToClipboard,
      checkmarkDoneOutline,
      cubeOutline,
      downloadOutline,
      ellipsisVerticalOutline,
      formatUtcDate,
      getFeature,
      hasPermission,
      optionsOutline,
      pricetagOutline,
      printOutline,
      router,
      store,
      translate
    }
  }
});
</script>