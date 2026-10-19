<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!transferOrders.total">{{ transferOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ visibleOrders.length }} {{ translate('of') }} {{ transferOrders.total }} {{ translate('orders') }}</ion-title>
      </ion-toolbar>
      <div>
        <ion-searchbar class="searchbar" v-model="queryString" />
        <ion-segment v-model="selectedSegment" @ionChange="resetPage()">
          <ion-segment-button data-testid="open-transfer-orders-tab" value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="completed-transfer-orders-tab" value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="transfer-order-filters">
      <div v-if="transferOrders.total">
        <div class="results">
          <ion-list>
            <ion-item v-for="order in visibleOrders" :key="order.orderId" @click="viewTransferOrderDetail(order)" button>
              <ion-label>
                <p class="overline">{{ order.orderId }}</p>
                {{ order.orderName }}
                <p>{{ order.orderExternalId ? order.orderExternalId : order.externalId }}</p>
              </ion-label>
              <ion-badge slot="end">{{ (selectedSegment === 'completed' && order.shipmentShippedDate) ? getTime(order.shipmentShippedDate) : order.orderStatusDesc }}</ion-badge>
            </ion-item>
          </ion-list>
          <ion-infinite-scroll @ionInfinite="loadMoreTransferOrders($event)" threshold="100px" v-show="isTransferOrdersScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </div>
      </div>
      <ion-list v-else-if="!isLoaded" data-testid="transfer-orders-loading">
        <ion-item v-for="row in 3" :key="row">
          <ion-label>
            <ion-skeleton-text animated class="skeleton-short" />
            <ion-skeleton-text animated class="skeleton-long" />
          </ion-label>
          <ion-skeleton-text slot="end" animated class="skeleton-badge" />
        </ion-item>
      </ion-list>
      <div v-else class="empty-state">
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button data-testid="create-transfer-order-btn" @click="openCreateTransferOrderModal">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonBadge, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSkeletonText, IonTitle, IonToolbar, modalController, onIonViewWillEnter } from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { addOutline } from "ionicons/icons";

import { useProductStore as useAppProductStore } from "@/store/productStore";
import { DateTime } from "luxon";
import CreateTransferOrderModal from "@/components/CreateTransferOrderModal.vue";
import { useLiveTransferOrders } from "@/composables/useLiveTransferOrders";
import { useTransferOrderStore } from "@/store/transferorder";
import { TRANSFER_ORDER_PAGE_SIZE } from "@/utils/transferOrderView";
import router from "@/router";

const queryString = ref("");
const isScrollingEnabled = ref(false);
const selectedSegment = ref("open");
const viewIndex = ref(0);

const contentRef = ref();
const infiniteScrollRef = ref();

// The transfer orders are read from the app database, which the sync keeps current, so the page never fetches its own list.
const currentFacility = computed(() => useAppProductStore().getCurrentFacility);
const currentFacilityId = computed(() => currentFacility.value?.facilityId as string | undefined);
const currentProductStoreId = computed(() => useAppProductStore().getCurrentProductStore?.productStoreId as string | undefined);
const live = useLiveTransferOrders({ facilityId: currentFacilityId, productStoreId: currentProductStoreId, stage: selectedSegment, query: queryString });
const isLoaded = live.loaded;
const visibleOrders = computed(() => live.orders.value.slice(0, (viewIndex.value + 1) * TRANSFER_ORDER_PAGE_SIZE));
// Shaped as the page has always read it.
const transferOrders = computed(() => ({ list: live.orders.value, total: live.orders.value.length }));

// A new search or segment starts again from the top.
const resetPage = () => { viewIndex.value = 0; };
watch(queryString, resetPage);

const openCreateTransferOrderModal = async () => {
  const createTransferOrderModal = await modalController.create({
    component: CreateTransferOrderModal
  });

  return createTransferOrderModal.present();
};

const getErrorMessage = () => {
  if (!queryString.value) {
    return translate(selectedSegment.value === "completed" ? "doesn't have any completed transfer orders right now." : "doesn't have any open transfer orders right now.", { facilityName: currentFacility.value?.facilityName });
  } else {
    return translate("No results found for .", { searchedQuery: queryString.value });
  }
};

const enableScrolling = () => {
  const parentElement = contentRef.value?.$el;
  const scrollEl = parentElement?.shadowRoot?.querySelector("main[part='scroll']");
  if (!scrollEl || !infiniteScrollRef.value?.$el) return;
  const scrollHeight = scrollEl.scrollHeight;
  const infiniteHeight = infiniteScrollRef.value.$el.offsetHeight;
  const scrollTop = scrollEl.scrollTop;
  const threshold = 100;
  const height = scrollEl.offsetHeight;
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height;
  isScrollingEnabled.value = !(distanceFromInfinite < 0);
};

const loadMoreTransferOrders = async (event: any) => {
  if (!(isScrollingEnabled.value && isTransferOrdersScrollable())) {
    await event.target.complete();
  }
  viewIndex.value++;
  event.target.complete();
};

const isTransferOrdersScrollable = () => {
  return visibleOrders.value.length < live.orders.value.length;
};

const viewTransferOrderDetail = async (order: any) => {
  await useTransferOrderStore().updateCurrentTransferOrder(order);
  router.push({ path: `/transfer-order-details/${order.orderId}/${selectedSegment.value}` });
};

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t a");
};

onIonViewWillEnter(() => {
  isScrollingEnabled.value = false;
  viewIndex.value = 0;
});
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }
}

.skeleton-short {
  width: 20%;
}

.skeleton-long {
  width: 60%;
}

.skeleton-badge {
  width: 70px;
  height: 20px;
}
</style>
