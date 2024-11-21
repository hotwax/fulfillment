<template>
  <ion-page>
    <TransferOrderFilters menu-id="transfer-order-filters" content-id="transfer-order-filters" :queryString="transferOrders.query.queryString" :shipmentMethods="shipmentMethods" :statuses="statuses"/>
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!transferOrders.total">{{ transferOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ transferOrders.list.length }} {{ translate('of') }} {{ transferOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="transfer-order-filters" :disabled="!transferOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="transfer-order-filters">
      <ion-searchbar class="searchbar" :value="transferOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)"/>
      <div v-if="transferOrders.total">
        <div class="results">
          <ion-list>
            <ion-item v-for="(order, index) in transferOrders.list" :key="index" @click="viewTransferOrderDetail(order)" button>
              <ion-label>
                <p class="overline">{{ order.orderId }}</p>
                {{ order.orderName }}
                <p>{{ order.externalId }}</p>
              </ion-label>
              <ion-badge slot="end">{{ order.orderStatusDesc }}</ion-badge>
            </ion-item>
          </ion-list>
             <!--
                When searching for a keyword, and if the user moves to the last item, then the didFire value inside infinite scroll becomes true and thus the infinite scroll does not trigger again on the same page(https://github.com/hotwax/users/issues/84).
                Also if we are at the section that has been loaded by infinite-scroll and then move to the details page then the list infinite scroll does not work after coming back to the page
                In ionic v7.6.0, an issue related to infinite scroll has been fixed that when more items can be added to the DOM, but infinite scroll does not fire as the window is not completely filled with the content(https://github.com/ionic-team/ionic-framework/issues/18071).
                The above fix in ionic 7.6.0 is resulting in the issue of infinite scroll not being called again.
                To fix this we have maintained another variable `isScrollingEnabled` to check whether the scrolling can be performed or not.
                If we do not define an extra variable and just use v-show to check for `isScrollable` then when coming back to the page infinite-scroll is called programatically.
                We have added an ionScroll event on ionContent to check whether the infiniteScroll can be enabled or not by toggling the value of isScrollingEnabled whenever the height < 0.
              -->
          <ion-infinite-scroll @ionInfinite="loadMoreTransferOrders($event)" threshold="100px" v-show="isTransferOrdersScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </div>
      </div>
      <div v-else class="empty-state">
        <p v-html="getErrorMessage()"></p>
        <ion-button v-if="!transferOrders.query.queryString && hasCompletedTransferOrders" size="small" fill="outline" color="medium" @click="showCompletedTransferOrders">
          <ion-icon slot="end" :icon="checkmarkDoneOutline"/>{{ translate("Show completed transfer orders") }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonBadge,
  IonButton,
  IonButtons,
  IonIcon,
  IonContent, 
  IonHeader, 
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem, 
  IonLabel, 
  IonList,
  IonMenuButton,
  IonPage, 
  IonSearchbar,
  IonTitle, 
  IonToolbar, 
} from '@ionic/vue';
import { defineComponent, computed } from 'vue';
import { caretDownOutline, checkmarkDoneOutline, cubeOutline, optionsOutline, pricetagOutline, printOutline,} from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { translate, useUserStore } from '@hotwax/dxp-components';
import { Actions } from '@/authorization'
import { escapeSolrSpecialChars, prepareOrderQuery } from '@/utils/solrHelper';
import { UtilService } from '@/services/UtilService';
import { hasError } from '@/adapter';
import logger from '@/logger';
import TransferOrderFilters from '@/components/TransferOrderFilters.vue'

export default defineComponent({
  name: 'TransferOrders',
  components: {
    IonBadge,
    IonButton,
    IonButtons,
    IonIcon,  
    IonContent,
    IonHeader,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonPage,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    TransferOrderFilters
  },
  computed: {
    ...mapGetters({
      transferOrders: 'transferorder/getTransferOrders',
      currentEComStore: 'user/getCurrentEComStore',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
    })
  },
  data () {
    return {
      shipmentMethods: [] as Array<any>,
      statuses: [] as Array<any>,
      searchedQuery: '',
      isScrollingEnabled: false,
      hasCompletedTransferOrders: true,
      transferOrderCount: 0
    }
  },
  async ionViewWillEnter() {
    this.isScrollingEnabled = false;
    await this.fetchFilters(); 
    if(this.transferOrderCount) { 
      await this.initialiseTransferOrderQuery();
    }
  },
  methods: {
    getErrorMessage() {
      if(!this.searchedQuery) {
        return this.hasCompletedTransferOrders ? translate("doesn't have any open transfer orders right now.", { facilityName: this.currentFacility.facilityName }) : translate("doesn't have any transfer orders right now.", { facilityName: this.currentFacility.facilityName });
      } else {
        return translate("No results found for .", { searchedQuery: this.searchedQuery });
      }
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
    async loadMoreTransferOrders(event: any) {
       // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
       if (!(this.isScrollingEnabled && this.isTransferOrdersScrollable())) {
        await event.target.complete();
      }
      const transferOrdersQuery = JSON.parse(JSON.stringify(this.transferOrders.query))
      transferOrdersQuery.viewIndex = this.transferOrders.list?.length / (process.env.VUE_APP_VIEW_SIZE as any);
      await this.store.dispatch('transferorder/updateTransferOrderQuery', { ...transferOrdersQuery })
      event.target.complete();
    },
    isTransferOrdersScrollable() {
      return this.transferOrders.list?.length > 0 && this.transferOrders.list?.length < this.transferOrders.total
    },
    async showCompletedTransferOrders() {
      const transferOrdersQuery = JSON.parse(JSON.stringify(this.transferOrders.query))
      transferOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      transferOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      transferOrdersQuery.selectedStatuses = ["ORDER_COMPLETED", "ORDER_APPROVED"]
      await this.store.dispatch('transferorder/updateTransferOrderQuery', { ...transferOrdersQuery })
      this.hasCompletedTransferOrders = this.transferOrders.list.some((order: any) => order.orderStatusId === "ORDER_COMPLETED");
    },
    async updateQueryString(queryString: string) {
      const transferOrdersQuery = JSON.parse(JSON.stringify(this.transferOrders.query))

      transferOrdersQuery.viewIndex = 0
      transferOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      transferOrdersQuery.queryString = queryString.trim()
      await this.store.dispatch('transferorder/updateTransferOrderQuery', { ...transferOrdersQuery })
      this.searchedQuery = queryString;
    },
    async fetchFilters() {
      let resp: any;
      const payload = prepareOrderQuery({
        docType: "ORDER",
        queryFields: 'orderId',
        viewSize: '0',  // passed viewSize as 0 to not fetch any data
        filters: {
          '-orderStatusId': { value: 'ORDER_CREATED' },
          orderTypeId: { value: 'TRANSFER_ORDER' },
          facilityId: { value: escapeSolrSpecialChars(this.currentFacility?.facilityId) },
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
          },
          "orderStatusIdFacet":{
            "excludeTags":"orderStatusIdFilter",
            "field":"orderStatusId",
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
        resp = await UtilService.fetchTransferOrderFacets(payload);
        if(resp.status == 200 && !hasError(resp)) {
          this.transferOrderCount = resp.data.facets?.count
          if(this.transferOrderCount) {
            this.shipmentMethods = resp.data.facets.shipmentMethodTypeIdFacet.buckets;
            this.statuses = resp.data.facets.orderStatusIdFacet.buckets;
            this.store.dispatch('util/fetchShipmentMethodTypeDesc', this.shipmentMethods.map((shipmentMethod: any) => shipmentMethod.val));
            this.store.dispatch('util/fetchStatusDesc', this.statuses.map((status: any) => status.val));
          }
        } else {
          throw resp.data;
        }
      } catch(err) {
        logger.error('Failed to fetch transfer order filters.', err)
      }
    },
    async initialiseTransferOrderQuery() {
      const transferOrdersQuery = JSON.parse(JSON.stringify(this.transferOrders.query))
      transferOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      transferOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('transferorder/updateTransferOrderQuery', { ...transferOrdersQuery })
    },
    async viewTransferOrderDetail(order: any) {
      await this.store.dispatch('transferorder/updateCurrentTransferOrder', order)
      this.router.push({ path: `/transfer-order-details/${order.orderId}` })
    },
  },
  ionViewDidLeave() {
    const routeTo = this.router.currentRoute;
    if (routeTo.value.name !== 'TransferOrderDetail') {
      this.store.dispatch('transferorder/clearTransferOrderFilters');
    }
    this.store.dispatch('transferorder/clearTransferOrdersList');
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return{
      Actions,
      caretDownOutline,
      checkmarkDoneOutline,
      cubeOutline,
      currentFacility,
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