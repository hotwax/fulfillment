<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Dashboard") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <section class="stats ion-padding">
        <StatCard :title="translate('Fill rate today')" :stat="rate === undefined ? '-' : `${rate}%`">
          <template v-if="loading" #stat>
            <ion-spinner name="crescent" />
          </template>
          <ion-list lines="none">
            <ion-item>
              <ion-label>{{ translate("Allocated") }}</ion-label>
              <p slot="end">
                {{ allocatedCount }}/{{ currentFacility?.maximumOrderLimit ?? translate("Unlimited") }}
              </p>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Packed") }}</ion-label>
              <p slot="end">
                {{ packedCount }}
              </p>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Rejected") }}</ion-label>
              <p slot="end">
                {{ rejectedCount }}
              </p>
            </ion-item>
          </ion-list>
        </StatCard>

        <StatCard :title="translate('Pending fulfillment')" :stat="openOrderIds.size + inProgressOrderIds.size" :subtitle="oldestPending ? translate('Oldest assigned {time}', { time: oldestPending }) : ''">
          <template v-if="loading" #stat>
            <ion-spinner name="crescent" />
          </template>
          <ion-list lines="none">
            <ion-item button detail @click="router.push('/open')">
              <ion-icon slot="start" :icon="mailUnreadOutline" />
              <ion-label>{{ translate("Open") }}</ion-label>
              <p slot="end">
                {{ openOrderIds.size }}
              </p>
            </ion-item>
            <ion-item button detail @click="router.push('/in-progress')">
              <ion-icon slot="start" :icon="mailOpenOutline" />
              <ion-label>{{ translate("In Progress") }}</ion-label>
              <p slot="end">
                {{ inProgressOrderIds.size }}
              </p>
            </ion-item>
            <ion-item v-if="closesAt">
              <ion-icon slot="start" :icon="storefrontOutline" />
              <ion-label>{{ closesAt > now ? translate("Store closes") : translate("Store closed") }}</ion-label>
              <p slot="end">
                {{ closesAt.toLocaleString(DateTime.TIME_SIMPLE) }}
              </p>
            </ion-item>
          </ion-list>
        </StatCard>
      </section>

      <ion-list>
        <ion-list-header>
          <ion-label>{{ translate("Staff performance") }}</ion-label>
        </ion-list-header>
        <div v-for="picker in pickers" :key="picker.partyId" class="list-item">
          <ion-item lines="none">
            <ion-label>
              {{ picker.name || translate("Not on a picklist") }}
              <p v-if="picker.partyId && picker.partyId === mostPickedId">
                {{ translate("Most orders picked") }}
              </p>
              <p v-if="picker.partyId && picker.partyId === fastestPackerId">
                {{ translate("Fastest packer") }}
              </p>
            </ion-label>
            <ion-icon v-if="picker.partyId && (picker.partyId === mostPickedId || picker.partyId === fastestPackerId)" slot="end" :icon="trophyOutline" color="warning" />
          </ion-item>
          <ion-label>
            {{ picker.picked }}
            <p>{{ translate("Picked") }}</p>
          </ion-label>
          <ion-label>
            {{ picker.packed }}
            <p>{{ translate("Packed") }}</p>
          </ion-label>
          <ion-label>
            {{ picker.rejected }}
            <p>{{ translate("Rejected") }}</p>
          </ion-label>
          <ion-label>
            {{ formatDuration(picker.avgPackMs) }}
            <p>{{ translate("Avg. pack time") }}</p>
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
import { StatCard, translate } from "@common";
import { IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenuButton, IonPage, IonSpinner, IonTitle, IonToolbar, onIonViewWillEnter } from "@ionic/vue";
import { mailOpenOutline, mailUnreadOutline, storefrontOutline, trophyOutline } from "ionicons/icons";
import { DateTime } from "luxon";
import { computed, watch } from "vue";
import { useStorePerformance } from "@/composables/useStorePerformance";
import router from "@/router";
import { useProductStore } from "@/store/productStore";
import { formatDuration } from "@/utils/storePerformance";

const productStore = useProductStore();
const currentFacility = computed(() => productStore.getCurrentFacility);
const { loading, now, allocatedCount, packedCount, rejectedCount, rate, openOrderIds, inProgressOrderIds, oldestPending, closesAt, pickers, mostPickedId, fastestPackerId, loadPerformance } = useStorePerformance();

onIonViewWillEnter(loadPerformance);
watch(() => currentFacility.value?.facilityId, loadPerformance);
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacer-sm);
}

.list-item {
  --columns-tablet: 5;
  --columns-desktop: 5;
}
</style>
