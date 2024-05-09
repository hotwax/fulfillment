<template>
  <ion-page>
    <OrderLookupFilters menu-id="orderLookup-filter" content-id="orderLookup-filter"/>

    <ion-header :translucent="true">
      <ion-menu-button menu="start" slot="start" />
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ translate("Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="orderLookup-filter">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="orderLookup-filter">
      <div class="find">
        <main>
          <section class="sort">
            <div>
              <div class="search">
                <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; updateQueryString()"/>
              </div>

              <ion-item lines="none">
                <ion-icon slot="start" :icon="documentTextOutline" />
                <ion-toggle label-placement="start" color="secondary" :checked="showOrderItems" @ionChange="() => showOrderItems = !showOrderItems">{{ translate("Show order items") }}</ion-toggle>
              </ion-item>

              <ion-item lines="none">
                <ion-icon slot="start" :icon="swapVerticalOutline" />
                <ion-label class="ion-text-wrap">{{ "Sort" }}</ion-label>
                <ion-select :value="sort" @ionChange="sortOrders($event.detail.value)" interface="popover">
                  <ion-select-option value="orderDate desc">{{ "Oldest to newest" }}</ion-select-option>
                  <ion-select-option value="orderDate asc">{{ "Newest to oldest" }}</ion-select-option>
                </ion-select>
              </ion-item>
            </div>
          </section>

          <!-- Order Item Section -->
          <hr />

          <div v-if="ordersList.orders.length">
            <div v-for="(order, index) in ordersList.orders" :key="index" :order="order" @click="() => router.push(`/order-lookup/${order.orderId}`)">
              <section class="section-header">
                <div class="primary-info">
                  <ion-item lines="none">
                    <ion-label>
                      <strong>{{ order.orderId }}</strong>
                      <p>{{ order.customer.name }}</p>
                    </ion-label>
                  </ion-item>
                </div>
  
                <div class="tags">
                  <ion-chip @click.stop="copyToClipboard(order.orderName)" outline v-if="order.orderName">
                    <ion-icon :icon="pricetag" />
                    <ion-label>{{ order.orderName }}</ion-label>
                  </ion-chip>
                </div>
  
                <div class="metadata">
                  <ion-badge :color="getColorByDesc(order.orderStatusDesc) || getColorByDesc('default')">{{ order.orderStatusDesc }}</ion-badge>
                  <ion-note>{{ translate("Ordered on") }} {{ formatUtcDate(order.orderDate, "dd LLL yyyy") }}</ion-note>
                </div>
              </section>
  
              <section class="section-grid" v-if="showOrderItems">
                <OrderItemCard v-for="(item, index) in order.doclist.docs" :key="index" :item="item" />
              </section>
              <hr />
            </div>
          </div>
          <div v-else-if="isLoading" class="empty-state">
            <p>{{ "Loading..." }}</p>
          </div>
          <div v-else-if="query.queryString" class="empty-state">
            <p>{{ "No keyword matches the search criteria." }}</p>
          </div>
          <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" :disabled="!isScrollable">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </main>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonChip,
  IonContent,
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
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  menuController
} from '@ionic/vue';
import {
  closeOutline,
  documentTextOutline,
  downloadOutline,
  filterOutline,
  optionsOutline,
  pricetag,
  ribbon,
  swapVerticalOutline,
  syncOutline
} from 'ionicons/icons';
import { defineComponent, ref } from "vue";
import { mapGetters, useStore } from "vuex";
import { getColorByDesc, formatUtcDate, showToast } from '@/utils'
import { Plugins } from '@capacitor/core';
import { useRouter } from 'vue-router';
import OrderLookupFilters from '@/components/OrderLookupFilters.vue'
import OrderItemCard from '@/components/OrderItemCard.vue'
import { translate } from '@hotwax/dxp-components';

const { Clipboard } = Plugins;

export default defineComponent ({
  name: 'OrderLookup',
  components: {
    IonBackButton,
    IonBadge,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonSearchbar,
    IonTitle,
    IonToggle,
    IonToolbar,
    OrderLookupFilters,
    OrderItemCard
  },
  computed: {
    ...mapGetters({
      ordersList: 'orderLookup/getOrders',
      getProduct: 'product/getProduct',
      currentFacilityId: 'user/getCurrentFacility',
      getProductStock: 'stock/getProductStock',
      isScrollable: 'orderLookup/isScrollable',
      query: 'orderLookup/getOrderQuery',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      eComStores: 'util/getEcomStores'
    })
  },
  data() {
    return {
      sort: 'orderDate desc',
      showOrderItems: true,
      isLoading: false
    }
  },
  methods: {
    async closeMenu() {
      await menuController.close();
    },
    async sortOrders(value: string) {
      this.sort = value
      await this.store.dispatch('orderLookup/updateSort', this.sort)
    },
    async getOrders() {
      this.isLoading = true
      await this.store.dispatch('orderLookup/findOrders')
      this.isLoading = false
    },
    async updateQueryString() {
      this.isLoading = true
      await this.store.dispatch('orderLookup/updateAppliedFilters', { value: this.queryString, filterName: 'queryString' })
      this.isLoading = false
    },
    async copyToClipboard(text: any) {
      await Clipboard.write({
        string: text
      }).then(() => {
        showToast(translate('Copied', { text }));
      })
    },
    async loadMoreOrders(event: any) {
      this.isLoading = true
      await this.store.dispatch('orderLookup/findOrders', {
        viewSize: undefined,
        viewIndex: Math.ceil(this.ordersList.orders.length / 10).toString()
      }).then(() => {
        event.target.complete();
      })
      this.isLoading = false
    },
    async openOrderFilter() {
      await menuController.open();
    }
  },
  async mounted() {
    await this.getOrders();
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const queryString = ref();
    const orderStatus = JSON.parse(process.env.VUE_APP_ORDER_STATUS as any)
    const itemStatus = JSON.parse(process.env.VUE_APP_ITEM_STATUS as any)

    return {
      closeOutline,
      formatUtcDate,
      documentTextOutline,
      downloadOutline,
      filterOutline,
      itemStatus,
      pricetag,
      orderStatus,
      optionsOutline,
      ribbon,
      swapVerticalOutline,
      syncOutline,
      router,
      store,
      translate,
      queryString,
      getColorByDesc
    };
  },
});
</script>

<style scoped>
ion-menu {
  --width: 100%;
}
.section-header{
  margin: 0 var(--spacer-xs);
}

.metadata {
  text-align: end;
}

.metadata > ion-note {
  display: block;
}

main > div{
  cursor: pointer;
}

ion-modal {
  --width: 290px;
  --height: 382px;
  --border-radius: 8px;
}

.find > main {
  grid-area: main;
}

.search {
  grid-area: search;
  flex-grow: 1;
}

.sort {
  margin: var(--spacer-sm) 0;
}

.sort > div > :first-child{
  border-bottom: var(--border-medium);
}

.section-header {
  display: grid;
  grid-template-areas: "info metadata"
                       "tags tags";
  align-items: center;                     
}

.primary-info {
  grid-area: info;
}

.tags {
  grid-area: tags;
  justify-self: center;
}

.metadata {
  grid-area: metadata;
  justify-self: end;
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(343px, 1fr));
}

@media (min-width: 991px) {
  ion-menu {
    --width: 375px;
  }

  .main {
    margin-left: var(--spacer-xl);
  }

  .find {
    grid: "search  main" min-content
          "filters main" 1fr 
          / 375px; 
    column-gap: var(--spacer-2xl);      
    margin: var(--spacer-lg);                            
  }
  
  .section-header {
    grid: "info tags metadata" / 1fr max-content 1fr;
  }

  .sort {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    margin-bottom: var(--spacer-lg);
  }

  .sort > ion-item {
    flex-grow: 1;
  }

  .sort > div {
    display: flex;
    flex-grow: 2;
    justify-content: end;
  }

  .sort > div > ion-item {
    flex: 0 1 343px;
    border-left: var(--border-medium);
  }

  .sort > div > :first-child{
    border-bottom: unset;
  }

  .desktop-only {
    display: unset;
  }

  .mobile-only {
    display: none;
  }  

  .find > .filters{
    display: unset;
  }  

  .product,
  .products {
    margin-top: var(--spacer-lg);
  }

  ion-content > main {
    margin: var(--spacer-lg);
  }

  .list-item {
    --col-calc: var(--columns-desktop);
  }

  .list-item > * {
    display: unset;
  }

  .tablet {
    display: unset;
  }

  .header {
    display: grid;
    grid: "id       timeline" min-content
          "cards    timeline" 1fr
          / 1fr 500px;
    justify-content: space-between;  
  }

  .id {
    grid-area: id;
  }
  
  .info {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(314px, max-content));
    align-items: start;
    grid-area: cards;
  }
  
  .timeline {
    grid-area: timeline;
    border-left: var(--border-medium);
  }
}
</style>
