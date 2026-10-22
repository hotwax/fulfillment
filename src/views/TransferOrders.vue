<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="selectedSegment === 'packed'">{{ packedShipments.total }} {{ translate('packed shipments') }}</ion-title>
        <ion-title v-else-if="!transferOrders.total">{{ transferOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ transferOrders.list.length }} {{ translate('of') }} {{ transferOrders.total }} {{ translate('orders') }}</ion-title>
      </ion-toolbar>
      <div>
        <ion-searchbar class="searchbar" :value="transferOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)" />
        <ion-segment v-model="selectedSegment" @ionChange="segmentChanged()">
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
        <div v-if="packedShipments.total" class="results" data-testid="packed-shipments-list">
          <ion-list>
            <ion-item lines="full">
              <ion-icon :icon="informationCircleOutline" slot="start" color="warning" />
              <ion-label class="ion-text-wrap">
                <p>{{ translate("These shipments are packed but not shipped. The transfer order is not fulfilled until the shipment is shipped.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-for="shipment in packedShipments.list" :key="shipment.shipmentId" :data-testid="`packed-shipment-${shipment.shipmentId}`" @click="shipPackedShipment(shipment)" button detail>
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
        <div v-else class="empty-state" data-testid="packed-shipments-empty-state">
          <p>{{ searchedQuery ? translate("No results found for .", { searchedQuery }) : translate("No packed shipments waiting to ship") }}</p>
        </div>
      </template>
      <div v-else-if="transferOrders.total">
        <div class="results">
          <ion-list>
            <ion-item v-for="(order, index) in transferOrders.list" :key="index" @click="viewTransferOrderDetail(order)" button>
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
import { IonBadge, IonIcon, IonContent, IonFab, IonFabButton, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, modalController, onIonViewDidLeave, onIonViewWillEnter } from "@ionic/vue";
import { computed, ref } from "vue";
import { addOutline, informationCircleOutline } from "ionicons/icons";
import { emitter, translate } from "@common";

import { useProductStore as useAppProductStore } from "@/store/productStore";
import { DateTime } from "luxon";
import CreateTransferOrderModal from "@/components/CreateTransferOrderModal.vue";
import { useTransferOrderStore } from "@/store/transferorder";
import router from "@/router";

const searchedQuery = ref("");
const isScrollingEnabled = ref(false);
const hasCompletedTransferOrders = ref(true);
const selectedSegment = ref("open");

const contentRef = ref();
const infiniteScrollRef = ref();

const transferOrders = computed(() => useTransferOrderStore().getTransferOrders);
const packedShipments = computed(() => useTransferOrderStore().getPackedShipments);
const currentFacility = computed(() => useAppProductStore().getCurrentFacility);

const openCreateTransferOrderModal = async () => {
  const createTransferOrderModal = await modalController.create({
    component: CreateTransferOrderModal
  });

  return createTransferOrderModal.present();
};

const segmentChanged = () => {
  initialiseTransferOrderQuery();
};

const getErrorMessage = () => {
  if (!searchedQuery.value) {
    if (selectedSegment.value === "completed") {
      return translate("doesn't have any completed transfer orders right now.", { facilityName: currentFacility.value.facilityName });
    } else {
      return hasCompletedTransferOrders.value ? translate("doesn't have any open transfer orders right now.", { facilityName: currentFacility.value.facilityName }) : translate("doesn't have any transfer orders right now.", { facilityName: currentFacility.value.facilityName });
    }
  } else {
    return translate("No results found for .", { searchedQuery: searchedQuery.value });
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
  const transferOrdersQuery = JSON.parse(JSON.stringify(transferOrders.value.query));
  transferOrdersQuery.viewIndex = transferOrders.value.list?.length / 20;
  await useTransferOrderStore().updateTransferOrderQuery({ ...transferOrdersQuery });
  event.target.complete();
};

const isTransferOrdersScrollable = () => {
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

onIonViewWillEnter(async () => {
  emitter.emit("presentLoader");
  // Returning from the ship flow of a packed shipment brings the user back to the Packed segment
  const returnSegment = useTransferOrderStore().consumeReturnSegment();
  if (returnSegment) {
    selectedSegment.value = returnSegment;
  }
  isScrollingEnabled.value = false;
  await initialiseTransferOrderQuery();
  emitter.emit("dismissLoader");
});

onIonViewDidLeave(() => {
  const routeTo = router.currentRoute;
  if (routeTo.value.name !== "TransferOrderDetail") {
    useTransferOrderStore().clearTransferOrderFilters();
  }
  useTransferOrderStore().clearTransferOrdersList();
});
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }
}
</style>
