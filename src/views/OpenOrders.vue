<template>
  <ion-page>
    <ViewSizeSelector content-id="view-size-selector" />
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!openOrders.total">{{ openOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ openOrders.query.viewSize }} {{ translate('of') }} {{ openOrders.total }} {{ translate('orders') }}</ion-title>
     
        <ion-buttons slot="end">
          <ion-button :disabled="!hasPermission(Actions.APP_RECYCLE_ORDER) || !openOrders.total" fill="clear" color="danger" @click="recycleOutstandingOrders()">
            {{ translate("Reject all") }}
          </ion-button>
          <ion-menu-button menu="end" :disabled="!openOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="view-size-selector">
      <ion-searchbar class="better-name-here" :value="openOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)"/>
      <div v-if="openOrders.total">
        <div class="filters">
          <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
            <ion-checkbox slot="start" @ionChange="updateSelectedShipmentMethods(method.val)"/>
            <ion-label>
              {{ getShipmentMethodDesc(method.val) }}
              <p>{{ method.ordersCount }} {{ translate("orders") }}, {{ method.count }} {{ translate("items") }}</p>
            </ion-label>
          </ion-item>
        </div>

        <div class="results">
          <ion-button class="bulk-action desktop-only" size="large" @click="assignPickers">{{ translate("Print Picksheet") }}</ion-button>

          <ion-card class="order" v-for="(order, index) in getOpenOrders()" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ order.customerName }}</strong>
                  <p>{{ translate("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>

              <div class="order-tags">
                <ion-chip @click.stop="orderActionsPopover(order, $event)" outline>
                  <ion-icon :icon="pricetagOutline" />
                  <ion-label>{{ order.orderName }}</ion-label>
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </div>

              <div class="order-metadata">
                <ion-label>
                  {{ order.shipmentMethodTypeDesc }}
                  <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="item">
              <div class="order-item">
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
                  <ion-button fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
                  </ion-button>
                </div>
              </div>
            </div>

            <!-- TODO: add functionality to the buttons-->
            <!-- <div class="actions">
              <div class="positive-action"></div>
              <div class="negative-action">
                <ion-button fill="outline" color="danger">{{ translate("Recycle") }}</ion-button>
              </div>
            </div> -->
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreOpenOrders($event)" threshold="100px" :disabled="!isOpenOrdersScrollable()">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </div>
      </div>
      <ion-fab v-if="openOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="assignPickers">
          <ion-icon :icon="printOutline" />
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
  IonCheckbox, 
  IonContent, 
  IonFab, 
  IonFabButton, 
  IonHeader, 
  IonLabel, 
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem, 
  IonMenuButton,
  IonNote,
  IonPage, 
  IonSearchbar, 
  IonThumbnail, 
  IonTitle, 
  IonToolbar, 
  modalController,
  alertController,
  popoverController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { caretDownOutline, cubeOutline, optionsOutline, pricetagOutline, printOutline,} from 'ionicons/icons';
import AssignPickerModal from '@/views/AssignPickerModal.vue';
import { mapGetters, useStore } from 'vuex';
import { ShopifyImg } from '@hotwax/dxp-components';
import { formatUtcDate, getFeature, showToast } from '@/utils'
import { hasError } from '@/adapter';
import { UtilService } from '@/services/UtilService';
import { prepareOrderQuery } from '@/utils/solrHelper';
import ViewSizeSelector from '@/components/ViewSizeSelector.vue'
import emitter from '@/event-bus';
import logger from '@/logger';
import { translate } from '@hotwax/dxp-components';
import { UserService } from '@/services/UserService';
import { Actions, hasPermission } from '@/authorization'
import OrderActionsPopover from '@/components/OrderActionsPopover.vue'

export default defineComponent({
  name: 'OpenOrders',
  components: {
    ShopifyImg,
    IonButton,
    IonButtons,  
    IonCard,
    IonChip,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonLabel,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSearchbar,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ViewSizeSelector
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      openOrders: 'order/getOpenOrders',
      getProduct: 'product/getProduct',
      currentEComStore: 'user/getCurrentEComStore',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      getProductStock: 'stock/getProductStock'
    })
  },
  data () {
    return {
      shipmentMethods: [] as Array<any>,
      searchedQuery: ''
    }
  },
  methods: {
    getErrorMessage() {
      return this.searchedQuery === '' ? translate("doesn't have any outstanding orders right now.", { facilityName: this.currentFacility.facilityName }) : translate( "No results found for . Try searching In Progress or Completed tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: this.searchedQuery, lineBreak: '<br />' })
    },
    getOpenOrders() {
      return this.openOrders.list.slice(0, (this.openOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any) );
    },
    async loadMoreOpenOrders(event: any) {
      const openOrdersQuery = JSON.parse(JSON.stringify(this.openOrders.query))
      openOrdersQuery.viewIndex++;
      await this.store.dispatch('order/updateOpenOrderIndex', { ...openOrdersQuery })
      event.target.complete();
    },
    isOpenOrdersScrollable() {
      return ((this.openOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) <  this.openOrders.query.viewSize;
    },
    async updateSelectedShipmentMethods (method: string) {
      const openOrdersQuery = JSON.parse(JSON.stringify(this.openOrders.query))

      const selectedShipmentMethods = openOrdersQuery.selectedShipmentMethods
      const index = selectedShipmentMethods.indexOf(method)
      if (index < 0) {
        selectedShipmentMethods.push(method)
      } else {
        selectedShipmentMethods.splice(index, 1)
      }

      // making view size default when changing the shipment method to correctly fetch orders
      openOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      openOrdersQuery.selectedShipmentMethods = selectedShipmentMethods

      this.store.dispatch('order/updateOpenQuery', { ...openOrdersQuery })
    },
    async assignPickers() {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal
      });
      return assignPickerModal.present();
    },
    async fetchShipmentMethods() {
      let resp: any;

      const payload = prepareOrderQuery({
        queryFields: 'orderId',
        viewSize: '0',  // passed viewSize as 0 to not fetch any data
        filters: {
          quantityNotAvailable: { value: 0 },
          isPicked: { value: 'N' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          '-fulfillmentStatus': { value: 'Cancelled' },
          orderStatusId: { value: 'ORDER_APPROVED' },
          orderTypeId: { value: 'SALES_ORDER' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId }
        },
        facet: {
          "shipmentMethodTypeIdFacet":{
            "excludeTags":"shipmentMethodTypeIdFilter",
            "field":"shipmentMethodTypeId",
            "mincount":1,
            "limit":-1,
            "sort":"index",
            "type":"terms",
            "facet": {
              "ordersCount": "unique(orderId)"
            }
          }
        }
      })

      try {
        resp = await UtilService.fetchShipmentMethods(payload);
        if(resp.status == 200 && !hasError(resp) && resp.data.facets?.count > 0) {
          this.shipmentMethods = resp.data.facets.shipmentMethodTypeIdFacet.buckets
          this.store.dispatch('util/fetchShipmentMethodTypeDesc', this.shipmentMethods.map((shipmentMethod: any) => shipmentMethod.val))
        } else {
          throw resp.data;
        }
      } catch(err) {
        logger.error('Failed to fetch shipment methods information', err)
      }
    },
    async updateQueryString(queryString: string) {
      const openOrdersQuery = JSON.parse(JSON.stringify(this.openOrders.query))

      openOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      openOrdersQuery.queryString = queryString
      await this.store.dispatch('order/updateOpenQuery', { ...openOrdersQuery })
      this.searchedQuery = queryString;
    },
    async updateOrderQuery(size: any) {
      const openOrdersQuery = JSON.parse(JSON.stringify(this.openOrders.query))

      openOrdersQuery.viewSize = size
      await this.store.dispatch('order/updateOpenQuery', { ...openOrdersQuery })
    },
    async initialiseOrderQuery() {
      const openOrdersQuery = JSON.parse(JSON.stringify(this.openOrders.query))
      openOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      openOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('order/updateOpenQuery', { ...openOrdersQuery })
    },
    async recycleOutstandingOrders() {
      const alert = await alertController.create({
        header: translate('Reject all open orders'),
        message: translate('Reject open orders.', { ordersCount: this.openOrders.total }),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        }, {
          text: translate('Reject'),
          handler: async () => {
            let resp;

            try {
              resp = await UserService.recycleOutstandingOrders({
                "facilityId": this.currentFacility.facilityId,
                "productStoreId": this.currentEComStore.productStoreId,
                "reasonId": "INACTIVE_STORE"
              })

              if (!hasError(resp)) {
                showToast(translate('Rejecting has been started. All outstanding orders will be rejected shortly.'))
              } else {
                throw resp.data
              }
            } catch (err) {
              showToast(translate('Failed to reject outstanding orders'))
              logger.error('Failed to reject outstanding orders', err)
            }
          }
        }]
      });
      await alert.present();
    },
    async orderActionsPopover(order: any, ev: Event) {
      const popover = await popoverController.create({
        component: OrderActionsPopover,
        componentProps: { 
          order,
          category: 'open'
        },
        showBackdrop: false,
        event: ev
      });
      return popover.present();
    },
    fetchProductStock(productId: string) {
      this.store.dispatch('stock/fetchStock', { productId })
    }
  },
  async mounted () {
    emitter.on('updateOrderQuery', this.updateOrderQuery)
    await Promise.all([this.initialiseOrderQuery(), this.fetchShipmentMethods()]);
  },
  unmounted() {
    this.store.dispatch('order/clearOpenOrders');
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  setup() {
    const store = useStore();

    return{
      Actions,
      caretDownOutline,
      cubeOutline,
      formatUtcDate,
      getFeature,
      hasPermission,
      optionsOutline,
      pricetagOutline,
      printOutline,
      store,
      translate
    }
  }
});
</script>

<style scoped>
.order-tags{
  display: flex;
  justify-content: space-between;
}

@media (max-width: 991px) {
  .order-item {
    border-bottom: none;
  }
}
</style>