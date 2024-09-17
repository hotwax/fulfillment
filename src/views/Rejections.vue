<template>
    <ion-page>
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-title>{{ translate("Rejections") }}</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
        <div class="rejection-summary">
          <ion-card>
            <ion-item lines="none">
              <ion-label class="rejection-count">
                {{ "4" }}
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-select :label="translate('Rejections')" interface="popover" v-model="selectedRejectionPeriod" @ionChange="fetchRejectionsStats(selectedRejectionPeriod)">
                <ion-select-option v-for="rejectionPeriod in rejectionPeriods" :key="rejectionPeriod.id" :value="rejectionPeriod.id">{{ rejectionPeriod.description }}</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-card>
          <ion-card>
            <ion-list>
              <ion-list-header color="light">
                <ion-label>{{ translate('Most rejected items') }}</ion-label>
                <ion-button  @click="showAllRejectedItemsModal()">
                  {{ translate('View All') }}
                </ion-button>
              </ion-list-header>
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
          </ion-card>
          <ion-card>
            <ion-list>
              <ion-list-header color="light">
                <ion-label>{{ translate('Most used reasons') }}</ion-label>
                <ion-button  @click="showAllReasonsModal()">
                  {{ translate('View All') }}
                </ion-button>
              </ion-list-header>
              <ion-item v-for="(reason, index) in getMostUsedReasons()" :key="reason.enumId" :lines="getMostUsedReasons().length -1 === index ? 'none' : 'inset'">
                <ion-label>
                  {{ reason.description }}
                  <p>{{ reason.enumTypeId }}</p>
                </ion-label>
                <ion-note slot="end"> {{ reason.count }}</ion-note>
              </ion-item>
            </ion-list>
          </ion-card>
        </div>
            
        <div class="rejection-search ion-margin-top">
          <ion-searchbar class="searchbar" :placeholder="translate('Search orders')" v-model="rejectedOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)"/>
          <ion-label>
            {{ translate("13 rejections") }}
          </ion-label>
          <ion-button expand="block" fill="outline" @click="downloadRejections()">
            <ion-icon slot="end" :icon="cloudDownloadOutline" />{{ translate("Download rejections") }}
          </ion-button>
        </div>
          <div class="results">
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
              <div v-for="item in order.items" :key="item.orderItemSeqId" class="order-line-item">
                <div class="order-item">
                  <div class="product-info">
                    <ion-item lines="none">
                      <ion-thumbnail slot="start">
                        <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                      </ion-thumbnail>
                      <ion-label>
                        <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                        {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
                        <ion-badge color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                      </ion-label>
                    </ion-item>
                  </div>
                  <div>
                    <ion-item>
                      <ion-label>
                        {{ "2024/01/01 23:10:10"}}
                        <p>{{ translate('rejected time') }}</p>
                      </ion-label>
                    </ion-item>
                  </div>
                  <div>
                    <ion-item>
                      <ion-label>
                        {{ "100"}}
                        <p>{{ translate('ATP') }}</p>
                      </ion-label>
                    </ion-item>
                  </div>
                  <div>
                    <ion-item>
                      <ion-label>
                        {{ "Not in stock"}}
                        <p>{{ translate('rejection reason') }}</p>
                      </ion-label>
                    </ion-item>
                  </div>
                  <div>
                    <ion-chip outline>
                      <ion-icon :icon="personCircleOutline" />
                      <ion-label>{{ order.orderName }}</ion-label>
                    </ion-chip>
                  </div>
                </div>
              </div>
            </ion-card>
            <ion-infinite-scroll @ionInfinite="loadMoreRejectedOrders($event)" threshold="100px"  v-show="isRejectedOrdersScrollable()" ref="infiniteScrollRef">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
            </ion-infinite-scroll>
          </div>
      </ion-content>
    </ion-page>
  </template>
  
  <script lang="ts">
  import {
    IonBadge,
    IonButton,
    IonCard,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonPage,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  } from '@ionic/vue';
  import { computed, defineComponent } from 'vue';
  import { addOutline, caretDownOutline, cloudDownloadOutline, ellipsisVerticalOutline, personCircleOutline, pricetagOutline } from 'ionicons/icons';
  import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
  import { mapGetters, useStore } from 'vuex';
  import { formatUtcDate } from '@/utils';
  import { isKit } from '@/utils/order'

  
  export default defineComponent({
    name: 'RejectionReasons',
    components: {
      IonBadge,
      IonButton,
      IonCard,
      IonChip,
      IonContent,
      IonHeader,
      IonIcon,
      IonInfiniteScroll,
      IonInfiniteScrollContent,
      IonItem,
      IonLabel,
      IonList,
      IonListHeader,
      IonNote,
      IonPage,
      IonSearchbar,
      IonSelect,
      IonSelectOption,
      IonThumbnail,
      IonTitle,
      IonToolbar,
    },
    data() {
      return {
        rejectionPeriods: [] as any,
        selectedRejectionPeriod: '',
        searchedQuery: '',
        isScrollingEnabled: false,
      }
    },
    computed: {
      ...mapGetters({
        rejectedItems: 'rejection/getRejectedItems',
        usedReasons: 'rejection/getUsedReasons',
        getProduct: 'product/getProduct',
        rejectedOrders: 'rejection/getRejectedOrders',
        currentFacility: 'user/getCurrentFacility',
      })
    },
    async ionViewWillEnter() {
      this.rejectionPeriods = [{"id": "LAST_TWENTY_FOUR_HOURS", "description": "Last 24 hours"}, {"id": "LAST_SEVEN_DAYS", "description": "Last 7 days"}]
      this.selectedRejectionPeriod = this.rejectionPeriods[0]?.id;
      await this.fetchRejectionsStats(this.selectedRejectionPeriod)
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
        return ((this.rejectedOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) <  this.rejectedOrders.query.viewSize;
      },
      async loadMoreRejectedOrders(event: any) {
        // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
        if (!(this.isScrollingEnabled && this.isRejectedOrdersScrollable())) {
          await event.target.complete();
        }
        const rejectedOrdersQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))
        rejectedOrdersQuery.viewIndex++;
        await this.store.dispatch('order/updateInProgressIndex', { ...rejectedOrdersQuery })
        event.target.complete();
      },
      async fetchRejectionsStats(selectedRejectionPeriod: string) {
        await this.store.dispatch('rejection/fetchRejectionStats', {rejectionPeriodId: selectedRejectionPeriod})
      },
      getMostUsedReasons() {
        return this.usedReasons && this.usedReasons.length >=3 ? this.usedReasons.slice(0, 3) : this.usedReasons;
      },
      getMostRejectedItems() {
        return this.rejectedItems && this.rejectedItems.length >=3 ? this.rejectedItems.slice(0, 3) : this.rejectedItems;
      },
      showAllRejectedItemsModal() {
        //logic here
      },
      showAllReasonsModal() {
        //logic here
      },
      downloadRejections() {
        //logic here
      },
      async updateQueryString(queryString: string) {
        const rejectedOrdersQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))

        rejectedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
        rejectedOrdersQuery.queryString = queryString
        await this.store.dispatch('order/updateInProgressQuery', { ...rejectedOrdersQuery })
        this.searchedQuery = queryString;
      },
      getErrorMessage() {
      return this.searchedQuery === '' ? translate("doesn't have any rejected orders right now.", { facilityName: this.currentFacility.facilityName }) : translate( "No results found for . Try switching stores.", { searchedQuery: this.searchedQuery})
    },
    },
    setup() {
      const store = useStore()
      const productIdentificationStore = useProductIdentificationStore();
      let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

  
      return {
        addOutline,
        caretDownOutline,
        cloudDownloadOutline,
        ellipsisVerticalOutline,
        formatUtcDate,
        getProductIdentificationValue,
        personCircleOutline,
        pricetagOutline,
        productIdentificationPref,
        store,
        translate,
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
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  .rejection-search {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(343px, 1fr));
    gap: var(--spacer-xs);
    align-items: center;
    margin-bottom: var(--spacer-lg);
  }
</style>
  