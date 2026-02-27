<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!transferOrders.total">{{ transferOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ transferOrders.list.length }} {{ translate('of') }} {{ transferOrders.total }} {{ translate('orders') }}</ion-title>
      </ion-toolbar>
      <div>
        <ion-searchbar class="searchbar" :value="transferOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)" />
        <ion-segment v-model="selectedSegment" @ionChange="segmentChanged()">
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
import { useRouter } from "vue-router";
import { addOutline } from "ionicons/icons";
import { translate, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import emitter from "@/event-bus";
import { DateTime } from "luxon";
import CreateTransferOrderModal from "@/components/CreateTransferOrderModal.vue";
import { useTransferOrderStore } from "@/store/transferorder";

const router = useRouter();
const searchedQuery = ref("");
const isScrollingEnabled = ref(false);
const hasCompletedTransferOrders = ref(true);
const selectedSegment = ref("open");

const contentRef = ref();
const infiniteScrollRef = ref();

const transferOrders = computed(() => useTransferOrderStore().getTransferOrders);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);

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
  transferOrdersQuery.viewIndex = 0;
  transferOrdersQuery.viewSize = 20;
  if (selectedSegment.value === "completed") {
    transferOrdersQuery.orderStatusId = "";
    transferOrdersQuery.shipmentStatusId = "SHIPMENT_SHIPPED";
  } else {
    transferOrdersQuery.orderStatusId = "ORDER_APPROVED";
    transferOrdersQuery.shipmentStatusId = "";
  }
  await useTransferOrderStore().updateTransferOrderQuery({ ...transferOrdersQuery });
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
