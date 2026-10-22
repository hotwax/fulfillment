<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="selectedSegment === 'packed'">{{ visiblePackedShipments.length }} {{ translate('packed shipments') }}</ion-title>
        <ion-title v-else-if="!transferOrders.total">{{ transferOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ visibleOrders.length }} {{ translate('of') }} {{ transferOrders.total }} {{ translate('orders') }}</ion-title>
      </ion-toolbar>
      <div class="filters">
        <ion-searchbar class="searchbar" v-model="queryString" />
        <ion-segment v-model="selectedSegment" @ionChange="resetPage()">
          <ion-segment-button data-testid="open-transfer-orders-tab" value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="packed-transfer-orders-tab" value="packed">
            <ion-label>{{ translate("Packed") }}<template v-if="packedShipments.total"> ({{ packedShipments.total }})</template></ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="completed-transfer-orders-tab" value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="transfer-order-filters">
      <template v-if="selectedSegment === 'packed'">
        <div v-if="visiblePackedShipments.length" class="results" data-testid="packed-shipments-list">
          <ion-list>
            <ion-item lines="full">
              <ion-icon :icon="informationCircleOutline" slot="start" color="warning" />
              <ion-label class="ion-text-wrap">
                <p>{{ translate("These shipments are packed but not shipped. The transfer order is not fulfilled until the shipment is shipped.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-for="shipment in visiblePackedShipments" :key="shipment.shipmentId" :data-testid="`packed-shipment-${shipment.shipmentId}`" @click="shipPackedShipment(shipment)" button detail>
              <ion-label>
                <p class="overline">{{ shipment.orderId }}</p>
                {{ shipment.orderName || shipment.orderExternalId || shipment.orderId }}
                <p>{{ translate("Shipment ID") }}: {{ shipment.shipmentId }}<template v-if="shipment.packageCount > 1"> · {{ shipment.packageCount }} {{ translate("packages") }}</template></p>
                <p v-if="shipment.packedDate">{{ translate("Packed on", { packedDate: getTime(shipment.packedDate) }) }}</p>
              </ion-label>
              <ion-badge slot="end" color="warning">{{ translate("Packed, not shipped") }}</ion-badge>
            </ion-item>
          </ion-list>
        </div>
        <ion-list v-else-if="!isPackedLoaded" data-testid="packed-shipments-loading">
          <ion-item v-for="row in 3" :key="row">
            <ion-label>
              <ion-skeleton-text animated class="skeleton-short" />
              <ion-skeleton-text animated class="skeleton-long" />
            </ion-label>
            <ion-skeleton-text slot="end" animated class="skeleton-badge" />
          </ion-item>
        </ion-list>
        <div v-else-if="packedShipments.hasError" class="empty-state" data-testid="packed-shipments-error-state">
          <p>{{ translate("Failed to fetch packed shipments") }}</p>
          <ion-button fill="outline" @click="retryPackedShipments()">{{ translate("Retry") }}</ion-button>
        </div>
        <div v-else class="empty-state" data-testid="packed-shipments-empty-state">
          <p>{{ queryString ? translate("No results found for .", { searchedQuery: queryString }) : translate("No packed shipments waiting to ship") }}</p>
        </div>
      </template>
      <div v-else-if="transferOrders.total">
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
import { IonBadge, IonButton, IonIcon, IonContent, IonFab, IonFabButton, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, modalController, onIonViewDidLeave, onIonViewWillEnter } from "@ionic/vue";
import { computed, ref } from "vue";
import { addOutline, informationCircleOutline } from "ionicons/icons";

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

// Packed shipments are not part of the synced transfer orders: they are fetched when the page is entered and when the Packed
// segment is opened, so the segment label shows how many shipments still have to be shipped.
const packedShipments = computed(() => useTransferOrderStore().getPackedShipments);
const isPackedLoaded = ref(false);
const visiblePackedShipments = computed(() => {
  const search = queryString.value.trim().toLowerCase();
  if(!search) {
    return packedShipments.value.list;
  }

  return packedShipments.value.list.filter((shipment: any) => [shipment.orderId, shipment.orderName, shipment.orderExternalId, shipment.shipmentId].some((value) => value?.toLowerCase().includes(search)));
});
const fetchPackedShipments = async () => {
  await useTransferOrderStore().findPackedShipments();
  isPackedLoaded.value = true;
};
watch(selectedSegment, (segment) => {
  if(segment === "packed") {
    fetchPackedShipments();
  }
});
watch(currentFacilityId, () => {
  isPackedLoaded.value = false;
  fetchPackedShipments();
});

// Opens the existing ship flow for a shipment that was packed earlier but never shipped
const shipPackedShipment = (shipment: any) => {
  router.push({ path: `/ship-transfer-order/${shipment.shipmentId}`, query: { from: "packed" } });
};

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
  return transferOrders.value.list?.length > 0 && transferOrders.value.list?.length < transferOrders.value.total;
};

const updateQueryString = async (queryString: string) => {
  const transferOrdersQuery = JSON.parse(JSON.stringify(transferOrders.value.query));

  if (selectedSegment.value === "packed") {
    transferOrdersQuery.queryString = queryString.trim();
    await useTransferOrderStore().updateTransferOrderIndex({ ...transferOrdersQuery });
    await useTransferOrderStore().findPackedShipments(transferOrdersQuery.queryString);
    searchedQuery.value = queryString;
    return;
  }

  transferOrdersQuery.viewIndex = 0;
  transferOrdersQuery.viewSize = 20;
  transferOrdersQuery.queryString = queryString.trim();
  if (selectedSegment.value === "completed") {
    transferOrdersQuery.orderStatusId = "";
    transferOrdersQuery.shipmentStatusId = "SHIPMENT_SHIPPED";
  } else {
    transferOrdersQuery.orderStatusId = "ORDER_APPROVED";
    transferOrdersQuery.shipmentStatusId = "";
  }

  await useTransferOrderStore().updateTransferOrderQuery({ ...transferOrdersQuery });
  searchedQuery.value = queryString;
};

const initialiseTransferOrderQuery = async () => {
  const transferOrdersQuery = JSON.parse(JSON.stringify(transferOrders.value.query));
  // Packed shipments are always fetched so the Packed segment label shows how many shipments are waiting to be shipped;
  // the search only narrows them while the Packed segment is open.
  const packedShipmentsRequest = useTransferOrderStore().findPackedShipments(selectedSegment.value === "packed" ? transferOrdersQuery.queryString : "");
  if (selectedSegment.value === "packed") {
    await packedShipmentsRequest;
    return;
  }
  transferOrdersQuery.viewIndex = 0;
  transferOrdersQuery.viewSize = 20;
  if (selectedSegment.value === "completed") {
    transferOrdersQuery.orderStatusId = "";
    transferOrdersQuery.shipmentStatusId = "SHIPMENT_SHIPPED";
  } else {
    transferOrdersQuery.orderStatusId = "ORDER_APPROVED";
    transferOrdersQuery.shipmentStatusId = "";
  }
  await Promise.all([useTransferOrderStore().updateTransferOrderQuery({ ...transferOrdersQuery }), packedShipmentsRequest]);
};

const retryPackedShipments = async () => {
  emitter.emit("presentLoader");
  await useTransferOrderStore().findPackedShipments(transferOrders.value.query.queryString);
  emitter.emit("dismissLoader");
};

// Opens the existing ship flow for a shipment that was packed earlier but never shipped
const shipPackedShipment = (shipment: any) => {
  router.push({ path: `/ship-transfer-order/${shipment.shipmentId}`, query: { from: "packed" } });
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
  // Returning from the ship flow of a packed shipment brings the user back to the Packed segment
  const previousSegment = selectedSegment.value;
  const returnSegment = useTransferOrderStore().consumeReturnSegment();
  if(returnSegment) {
    selectedSegment.value = returnSegment;
  }
  // A segment change fetches through the watcher
  if(selectedSegment.value === previousSegment) {
    fetchPackedShipments();
  }
});
</script>

<style scoped>
/* The filter row sits in the header but outside the toolbar. Without a background of its own it shows the header's elevation shadow as a gray band. */
.filters {
  background: var(--ion-background-color, #fff);
}

@media (min-width: 991px) {
  .filters {
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
