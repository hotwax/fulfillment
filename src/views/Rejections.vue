<template>
  <ion-page>
    <RejectedOrdersFilters menu-id="rejected-orders-filters" content-id="rejected-orders-filters" :queryString="rejectedOrders.query.queryString" />
  
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title>{{ translate("Rejections") }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="rejected-orders-filters">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="rejected-orders-filters">
      <div class="rejection-summary">
        <ion-card>
          <ion-item lines="none">
            <ion-label class="rejection-count">
              {{ rejectionStats.total }}
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-select :label="translate('Rejections')" interface="popover" :value="rejectedOrders.query.rejectionPeriodId" @ionChange="updateRejectionPeriod($event['detail'].value)">
              <ion-select-option v-for="rejectionPeriod in rejectionPeriods" :key="rejectionPeriod.id" :value="rejectionPeriod.id">{{ rejectionPeriod.description }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Most rejected items") }}
            </ion-card-title>
            <ion-button :disabled="!getMostRejectedItems().length" @click="showAllRejectedItemsModal()" fill="clear">
              {{ translate('View All') }}
            </ion-button>
          </ion-card-header>
          <ion-list v-if="getMostRejectedItems().length">
            <ion-item v-for="(item, index) in getMostRejectedItems()" :key="item.val" :lines="getMostRejectedItems().length -1 === index ? 'none' : 'inset'">
              <ion-thumbnail slot="start">
                <DxpShopifyImg :src="getProduct(item.val).mainImageUrl" size="small"/>
              </ion-thumbnail>
              <ion-label>
                <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.val)) }}</p>
                {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.val)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.val)) : item.val }}
              </ion-label>
              <ion-note slot="end">{{ item.count }}</ion-note>
            </ion-item>
          </ion-list>
          <div class="empty-state" v-else>
            <p>{{ translate("No data found") }}</p>
          </div>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Most used reasons") }}
            </ion-card-title>
            <ion-button :disabled="!getMostUsedReasons().length"  @click="showAllReasonsModal()" fill="clear">
              {{ translate('View All') }}
            </ion-button>
          </ion-card-header>
          <ion-list v-if="getMostUsedReasons().length">
            <ion-item v-for="(reason, index) in getMostUsedReasons()" :key="reason.enumId" :lines="getMostUsedReasons().length -1 === index ? 'none' : 'inset'">
              <ion-label>
                {{ reason.description }}
                <p>{{ reason.enumTypeId }}</p>
              </ion-label>
              <ion-note slot="end"> {{ reason.count }}</ion-note>
            </ion-item>
          </ion-list>
          <div class="empty-state" v-else>
            <p>{{ translate("No data found") }}</p>
          </div>
        </ion-card>
      </div>
          
      <div class="rejection-search">
        <ion-searchbar class="searchbar" :placeholder="translate('Search orders')" v-model="queryString" @keyup.enter="updateQueryString($event.target.value)"/>
        <ion-label>
          {{ rejectedOrders.total }} {{translate("rejections") }}
        </ion-label>
        
        <ion-button :disabled="!rejectedOrders.list.length" expand="block" fill="outline" @click="downloadRejections()" class="ion-margin-end">
          <ion-icon slot="end" :icon="cloudDownloadOutline" />{{ translate("Download rejections") }}
        </ion-button>
      </div>
      <ion-card class="order" v-for="order in rejectedOrders.list" :key="order.orderId">
        <div class="order-header">
          <div class="order-primary-info">
            <ion-label>
              <strong>{{ order.customerName }}</strong>
              <p>{{ translate("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
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
              {{ order.shipmentMethod }}
              <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
            </ion-label>
          </div>
        </div>
        <div v-for="item in order.items" :key="item.orderItemSeqId" class="list-item">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                </ion-thumbnail>
                <ion-label>
                  <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
                </ion-label>
              </ion-item>
            </div>
            <ion-label>
              {{ formatUtcDate(item.rejectedAt, 'dd MMMM yyyy t a ZZZZ')}}
              <p>{{ translate('rejected time') }}</p>
            </ion-label>
            <ion-label lines="none">
              {{ item.availableToPromise}}
              <p>{{ translate('ATP') }}</p>
            </ion-label>
            <ion-label>
              {{ item.rejectionReasonDesc }}
              <p>{{ translate('rejection reason') }}</p>
            </ion-label>
            <ion-chip outline>
              <ion-icon :icon="personCircleOutline" />
              <ion-label>{{ item.rejectedBy }}</ion-label>
            </ion-chip>
        </div>
      </ion-card>
      <ion-infinite-scroll @ionInfinite="loadMoreRejectedOrders($event)" threshold="100px"  v-show="isRejectedOrdersScrollable()" ref="infiniteScrollRef">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>
  
<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { addOutline, caretDownOutline, cloudDownloadOutline, ellipsisVerticalOutline, filterOutline, personCircleOutline, pricetagOutline } from 'ionicons/icons';
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { mapGetters, useStore } from 'vuex';
import { formatUtcDate, jsonToCsv } from '@/utils';
import RejectedItemsModal from '@/components/RejectedItemsModal.vue';
import UsedReasonsModal from '@/components/UsedReasonsModal.vue';
import RejectedOrdersFilters from '@/components/RejectedOrdersFilters.vue'
import DownloadRejectedOrdersModal from "@/components/DownloadRejectedOrdersModal.vue";

export default defineComponent({
  name: 'Rejections',
  components: {
    DxpShopifyImg,
    IonButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    RejectedOrdersFilters
  },
  data() {
    return {
      queryString: '',
      rejectionPeriods: [] as any,
      searchedQuery: '',
      isScrollingEnabled: false,
    }
  },
  computed: {
    ...mapGetters({
      rejectionStats: 'rejection/getRejectedStats',
      getProduct: 'product/getProduct',
      rejectedOrders: 'rejection/getRejectedOrders'
    })
  },
  async ionViewWillEnter() {
    this.rejectionPeriods = [{"id": "LAST_TWENTY_FOUR_HOURS", "description": "Last 24 hours"}, {"id": "LAST_SEVEN_DAYS", "description": "Last 7 days"}]
    this.isScrollingEnabled = false;
    await this.initialiseRejectedOrderQuery();
  },
  
  methods: {
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
    isRejectedOrdersScrollable() {
      return this.rejectedOrders.list?.length > 0 && this.rejectedOrders.list?.length < this.rejectedOrders.total
    },
    async initialiseRejectedOrderQuery() {
      const rejectedOrdersQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))
      rejectedOrdersQuery.viewIndex = 0 //If the size changes, list index should be reintialised
      rejectedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('rejection/updateRejectedOrderQuery', { ...rejectedOrdersQuery })
    },
    async loadMoreRejectedOrders(event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if (!(this.isScrollingEnabled && this.isRejectedOrdersScrollable())) {
        await event.target.complete();
      }
      const rejectedOrdersQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))
      rejectedOrdersQuery.viewIndex = this.rejectedOrders.list?.length / (process.env.VUE_APP_VIEW_SIZE as any);
      await this.store.dispatch('rejection/updateRejectedOrderQuery', { ...rejectedOrdersQuery })
      event.target.complete();
    },
    getMostUsedReasons() {
      return this.rejectionStats.usedReasons && this.rejectionStats.usedReasons.length >=3 ? this.rejectionStats.usedReasons.slice(0, 3) : this.rejectionStats.usedReasons;
    },
    getMostRejectedItems() {
      return this.rejectionStats.rejectedItems && this.rejectionStats.rejectedItems.length >=3 ? this.rejectionStats.rejectedItems.slice(0, 3) : this.rejectionStats.rejectedItems;
    },
    async showAllRejectedItemsModal() {
      const rejectedItemsModal = await modalController.create({
        component: RejectedItemsModal
      });
      return rejectedItemsModal.present();
    },
    async showAllReasonsModal() {
      const rejectedReasonsModal = await modalController.create({
        component: UsedReasonsModal
      });
      return rejectedReasonsModal.present();
    },
    async downloadRejections() {
      const downloadRejectedOrdersModal = await modalController.create({
        component: DownloadRejectedOrdersModal,
        showBackdrop: false,
      });
      await downloadRejectedOrdersModal.present();
    },
    async updateRejectionPeriod(rejectionPeriodId: string) {
      const rejectedOrdersQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))
      rejectedOrdersQuery.rejectionPeriodId = rejectionPeriodId
      await this.store.dispatch('rejection/updateRejectedOrderQuery', { ...rejectedOrdersQuery })
    },
    async updateQueryString(queryString: string) {
      const rejectedOrdersQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))

      rejectedOrdersQuery.viewIndex = 0
      rejectedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      rejectedOrdersQuery.queryString = queryString
      await this.store.dispatch('rejection/updateRejectedOrderQuery', { ...rejectedOrdersQuery })
      this.searchedQuery = queryString;
    },
    getErrorMessage() {
    return this.searchedQuery === '' ? translate("doesn't have any rejected orders right now.", { facilityName: this.currentFacility.facilityName }) : translate( "No results found for . Try switching stores.", { searchedQuery: this.searchedQuery})
  },
  },
  setup() {
    const store = useStore()
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 


    return {
      addOutline,
      caretDownOutline,
      cloudDownloadOutline,
      ellipsisVerticalOutline,
      filterOutline,
      formatUtcDate,
      getProductIdentificationValue,
      personCircleOutline,
      pricetagOutline,
      productIdentificationPref,
      store,
      translate,
      currentFacility
    }
  }
});
</script>
<style scoped>
.rejection-count {
  font-size: 128px;
  font-weight: 400
}
.rejection-summary {
  display: grid;
  align-items: start;
  grid-template-columns: repeat(auto-fill, minmax(343px, 1fr));
  margin-bottom: var(--spacer-lg);
}
.rejection-summary > ion-card:first-child {
  margin-left: var(--spacer-sm);
}
.rejection-search {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(343px, 1fr));
  margin-bottom: var(--spacer-lg);
  align-items: center;
}
.list-item {
  --columns-desktop: 5;
}

.searchbar{
  padding-top: 0;
}
ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
</style>
