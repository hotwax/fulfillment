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
            <ion-item v-for="(item, index) in getMostRejectedItems()" :key="item.val" :lines="getMostRejectedItems().length - 1 === index ? 'none' : 'inset'">
              <ion-thumbnail slot="start" v-image-preview="getProduct(item.val)" :key="getProduct(item.val)?.mainImageUrl">
                <DxpShopifyImg :src="getProduct(item.val).mainImageUrl" :key="getProduct(item.val).mainImageUrl" size="small" />
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
            <ion-button :disabled="!getMostUsedReasons().length" @click="showAllReasonsModal()" fill="clear">
              {{ translate('View All') }}
            </ion-button>
          </ion-card-header>
          <ion-list v-if="getMostUsedReasons().length">
            <ion-item v-for="(reason, index) in getMostUsedReasons()" :key="reason.enumId" :lines="getMostUsedReasons().length - 1 === index ? 'none' : 'inset'">
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
        <ion-searchbar class="searchbar" :placeholder="translate('Search orders')" v-model="queryString" @keyup.enter="updateQueryString($event.target.value)" />
        <div></div>
        <ion-button :disabled="!rejectedOrders.list.length" expand="block" fill="outline" @click="downloadRejections()" class="ion-margin-end">
          <ion-icon slot="end" :icon="cloudDownloadOutline" />{{ translate("Download rejections") }}
        </ion-button>
      </div>
      <div v-if="rejectedOrders.list.length">
        <ion-card class="order" v-for="order in rejectedOrders.list" :key="order.orderId">
          <div class="order-header">
            <div class="order-primary-info">
              <ion-label>
                <strong>{{ order.customerName }}</strong>
                <p>{{ translate("Ordered") }} {{ commonUtil.formatUtcDate(order.orderDate, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
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
                <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ commonUtil.formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
              </ion-label>
            </div>
          </div>
          <div v-for="item in order.items" :key="item.orderItemSeqId" class="list-item">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl" size="small" />
                </ion-thumbnail>
                <ion-label>
                  <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
                </ion-label>
              </ion-item>
            </div>
            <ion-label>
              {{ commonUtil.formatUtcDate(item.rejectedAt, 'dd MMMM yyyy hh:mm a ZZZZ')}}
              <p>{{ translate('rejected time') }}</p>
            </ion-label>
            <ion-label lines="none">
              {{ item.availableToPromise }}
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
      </div>
      <div v-else class="empty-state">
        <p>{{ translate("No orders found.") }}</p>
      </div>
      <ion-infinite-scroll @ionInfinite="loadMoreRejectedOrders($event)" threshold="100px" v-show="isRejectedOrdersScrollable()" ref="infiniteScrollRef">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonCard, IonCardHeader, IonCardTitle, IonChip, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToolbar, modalController, onIonViewWillEnter } from "@ionic/vue";
import { computed, ref } from "vue";
import { cloudDownloadOutline, filterOutline, personCircleOutline, pricetagOutline } from "ionicons/icons";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { commonUtil } from "@/utils/commonUtil";
import RejectedItemsModal from "@/components/RejectedItemsModal.vue";
import UsedReasonsModal from "@/components/UsedReasonsModal.vue";
import RejectedOrdersFilters from "@/components/RejectedOrdersFilters.vue";
import DownloadRejectedOrdersModal from "@/components/DownloadRejectedOrdersModal.vue";
import { useRejectionStore } from "@/store/rejection";
import { useProductStore } from "@/store/product";

const queryString = ref("");
const rejectionPeriods = ref([] as any);
const searchedQuery = ref("");
const isScrollingEnabled = ref(false);

const contentRef = ref();
const infiniteScrollRef = ref();

const rejectionStats = computed(() => useRejectionStore().getRejectedStats);
const rejectedOrders = computed(() => useRejectionStore().getRejectedOrders);
const getProduct = (productId: string) => useProductStore().getProduct(productId);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

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

const isRejectedOrdersScrollable = () => {
  return rejectedOrders.value.list?.length > 0 && rejectedOrders.value.list?.length < rejectedOrders.value.total;
};

const initialiseRejectedOrderQuery = async () => {
  const rejectedOrdersQuery = JSON.parse(JSON.stringify(rejectedOrders.value.query));
  rejectedOrdersQuery.viewIndex = 0;
  rejectedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  await useRejectionStore().updateRejectedOrderQuery({ ...rejectedOrdersQuery });
};

const loadMoreRejectedOrders = async (event: any) => {
  if (!(isScrollingEnabled.value && isRejectedOrdersScrollable())) {
    await event.target.complete();
  }
  const rejectedOrdersQuery = JSON.parse(JSON.stringify(rejectedOrders.value.query));
  rejectedOrdersQuery.viewIndex = rejectedOrders.value.list?.length / (process.env.VUE_APP_VIEW_SIZE as any);
  await useRejectionStore().updateRejectedOrderQuery({ ...rejectedOrdersQuery });
  event.target.complete();
};

const getMostUsedReasons = () => {
  return rejectionStats.value.usedReasons && rejectionStats.value.usedReasons.length >= 3 ? rejectionStats.value.usedReasons.slice(0, 3) : rejectionStats.value.usedReasons;
};

const getMostRejectedItems = () => {
  return rejectionStats.value.rejectedItems && rejectionStats.value.rejectedItems.length >= 3 ? rejectionStats.value.rejectedItems.slice(0, 3) : rejectionStats.value.rejectedItems;
};

const showAllRejectedItemsModal = async () => {
  const rejectedItemsModal = await modalController.create({
    component: RejectedItemsModal
  });
  return rejectedItemsModal.present();
};

const showAllReasonsModal = async () => {
  const rejectedReasonsModal = await modalController.create({
    component: UsedReasonsModal
  });
  return rejectedReasonsModal.present();
};

const downloadRejections = async () => {
  const downloadRejectedOrdersModal = await modalController.create({
    component: DownloadRejectedOrdersModal,
    showBackdrop: false
  });
  await downloadRejectedOrdersModal.present();
};

const updateRejectionPeriod = async (rejectionPeriodId: string) => {
  const rejectedOrdersQuery = JSON.parse(JSON.stringify(rejectedOrders.value.query));
  rejectedOrdersQuery.rejectionPeriodId = rejectionPeriodId;
  await useRejectionStore().updateRejectedOrderQuery({ ...rejectedOrdersQuery });
};

const updateQueryString = async (query: string) => {
  const rejectedOrdersQuery = JSON.parse(JSON.stringify(rejectedOrders.value.query));

  rejectedOrdersQuery.viewIndex = 0;
  rejectedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE;
  rejectedOrdersQuery.queryString = query;
  await useRejectionStore().updateRejectedOrderQuery({ ...rejectedOrdersQuery });
  searchedQuery.value = query;
};

onIonViewWillEnter(async () => {
  rejectionPeriods.value = [{ id: "LAST_TWENTY_FOUR_HOURS", description: "Last 24 hours" }, { id: "LAST_SEVEN_DAYS", description: "Last 7 days" }];
  isScrollingEnabled.value = false;
  await initialiseRejectedOrderQuery();
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

.searchbar {
  padding-top: 0;
  padding-bottom: 0;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
</style>
