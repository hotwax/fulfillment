<template>
  <ion-page>
    <ViewSizeSelector content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!completedOrders.total">{{ completedOrders.total }} {{ $t('orders') }}</ion-title>
        <ion-title v-else>{{ completedOrders.query.viewSize }} {{ $t('of') }} {{ completedOrders.total }} {{ completedOrders.total ? $t('order') : $t('orders') }}</ion-title>

        <ion-buttons slot="end">
          <!-- TODO: implement support to upload CSV -->
          <ion-button :disabled="true" fill="clear" @click="() => router.push('/upload-csv')">{{ $t("Upload CSV") }}</ion-button>
          <ion-menu-button menu="end" :disabled="!completedOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="view-size-selector">
      <ion-searchbar :value="completedOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)" />

      <div v-if="completedOrders.total">

        <div class="filters">
          <ion-item lines="none" v-for="carrierPartyId in carrierPartyIds" :key="carrierPartyId.val">
            <ion-checkbox slot="start" :checked="completedOrders.query.selectedCarrierPartyIds.includes(carrierPartyId.val)" @ionChange="updateSelectedCarrierPartyIds(carrierPartyId.val)"/>
            <ion-label>
              {{ getPartyName(carrierPartyId.val.split('/')[0]) }}
              <p>{{ carrierPartyId.groups }} {{ carrierPartyId.groups === 1 ? $t('package') : $t("packages") }}</p>
            </ion-label>
            <!-- TODO: make the print icon functional -->
            <!-- <ion-icon :icon="printOutline" /> -->
          </ion-item>

          <ion-item lines="none" v-for="shipmentMethod in shipmentMethods" :key="shipmentMethod.val">
            <ion-checkbox slot="start" :checked="completedOrders.query.selectedShipmentMethods.includes(shipmentMethod.val)" @ionChange="updateSelectedShipmentMethods(shipmentMethod.val)"/>
            <ion-label>
              {{ getShipmentMethodDesc(shipmentMethod.val) }}
              <p>{{ shipmentMethod.groups }} {{ shipmentMethod.groups > 1 ? $t('orders') : $t('order') }}, {{ shipmentMethod.itemCount }} {{ shipmentMethod.itemCount > 1 ? $t('items') : $t('item') }}</p>
            </ion-label>
          </ion-item>
        </div>
        <div class="results">
          <ion-button :disabled="!hasAnyPackedShipment() || hasAnyMissingInfo()" expand="block" class="bulk-action desktop-only" fill="outline" size="large" @click="bulkShipOrders()">{{ $t("Ship") }}</ion-button>

          <ion-card class="order" v-for="(order, index) in getCompletedOrders()" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  {{ order.customerName }}
                  <p>{{ $t("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>

              <div class="order-tags">
                <ion-chip outline>
                  <ion-icon :icon="pricetagOutline" />
                  <ion-label>{{ order.orderId }}</ion-label>
                </ion-chip>
              </div>

              <div class="order-metadata">
                <ion-label>
                  {{ order.shipmentMethodTypeDesc }}
                  <p v-if="order.reservedDatetime">{{ $t("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="item.orderItemSeqId" class="order-item">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <Image :src="getProduct(item.productId).mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ item.productSku }}</p>
                    {{ item.virtualProductName }}
                    <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
                  </ion-label>
                </ion-item>
              </div>
            </div>

            <!-- TODO: implement functionality to mobile view -->
            <div class="mobile-only">
              <ion-item>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="clear" >{{ $t("Ship Now") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click="shippingPopover">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <!-- TODO: make the buttons functional -->
            <div class="actions">
              <div class="desktop-only">
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true">{{ $t("Shipped") }}</ion-button>
                <ion-button  :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" @click="shipOrder(order)" v-else>{{ $t("Ship Now") }}</ion-button>
                <!-- TODO: implemented support to make the buttons functional -->
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" v-if="order.missingLabelImage" fill="outline" @click="retryShippingLabel(order)">{{ $t("Retry Generate Label") }}</ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" v-else fill="outline" @click="printShippingLabel(order)">{{ $t("Print Shipping Label") }}</ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click="printPackingSlip(order)">{{ $t("Print Customer Letter") }}</ion-button>
              </div>
              <div class="desktop-only">
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" fill="outline" color="danger" @click="unpackOrder(order)">{{ $t("Unpack") }}</ion-button>
              </div>
            </div>
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreCompletedOrders($event)" threshold="100px" :disabled="!isCompletedOrderScrollable()">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
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
        {{ currentFacility.name }}{{ $t(" doesn't have any completed orders right now.") }}
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
  IonPage,
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  popoverController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { printOutline, downloadOutline, pricetagOutline, ellipsisVerticalOutline, checkmarkDoneOutline, optionsOutline } from 'ionicons/icons'
import Popover from '@/views/ShippingPopover.vue'
import { useRouter } from 'vue-router';
import { mapGetters, useStore } from 'vuex'
import { formatUtcDate, getFeature, showToast } from '@/utils'
import { hasError } from '@/adapter'
import Image from '@/components/Image.vue'
import { UtilService } from '@/services/UtilService';
import { prepareOrderQuery } from '@/utils/solrHelper';
import emitter from '@/event-bus';
import ViewSizeSelector from '@/components/ViewSizeSelector.vue'
import { translate } from '@/i18n';
import { OrderService } from '@/services/OrderService';
import logger from '@/logger';

export default defineComponent({
  name: 'Home',
  components: {
    Image,
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
    IonPage,
    IonSearchbar,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ViewSizeSelector
  },
  data() {
    return {
      shipmentMethods: [] as Array<any>,
      carrierPartyIds: [] as Array<any>
    }
  },
  computed: {
    ...mapGetters({
      completedOrders: 'order/getCompletedOrders',
      getProduct: 'product/getProduct',
      currentFacility: 'user/getCurrentFacility',
      currentEComStore: 'user/getCurrentEComStore',
      getPartyName: 'util/getPartyName',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc'
    })
  },
  async mounted() {
    await Promise.all([this.initialiseOrderQuery(), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
    emitter.on('updateOrderQuery', this.updateOrderQuery)
  },
  unmounted() {
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  methods: {
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
           header: this.$t("Ship orders"),
           message: this.$tc("You are shipping orders. You cannot unpack and edit orders after they have been shipped. Are you sure you are ready to ship this orders?", {count: packedOrdersCount, space: '<br /><br />'}),
           buttons: [{
            role: "cancel",
            text: this.$t("Cancel"),
          }, {
            text: this.$t("Ship"),
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

    async shippingPopover(ev: Event) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },

    async fetchShipmentMethods() {
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        queryFields: 'productId productName virtualProductName orderId search_orderIdentifications productSku customerId customerName goodIdentifications',
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
        queryFields: 'productId productName virtualProductName orderId search_orderIdentifications productSku customerId customerName goodIdentifications',
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
           header: this.$t("Unpack"),
           message: this.$t("Unpacking this order will send it back to 'In progress' and it will have to be repacked."),
           buttons: [{
            role: "cancel",
            text: this.$t("Cancel"),
          }, {
            text: this.$t("Unpack"),
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
        // TODO fetch specific order
        this.initialiseOrderQuery();
      } else {
        showToast(translate("Failed to generate shipping label"))
      }
    },
    async printPackingSlip(order: any) {
      const shipmentIds = order.shipments.map((shipment: any) => shipment.shipmentId)
      await OrderService.printPackingSlip(shipmentIds);
    },
    async printShippingLabel(order: any) {
      const shipmentIds = order.shipments.map((shipment: any) => shipment.shipmentId)
      await OrderService.printShippingLabel(shipmentIds)
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      checkmarkDoneOutline,
      downloadOutline,
      ellipsisVerticalOutline,
      formatUtcDate,
      getFeature,
      optionsOutline,
      pricetagOutline,
      printOutline,
      router,
      store
    }
  }
});
</script>