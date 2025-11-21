<template>
  <ion-page :key="router.currentRoute.value.path">
    <ViewSizeSelector menu-id="view-size-selector-open" content-id="view-size-selector" />
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!openOrders.total">{{ openOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ openOrders.query.viewSize }} {{ translate('of') }} {{ openOrders.total }} {{ translate('orders') }}</ion-title>
     
        <ion-buttons slot="end">
          <ion-button @click="viewNotifications()">
            <ion-icon slot="icon-only" :icon="notificationsOutline" :color="(unreadNotificationsStatus && notifications.length) ? 'primary' : ''" />
          </ion-button>
          <ion-button :disabled="!hasPermission(Actions.APP_RECYCLE_ORDER) || !openOrders.total || isRejecting" fill="clear" color="danger" @click="recycleOutstandingOrders()">
            {{ translate("Reject all") }}
          </ion-button>
          <ion-menu-button menu="view-size-selector-open" :disabled="!openOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="view-size-selector">
      <ion-searchbar class="searchbar" :value="openOrders.query.queryString" :placeholder="translate('Search orders')" @keyup.enter="updateQueryString($event.target.value)"/>
      <div class="filters">
        <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
          <ion-checkbox label-placement="end" :checked="openOrders.query.selectedShipmentMethods.includes(method.val)" @ionChange="updateSelectedShipmentMethods(method.val)">
            <ion-label>
              {{ getShipmentMethodDesc(method.val) }}
              <p>{{ method.ordersCount }} {{ translate("orders") }}, {{ method.count }} {{ translate("items") }}</p>
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>
      <Component :is="productCategoryFilterExt" :orderQuery="openOrders.query" :currentFacility="currentFacility" :currentEComStore="currentEComStore" @updateOpenQuery="updateOpenQuery" />
      <div v-if="openOrders.total">

        <div class="results">
          <ion-button class="bulk-action desktop-only" size="large" @click="assignPickers">{{ translate("Print Picklist") }}</ion-button>

          <ion-card class="order" v-for="(order, index) in getOpenOrders()" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ order.customerName }}</strong>
                  <p>{{ translate("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
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
                  {{ getShipmentMethodDesc(order.shipmentMethodTypeId) }}
                  <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="order.orderId + item.orderItemSeqId" class="order-line-item">
              <div class="order-item">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                      <!-- TODO: Currently handled product image mismatch on the order list page — needs to be applied to other pages using DxpShopifyImg  -->
                      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl" size="small"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                      <div>
                        {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                        <ion-badge class="kit-badge" color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                      </div>
                      <p>{{ getFeatures(getProduct(item.productId).productFeatures)}}</p>
                    </ion-label>
                  </ion-item>
                </div>
                <div class="product-metadata">
                  <ion-button v-if="isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item)">
                    <ion-icon v-if="item.showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline"/>
                    <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline"/>
                  </ion-button>
                  <ion-note v-if="getProductStock(item.productId).qoh">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                  <ion-button fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
                  </ion-button>
                </div>
              </div>
              <div v-if="item.showKitComponents && !getProduct(item.productId)?.productComponents" class="kit-components">
                <ion-item lines="none">
                  <ion-skeleton-text animated style="height: 80%;"/>
                </ion-item>
                <ion-item lines="none">
                  <ion-skeleton-text animated style="height: 80%;"/>
                </ion-item>
              </div>
              <div v-else-if="item.showKitComponents && getProduct(item.productId)?.productComponents" class="kit-components">
                <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" v-image-preview="getProduct(productComponent.productIdTo)" :key="getProduct(productComponent.productIdTo)?.mainImageUrl">
                      <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" :key="getProduct(productComponent.productIdTo).mainImageUrl" size="small"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                      {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                      <p>{{ getFeatures(getProduct(productComponent.productIdTo).productFeatures)}}</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
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

          <ion-infinite-scroll @ionInfinite="loadMoreOpenOrders($event)" threshold="100px" v-show="isOpenOrdersScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </div>
      </div>
      <div v-if="isLoadingOrders" class="ion-padding ion-text-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      <ion-fab v-else-if="openOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
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
  IonBadge,
  IonButton, 
  IonButtons, 
  IonCard, 
  IonChip, 
  IonCheckbox, 
  IonContent, 
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
  IonSkeletonText,
  IonThumbnail, 
  IonTitle, 
  IonToolbar, 
  modalController,
  alertController,
  popoverController
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { caretDownOutline, chevronUpOutline, cubeOutline, listOutline, notificationsOutline, optionsOutline, pricetagOutline, printOutline,} from 'ionicons/icons';
import AssignPickerModal from '@/views/AssignPickerModal.vue';
import { mapGetters, useStore } from 'vuex';
import { getProductIdentificationValue, DxpShopifyImg, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { formatUtcDate, getFeatures, getFacilityFilter, hasActiveFilters, showToast } from '@/utils'
import { hasError } from '@/adapter';
import { UtilService } from '@/services/UtilService';
import { prepareSolrQuery } from '@/utils/solrHelper';
import ViewSizeSelector from '@/components/ViewSizeSelector.vue'
import emitter from '@/event-bus';
import logger from '@/logger';
import { translate } from '@hotwax/dxp-components';
import { UserService } from '@/services/UserService';
import { Actions, hasPermission } from '@/authorization'
import OrderActionsPopover from '@/components/OrderActionsPopover.vue'
import { isKit } from '@/utils/order'
import { OrderService } from '@/services/OrderService'
import { useDynamicImport } from "@/utils/moduleFederation";
import { useRouter } from "vue-router";

export default defineComponent({
  name: 'OpenOrders',
  components: {
    DxpShopifyImg,
    IonBadge,
    IonButton,
    IonButtons,  
    IonCard,
    IonChip,
    IonCheckbox,
    IonContent,
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
    IonSkeletonText,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ViewSizeSelector
  },
  computed: {
    ...mapGetters({
      openOrders: 'order/getOpenOrders',
      getProduct: 'product/getProduct',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      getProductStock: 'stock/getProductStock',
      notifications: 'user/getNotifications',
      unreadNotificationsStatus: 'user/getUnreadNotificationsStatus',
      instanceUrl: "user/getInstanceUrl"
    })
  },
  data () {
    return {
      shipmentMethods: [] as Array<any>,
      searchedQuery: '',
      isScrollingEnabled: false,
      isRejecting: false,
      productCategoryFilterExt: "" as any,
      selectedShipmentMethods: [] as any,
      isLoadingOrders: false
    }
  },
  methods: {
    updateOpenQuery(payload: any) {
      this.store.dispatch("order/updateOpenQuery", payload)
    },
    getErrorMessage() {
      return this.searchedQuery ? (hasActiveFilters(this.openOrders.query) ? translate("No results found for . Try using different filters.", { searchedQuery: this.searchedQuery }) : translate("No results found for . Try searching In Progress or Completed tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: this.searchedQuery, lineBreak: '<br />' })) : translate("doesn't have any outstanding orders right now.", { facilityName: this.currentFacility?.facilityName });
    },
    viewNotifications() {
      this.store.dispatch('user/setUnreadNotificationsStatus', false)
      this.$router.push({ path: '/notifications' })
    },
    getOpenOrders() {
      return JSON.parse(JSON.stringify(this.openOrders.list)).slice(0, (this.openOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
    },
    enableScrolling() {
      const parentElement = (this as any).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this as any).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
    async loadMoreOpenOrders(event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if (!(this.isScrollingEnabled && this.isOpenOrdersScrollable())) {
        await event.target.complete();
      }
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
      this.selectedShipmentMethods = selectedShipmentMethods

      this.store.dispatch('order/updateOpenQuery', { ...openOrdersQuery })
    },
    async fetchKitComponents(orderItem: any) {
      this.store.dispatch('product/fetchProductComponents', { productId: orderItem.productId })
      
      //update the order in order to toggle kit components section
      const updatedOrder = this.openOrders.list.find((order: any) => order.orderId === orderItem.orderId);
      const updatedItem = updatedOrder.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId)
      updatedItem.showKitComponents = orderItem.showKitComponents ? false : true
    },
    async assignPickers() {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal
      });
      return assignPickerModal.present();
    },
    async fetchShipmentMethods() {
      let resp: any;

      const payload = prepareSolrQuery({
        docType: 'ORDER',
        viewSize: '0',  // passed viewSize as 0 to not fetch any data
        isGroupingRequired: false,
        filters: {
          '-shipmentMethodTypeId': { value: ['STOREPICKUP', 'POS_COMPLETED'] },
          orderStatusId: { value: 'ORDER_APPROVED' },
          orderTypeId: { value: 'SALES_ORDER' },
          productStoreId: { value: this.currentEComStore.productStoreId },
          ...getFacilityFilter(this.currentFacility?.facilityId)
        },
        solrFilters: [
          //it should be explicit what is subtracting the first part of your OR statement from
          "((*:* -fulfillmentStatus: [* TO *]) OR fulfillmentStatus:Created)",
          "entryDate:[2025-01-01T00:00:00Z TO *]"
        ],
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
      if(this.selectedShipmentMethods?.length) openOrdersQuery.selectedShipmentMethods = this.selectedShipmentMethods
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
            this.isRejecting = true;
            emitter.emit("presentLoader")
            await alert.dismiss()
            
            let resp;

            try {
              resp = await OrderService.recycleOutstandingOrders({
                "facilityId": this.currentFacility?.facilityId,
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
            emitter.emit("dismissLoader")
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
  async ionViewWillEnter () {
    this.isScrollingEnabled = false;
    this.isLoadingOrders = true;
    try {
      await Promise.all([this.initialiseOrderQuery(), this.fetchShipmentMethods()]);
    } finally {
      this.isLoadingOrders = false;
    }
    // Remove http://, https://, /api, or :port
    const instance = this.instanceUrl.split("-")[0].replace(new RegExp("^(https|http)://"), "").replace(new RegExp("/api.*"), "").replace(new RegExp(":.*"), "")
    this.productCategoryFilterExt = await useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_ProductCategoryFilter`});
    emitter.on("updateOrderQuery", this.updateOrderQuery);
  },
  beforeRouteLeave() {
    this.store.dispatch('order/clearOpenOrders');
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 
    let currentEComStore: any = computed(() => userStore.getCurrentEComStore)

    return{
      Actions,
      caretDownOutline,
      chevronUpOutline,
      cubeOutline,
      currentEComStore,
      currentFacility,
      formatUtcDate,
      getFeatures,
      getFacilityFilter,
      getProductIdentificationValue,
      hasActiveFilters,
      hasPermission,
      isKit,
      listOutline,
      notificationsOutline,
      optionsOutline,
      pricetagOutline,
      printOutline,
      productIdentificationPref,
      router,
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