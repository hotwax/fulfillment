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
          <ion-menu-button menu="end">
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
              {{ carrierPartyId.val.split('/')[0] }}
              <p>{{ carrierPartyId.groups }} {{ carrierPartyId.groups === 1 ? $t('package') : $t("packages") }}</p>
            </ion-label>
            <!-- TODO: make the print icon functional -->
            <!-- <ion-icon :icon="printOutline" /> -->
          </ion-item>

          <ion-item lines="none" v-for="shipmentMethod in shipmentMethods" :key="shipmentMethod.val">
            <ion-checkbox slot="start" :checked="completedOrders.query.selectedShipmentMethods.includes(shipmentMethod.val)" @ionChange="updateSelectedShipmentMethods(shipmentMethod.val)"/>
            <ion-label>
              {{ shipmentMethod.val }}
              <p>{{ shipmentMethod.groups }} {{ shipmentMethod.groups > 1 ? $t('orders') : $t('order') }}, {{ shipmentMethod.itemCount }} {{ shipmentMethod.itemCount > 1 ? $t('items') : $t('item') }}</p>
            </ion-label>
          </ion-item>
        </div>

        <ion-button expand="block" class="bulk-action desktop-only" fill="outline" @click="bulkShipOrders()">{{ $t("Ship") }}</ion-button>

        <ion-card v-for="(order, index) in completedOrders.list" :key="index">
          <div class="card-header">
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
                <!-- TODO: add support to display the last brokered date, currently not getting
                the date in API response -->
                <!-- <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p> -->
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

            <div class="product-metadata mobile-only">
              <ion-note>{{ getProductStock(item.productId) }} {{ $t("pieces in stock") }}</ion-note>
            </div>
          </div>

          <!-- TODO: implement functionality to mobile view -->
          <div class="mobile-only">
            <ion-item>
              <ion-button fill="clear" >{{ $t("Ship Now") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click="shippingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <!-- TODO: make the buttons functional -->
          <div class="actions">
            <div class="desktop-only">
              <ion-button>{{ $t("Ship Now") }}</ion-button>
              <!-- TODO: implemented support to make the buttons functional -->
              <ion-button :disabled="true" fill="outline">{{ $t("Print Shipping Label") }}</ion-button>
              <ion-button :disabled="true" fill="outline">{{ $t("Print Customer Letter") }}</ion-button>
            </div>
            <div class="desktop-only">
              <ion-button fill="outline" color="danger" @click="unpackOrder(order)">{{ $t("Unpack") }}</ion-button>
            </div>
          </div>
        </ion-card>

        <!-- TODO: make mobile view functional -->
        <ion-fab class="mobile-only" vertical="bottom" horizontal="end">
          <ion-fab-button  @click="bulkShipOrders()">
            <ion-icon :icon="checkmarkDoneOutline" />
          </ion-fab-button>
        </ion-fab>
      </div>
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
  IonItem,
  IonLabel,
  IonMenuButton,
  IonNote,
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
import { formatUtcDate, getFeature, hasError, showToast } from '@/utils'
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
    IonItem,
    IonLabel,
    IonMenuButton,
    IonNote,
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
      getProductStock: 'stock/getProductStock',
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  async mounted() {
    await Promise.all([this.store.dispatch('order/findCompletedOrders'), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
    emitter.on('updateOrderQuery', this.updateOrderQuery)
  },
  unmounted() {
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  methods: {
    async updateOrderQuery(size: any) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      completedOrdersQuery.viewSize = size
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async bulkShipOrders() {
      const shipOrderAlert = await alertController
        .create({
           header: this.$t("Ship orders"),
           message: this.$t("You are shipping orders. You cannot unpack and edit orders after they have been shipped. Are you sure you are ready to ship this orders.", {count: this.completedOrders.list.length, space: '<br /><br />'}),
           buttons: [{
            role: "cancel",
            text: this.$t("Cancel"),
          }, {
            text: this.$t("Ship"),
            handler: async () => {
              const payload = {
                shipmentId: this.completedOrders.list.map((order: any) => order.shipmentId)
              }

              try {
                const resp = await OrderService.bulkShipOrders(payload)

                if(resp.status == 200 && !hasError(resp)) {
                  showToast(translate('Orders shipped successfully'))
                  // TODO: handle the case of data not updated correctly
                  await Promise.all([this.store.dispatch('order/findCompletedOrders'), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
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