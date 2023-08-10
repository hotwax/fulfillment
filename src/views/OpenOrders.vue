<template>
  <ion-page>
    <ViewSizeSelector content-id="view-size-selector" />
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!openOrders.total">{{ openOrders.total }} {{ $t('orders') }}</ion-title>
        <ion-title v-else>{{ openOrders.query.viewSize }} {{ $t('of') }} {{ openOrders.total }} {{ $t('orders') }}</ion-title>
     
        <ion-buttons slot="end">
          <ion-button :disabled="!hasPermission(Actions.APP_RECYCLE_ORDER) || !openOrders.total" fill="clear" color="danger" @click="recycleOutstandingOrders()">
            {{ $t("Reject all") }}
          </ion-button>
          <ion-menu-button menu="end" :disabled="!openOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="view-size-selector">
      <ion-searchbar :value="openOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)"/>
      <div v-if="openOrders.total">
        <div class="filters">
          <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
            <ion-checkbox slot="start" @ionChange="updateSelectedShipmentMethods(method.val)"/>
            <ion-label>
              {{ getShipmentMethodDesc(method.val) }}
              <p>{{ method.ordersCount }} {{ $t("orders") }}, {{ method.count }} {{ $t("items") }}</p>
            </ion-label>
          </ion-item>
        </div>

        <div class="results">
          <ion-button class="bulk-action desktop-only" fill="outline" size="large" @click="assignPickers">{{ $t("Print Picksheet") }}</ion-button>

          <ion-card class="order" v-for="(orders, index) in getOpenOrders()" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ orders.doclist.docs[0].customerName }}</strong>
                  <p>{{ $t("Ordered") }} {{ formatUtcDate(orders.doclist.docs[0].orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>

              <div class="order-tags">
                <ion-chip @click="copyToClipboard(orders.doclist.docs[0].orderName, 'Copied to clipboard')" outline>
                  <ion-icon :icon="pricetagOutline" />
                  <ion-label>{{ orders.doclist.docs[0].orderName }}</ion-label>
                </ion-chip>
                <ion-button fill="clear" class="mobile-only" color="danger">
                  <ion-icon slot="icon-only" :icon="refreshCircleOutline" />
                </ion-button>
              </div>

              <div class="order-metadata">
                <ion-label>
                  {{ orders.doclist.docs[0].shipmentMethodTypeDesc }}
                  <p v-if="orders.doclist.docs[0].reservedDatetime">{{ $t("Last brokered") }} {{ formatUtcDate(orders.doclist.docs[0].reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="order in orders.doclist.docs" :key="order">
              <div class="order-item">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <Image :src="getProduct(order.productId).mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ order.productSku }}</p>
                      {{ order.virtualProductName }}
                      <p>{{ getFeature(getProduct(order.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(order.productId).featureHierarchy, '1/SIZE/')}}</p>
                    </ion-label>
                  </ion-item>
                </div>
              </div>
            </div>

            <!-- TODO: add functionality to the buttons-->
            <!-- <div class="actions">
              <div class="positive-action"></div>
              <div class="negative-action">
                <ion-button fill="outline" color="danger">{{ $t("Recycle") }}</ion-button>
              </div>
            </div> -->
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreOpenOrders($event)" threshold="100px" :disabled="!isOpenOrdersScrollable()">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
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
  IonPage, 
  IonSearchbar, 
  IonThumbnail, 
  IonTitle, 
  IonToolbar, 
  modalController,
  alertController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { optionsOutline, pricetagOutline, printOutline, refreshCircleOutline } from 'ionicons/icons';
import AssignPickerModal from '@/views/AssignPickerModal.vue';
import { mapGetters, useStore } from 'vuex';
import Image from '@/components/Image.vue'
import { copyToClipboard, formatUtcDate, getFeature, showToast } from '@/utils'
import { hasError } from '@/adapter';
import { UtilService } from '@/services/UtilService';
import { prepareOrderQuery } from '@/utils/solrHelper';
import ViewSizeSelector from '@/components/ViewSizeSelector.vue'
import emitter from '@/event-bus';
import logger from '@/logger';
import { translate } from '@/i18n';
import { UserService } from '@/services/UserService';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'OpenOrders',
  components: {
    Image,
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
      getShipmentMethodDesc: 'util/getShipmentMethodDesc'
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
      return this.searchedQuery === '' ? this.$t("doesn't have any outstanding orders right now.", { facilityName: this.currentFacility.name }) : this.$t( "No results found for . Try searching In Progress or Completed tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: this.searchedQuery, lineBreak: '<br />' })
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
        header: translate('Reject outstanding orders'),
        message: this.$t('Are you sure you want to reject outstanding order(s)?', { ordersCount: this.openOrders.total }),
        buttons: [{
          text: translate('No'),
          role: 'cancel'
        }, {
          text: translate('Yes'),
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
      copyToClipboard,
      formatUtcDate,
      getFeature,
      hasPermission,
      optionsOutline,
      pricetagOutline,
      printOutline,
      refreshCircleOutline,
      store
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