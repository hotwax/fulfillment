<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Dashboard") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="fulfillment">
        <ion-card class="fill-rate">
          <ion-item lines="none">
            <ion-label>
              <p class="overline">
                {{ translate("{date} fill rate", { date: commonUtil.getDateWithOrdinalSuffix(now.toMillis()) }) }}
              </p>
            </ion-label>
            <ion-button id="fill-rate-info" slot="end" fill="clear" color="medium" :aria-label="translate('Fill rate')">
              <ion-icon slot="icon-only" :icon="informationCircleOutline" />
            </ion-button>
            <ion-popover trigger="fill-rate-info" trigger-action="click">
              <ion-content class="ion-padding">
                {{ translate("The percentage of orders packed rather than rejected today.") }}
              </ion-content>
            </ion-popover>
          </ion-item>
          <ion-spinner v-if="loading" class="ion-margin-horizontal" name="crescent" />
          <p v-else class="big-number">
            {{ rate === undefined ? "-" : `${rate}%` }}
          </p>
          <ion-list lines="none">
            <ion-item>
              <ion-label>{{ translate("Orders allocated") }}</ion-label>
              <ion-label slot="end">
                {{ allocatedCount }}/{{ currentFacility?.maximumOrderLimit ?? translate("Unlimited") }}
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Orders packed") }}</ion-label>
              <ion-label slot="end" color="success">
                {{ packedCount }}
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Orders rejected") }}</ion-label>
              <ion-label slot="end" color="danger">
                {{ rejectedCount }}
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card class="orders">
          <ion-item lines="none" class="title">
            <ion-label>
              <p class="overline">
                {{ translate("Orders pending fulfillment") }}
              </p>
            </ion-label>
          </ion-item>
          <div class="pending">
            <ion-spinner v-if="loading" class="ion-margin-horizontal" name="crescent" />
            <p v-else class="big-number">
              {{ openOrderIds.size + inProgressOrderIds.size }}
            </p>
            <ion-label v-if="oldestPending">
              <p>{{ translate("Oldest order assigned") }}</p>
              {{ oldestPending }}
            </ion-label>
          </div>
          <ion-list class="fulfill">
            <ion-item lines="full" button detail @click="router.push('/open')">
              <ion-icon slot="start" :icon="mailUnreadOutline" />
              <ion-label>{{ translate("{count} open", { count: openOrderIds.size }) }}</ion-label>
            </ion-item>
            <ion-item lines="none" button detail @click="router.push('/in-progress')">
              <ion-icon slot="start" :icon="mailOpenOutline" />
              <ion-label>{{ translate("{count} in progress", { count: inProgressOrderIds.size }) }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <!-- The layers start at the left edge, so each one shows past the one in front of it. -->
        <div class="fulfillment-progress-bar" aria-hidden="true">
          <ion-progress-bar color="primary" :value="0" :style="{ width: progress.allocated }" />
          <ion-progress-bar color="danger" :value="1" :style="{ width: progress.handled }" />
          <ion-progress-bar color="success" :value="1" :style="{ width: progress.packed }" />
        </div>

        <div v-if="closesAt" class="scheduling">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="storefrontOutline" color="danger" />
            <ion-label>
              {{ closesAt > now ? translate("Store closes {time}", { time: closesAt.toRelative() }) : translate("Store closed") }}
              <p>{{ closesAt.toLocaleString(DateTime.TIME_SIMPLE) }}</p>
            </ion-label>
          </ion-item>
        </div>
      </div>

      <div class="staff-performance">
        <h1>{{ translate("Staff performance") }}</h1>
        <div class="staff-list">
          <ion-card>
            <ion-item lines="none">
              <ion-label>
                <p class="overline">
                  {{ translate("Most orders picked") }}
                </p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <h1>{{ mostPicked?.name ?? "-" }}</h1>
                <p v-if="mostPicked">
                  {{ translate("{count} orders", { count: mostPicked.picked }) }}
                </p>
              </ion-label>
            </ion-item>
          </ion-card>
          <ion-card>
            <ion-item lines="none">
              <ion-label>
                <p class="overline">
                  {{ translate("Fastest fulfiller") }}
                </p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <h1>{{ fastestPacker?.name ?? "-" }}</h1>
                <p v-if="fastestPacker">
                  {{ translate("{duration} average", { duration: formatDuration(fastestPacker.avgPackMs) }) }}
                </p>
              </ion-label>
            </ion-item>
          </ion-card>
        </div>
      </div>

      <ion-list>
        <div v-for="picker in pickers" :key="picker.partyId" class="list-item" @click="openPickerOrders(picker)">
          <ion-item lines="none">
            <ion-avatar slot="start">
              <DxpShopifyImg />
            </ion-avatar>
            <ion-label>{{ picker.name || translate("Not on a picklist") }}</ion-label>
          </ion-item>
          <ion-label>
            {{ picker.picked }}
            <p>{{ translate("picked") }}</p>
          </ion-label>
          <ion-label>
            {{ picker.packed }}
            <p>{{ translate("packed") }}</p>
          </ion-label>
          <ion-label>
            {{ picker.rejected }}
            <p>{{ translate("rejected") }}</p>
          </ion-label>
          <ion-label>
            {{ formatDuration(picker.avgPackMs) }}
            <p>{{ translate("average time") }}</p>
          </ion-label>
        </div>
        <div v-if="!loading && !pickers.length" class="empty-state">
          <p>{{ translate("No picking activity today") }}</p>
        </div>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { DxpShopifyImg, commonUtil, translate } from "@common";
import { IonAvatar, IonButton, IonCard, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonPopover, IonProgressBar, IonSpinner, IonTitle, IonToolbar, modalController, onIonViewWillEnter } from "@ionic/vue";
import { informationCircleOutline, mailOpenOutline, mailUnreadOutline, storefrontOutline } from "ionicons/icons";
import { DateTime } from "luxon";
import { computed, watch } from "vue";
import PickerOrdersModal from "@/components/PickerOrdersModal.vue";
import { useStorePerformance } from "@/composables/useStorePerformance";
import router from "@/router";
import { useProductStore } from "@/store/productStore";
import { type PickerPerformance, formatDuration } from "@/utils/storePerformance";

const productStore = useProductStore();
const currentFacility = computed(() => productStore.getCurrentFacility);
const { loading, now, allocatedCount, packedCount, rejectedCount, rate, openOrderIds, inProgressOrderIds, oldestPending, closesAt, pickers, mostPicked, fastestPacker, progress, loadPerformance } = useStorePerformance();

const openPickerOrders = async (picker: PickerPerformance) => {
  const modal = await modalController.create({ component: PickerOrdersModal, componentProps: { picker } });
  await modal.present();
};

onIonViewWillEnter(loadPerformance);
watch(() => currentFacility.value?.facilityId, loadPerformance);
</script>

<style scoped>
.fulfillment {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-base);
  padding: var(--spacer-base);
}

@media (min-width: 991px) {
  .fulfillment {
    display: grid;
    grid-template-areas: "fill-rate orders"
                         "fill-rate progress-bar"
                         "fill-rate scheduling";
    grid-template-columns: 260px 1fr;
    align-items: start;
  }
}

.fulfillment > *,
.staff-list ion-card {
  margin: 0;
}

.fill-rate {
  grid-area: fill-rate;
}

/* As in inventory-count, the design's large stat. */
.big-number {
  font-size: 78px;
  line-height: 1.2;
  margin: 0;
  padding-inline: var(--spacer-sm);
}

.orders {
  grid-area: orders;
}

@media (min-width: 991px) {
  .orders {
    display: grid;
    grid-template-areas: "title title"
                         "pending fulfill";
    grid-template-columns: 1fr 1fr;
    align-items: end;
  }
}

.title {
  grid-area: title;
}

.pending {
  grid-area: pending;
  display: flex;
  align-items: center;
}

.fulfill {
  grid-area: fulfill;
}

.fulfillment-progress-bar {
  grid-area: progress-bar;
  position: relative;
  height: 68px;
  border: var(--border-medium);
  border-radius: var(--spacer-xs);
  overflow: hidden;
}

.fulfillment-progress-bar ion-progress-bar {
  position: absolute;
  inset-block: 0;
  height: 100%;
  border-radius: var(--spacer-xs);
}

.scheduling {
  grid-area: scheduling;
  display: flex;
  gap: var(--spacer-base);
}

.scheduling ion-item {
  flex: 1;
  border: var(--border-medium);
  border-radius: var(--spacer-xs);
}

.staff-performance {
  padding: 0 var(--spacer-base) var(--spacer-base);
}

.staff-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-sm);
}

.staff-list ion-card {
  min-width: 260px;
}

.list-item {
  --columns-tablet: 5;
  --columns-desktop: 5;
  padding-inline-end: var(--spacer-base);
}

.list-item:not(:last-child) {
  border-bottom: var(--border-medium);
}
</style>
