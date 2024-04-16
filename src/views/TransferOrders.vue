<template>
  <ion-page>
    <TransferOrderFilters menu-id="transfer-order-filters" content-id="transfer-order-filters" :queryString="transferOrders.query.queryString" />
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!transferOrders.total">{{ transferOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ transferOrders.list.length }} {{ translate('of') }} {{ transferOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="transfer-order-filters">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="transfer-order-filters">
      <ion-searchbar class="better-name-here" :value="transferOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)"/>
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

          <ion-infinite-scroll @ionInfinite="loadMoreTransferOrders($event)" threshold="100px" :disabled="!isTransferOrdersScrollable()" :key="transferOrders.query.queryString">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </div>
      </div>
      <div v-else class="empty-state">
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonBadge,
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
import { defineComponent } from 'vue';
import { caretDownOutline, cubeOutline, optionsOutline, pricetagOutline, printOutline,} from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { translate } from '@hotwax/dxp-components';
import { Actions } from '@/authorization'
import TransferOrderFilters from '@/components/TransferOrderFilters.vue'

export default defineComponent({
  name: 'TransferOrders',
  components: {
    IonBadge,
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
      currentFacility: 'user/getCurrentFacility',
      transferOrders: 'transferorder/getTransferOrders',
      currentEComStore: 'user/getCurrentEComStore',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
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
      return this.searchedQuery === '' ? translate("doesn't have any transfer orders right now.", { facilityName: this.currentFacility.facilityName }) : translate( "No results found for .", { searchedQuery: this.searchedQuery })
    },
    async loadMoreTransferOrders(event: any) {
      const transferOrdersQuery = JSON.parse(JSON.stringify(this.transferOrders.query))
      transferOrdersQuery.viewIndex = this.transferOrders.list?.length / (process.env.VUE_APP_VIEW_SIZE as any);
      await this.store.dispatch('transferorder/updateTransferOrderQuery', { ...transferOrdersQuery })
      event.target.complete();
    },
    isTransferOrdersScrollable() {
      return this.transferOrders.list?.length > 0 && this.transferOrders.list?.length < this.transferOrders.total
    },
    async updateQueryString(queryString: string) {
      const transferOrdersQuery = JSON.parse(JSON.stringify(this.transferOrders.query))

      transferOrdersQuery.viewIndex = 0
      transferOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      transferOrdersQuery.queryString = queryString
      await this.store.dispatch('transferorder/updateTransferOrderQuery', { ...transferOrdersQuery })
      this.searchedQuery = queryString;
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
  async mounted () {
    await this.initialiseTransferOrderQuery();
  },
  unmounted() {
    this.store.dispatch('transferorder/clearTransferOrders');
  },
  setup() {
    const router = useRouter();
    const store = useStore();

    return{
      Actions,
      caretDownOutline,
      cubeOutline,
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