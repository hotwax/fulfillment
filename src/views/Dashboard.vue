<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- Fill Rate Card -->
      <div class="fulfillment">
        <ion-card class="fill-rate">
          <ion-item lines="none">
            <p class="overline">{{ todayDate }} {{ translate("Fill Rate") }}</p>
            <ion-icon slot="end" :icon="informationCircleOutline" />
          </ion-item>
          <ion-list lines="none">
            <h1>{{ fillrate || 0 }}%</h1>
            <ion-item>
              <ion-label>Order allocated</ion-label>
              <ion-label slot="end">{{ facilityAllocationsOfDay.length }}/{{ currentFacilityDetails?.maximumOrderLimit || translate("Unlimited") }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-label>Orders packed</ion-label>
              <ion-label slot="end" color="success">{{ packedShipments.length }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-label>Orders rejected</ion-label>
              <ion-label slot="end" color="danger">{{ rejectedOrderFacilityChange.length }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <!-- Orders Pending Fulfillment Card -->
        <ion-card class="orders">
          <p class="overline title">Orders Pending Fulfillment</p>
          <div class="pending">
            <h1>3</h1>
            <ion-item lines="none">
              <ion-label>
                <p>Oldest order assigned</p>
                1 hour 10 minutes ago
              </ion-label>
            </ion-item>
          </div>
          <div class="fulfill">
            <ion-item lines="full" detail>
              <ion-icon :icon="mailUnreadOutline" slot="start" />
              <ion-label>1 open</ion-label>
            </ion-item>
            <ion-item lines="none" detail>
              <ion-icon :icon="mailOpenOutline" slot="start" />
              <ion-label>2 in progress</ion-label>
            </ion-item>
          </div>
        </ion-card>

        <FulfillmentProgressBar
          :total="currentFacilityDetails?.maximumOrderLimit"
          :dataSegments="{
            Packed: { value: packedShipments.length, color: '#3FBF60' },
            Rejected: { value: rejectedOrderFacilityChange.length, color: '#EF5350' },
            Allocated: { value: facilityAllocationsOfDay.length, color: '#3880FF' }
          }"
        />

        <!-- Scheduling -->
        <div class="scheduling">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="sendOutline" color="warning" />
            <ion-label>
              Carrier pickup scheduled
              <p>04:30pm</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-icon slot="start" :icon="storefrontOutline" color="danger" />
            <ion-label>
              Store closes in 30 minutes
              <p>04:30pm</p>
            </ion-label>
          </ion-item> 
        </div>
      </div>
      <!-- Staff Performance -->
      <section class="staff-performance">
        <p class="overline">{{ translate("Staff Performance") }}</p>
        <div class="staff-list">
          <ion-card v-for="staff in staffPerformance" :key="staff.id">
            <ion-item lines="none">
              <ion-avatar slot="start">
                <img :src="'https://gravatar.com/avatar/' + staff.id + '?s=100&d=identicon'" />
              </ion-avatar>
              <ion-label>
                {{ staff.name }}
                <p>{{ staff.role }}</p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <div class="performance-metric">
                <p class="overline">{{ translate("Orders packed") }}</p>
                <h1>{{ staff.completed }}</h1>
              </div>
            </ion-item>
          </ion-card>
        </div>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonAvatar,
  IonNote,
  onIonViewDidEnter
} from '@ionic/vue';
import { informationCircleOutline, mailUnreadOutline, mailOpenOutline, sendOutline, storefrontOutline } from 'ionicons/icons';
import FulfillmentProgressBar from '@/components/FulfillmentProgressBar.vue'
import { translate, useUserStore } from '@hotwax/dxp-components';
import { computed, ref } from 'vue';
import { DateTime } from 'luxon';
import { UtilService } from '@/services/UtilService';
import { UserService } from '@/services/UserService';
import { hasError } from '@hotwax/oms-api';
import logger from '@/logger';
import { getDateWithOrdinalSuffix, showToast } from '@/utils';

const currentFacility: any = computed(() => useUserStore().getCurrentFacility);
const currentFacilityDetails = ref(null as any)
const facilityAllocationsOfDay = ref<any[]>([]);
const rejectedOrderFacilityChange = ref<any[]>([]);
const packedShipments = ref<any[]>([]);

const todayDate = computed(() => getDateWithOrdinalSuffix(DateTime.now().toMillis(), 'MMMM'))
const fillrate = computed(() => (packedShipments.value.length / (packedShipments.value.length + rejectedOrderFacilityChange.value.length)) * 100)

const staffPerformance = ref([
  { id: '1', name: 'John Doe', role: 'Picker', completed: 45 },
  { id: '2', name: 'Jane Smith', role: 'Packer', completed: 32 },
  { id: '3', name: 'Bob Johnson', role: 'Picker', completed: 28 },
  { id: '4', name: 'Alice Brown', role: 'Picker', completed: 25 },
  { id: '5', name: 'Charlie Davis', role: 'Packer', completed: 20 },
])

onIonViewDidEnter(async () => {
  try {
    await getCurrentFacilityDetails()
    const resp = await UtilService.getFacilityAllocationsOfDay({
      customParametersMap: {
        facilityId: currentFacility.value.facilityId,
        shipmentMethodTypeId: "STOREPICKUP",
        shipmentMethodTypeId_not: "Y",
        pageNoLimit: true,
        changeDatetime_from: DateTime.now().startOf('day').toFormat('yyyy-MM-dd')
      },
      fieldsToSelect: "orderId",
      distinct: true
    });
    if (hasError(resp) || !resp.data || !resp.data.entityValueList) {
      throw resp.data
    }
    facilityAllocationsOfDay.value = resp.data.entityValueList;
    const rejectedOrderFacilityChangeResp = await UtilService.getRejectedOrderFacilityChange({
      customParametersMap: {
        fromFacilityId: currentFacility.value.facilityId,
        facilityId: "REJECTED_ITM_PARKING",
        shipmentMethodTypeId: "STOREPICKUP",
        shipmentMethodTypeId_not: "Y",
        pageNoLimit: true,
        changeDatetime_from: DateTime.now().startOf('day').toFormat('yyyy-MM-dd')
      },
      fieldsToSelect: "orderId",
      distinct: true
    });
    if (hasError(rejectedOrderFacilityChangeResp) || !rejectedOrderFacilityChangeResp.data || !rejectedOrderFacilityChangeResp.data.entityValueList) {
      throw rejectedOrderFacilityChangeResp.data
    }
    rejectedOrderFacilityChange.value = rejectedOrderFacilityChangeResp.data.entityValueList;
    const packedShipmentsResp = await UtilService.getPackedShipments({
      customParametersMap: {
        facilityId: currentFacility.value.facilityId,
        shipmentTypeId: "SALES_SHIPMENT",
        shipmentMethodTypeId: "STOREPICKUP",
        shipmentMethodTypeId_not: "Y",
        pageNoLimit: true,
        statusDate_from: DateTime.now().startOf('day').toFormat('yyyy-MM-dd')
      },
      distinct: true
    });
    if (hasError(packedShipmentsResp) || !packedShipmentsResp.data || !packedShipmentsResp.data.entityValueList) {
      throw packedShipmentsResp.data
    }
    packedShipments.value = packedShipmentsResp.data.entityValueList;
  } catch (error) { 
    logger.error(error);
    showToast(translate("Failed to get today's facility allocations."))
  }
})

const getCurrentFacilityDetails = async () => {
  try {
    const resp = await UserService.getFacilityDetails({
      "facilityId": currentFacility.value.facilityId,
      "pageSize": 1
    })
    if (!hasError(resp) && resp) {          
      currentFacilityDetails.value = resp.data
    } else {
      throw resp.data
    }
  } catch(err) {
    logger.error("Failed to fetch total orders count", err);
  }
}

</script>

<style scoped>

/* add media query for desktop only */
.fulfillment {
  display: grid;
  grid-template-areas: "fill-rate orders"
                       "fill-rate progress-bar"
                       "fill-rate scheduling";
  grid-template-columns: 1fr 3fr;
  grid-template-rows: 1fr auto auto;
  gap: var(--spacer-base);
  padding: var(--spacer-base);
}

.fulfillment > * {
  margin: 0;
}

.fill-rate {
  grid-area: fill-rate;
}

.fill-rate h1, .orders h1 {
  font-size: 78px;
  padding-inline: var(--spacer-sm);
  margin: 0;
}

.orders {
  grid-area: orders;
  display: grid;
  grid-template-areas: "title title"
                       "pending fulfill";
  grid-template-columns: auto 343px;
  grid-template-rows: min-content auto;
  align-items: end;
}

.title {
  grid-area: title;
  margin-inline: var(--spacer-sm);
}

.pending {
  grid-area: pending;
  display: flex;
  align-items: center;
}

.pending ion-item {
  flex: 1;
}

.fulfill {
  grid-area: fulfill;
}

FulfillmentProgressBar {
  grid-area: progress-bar;
}

.scheduling {
  grid-area: scheduling;
  display: flex;
  gap: var(--spacer-base);
}

.scheduling ion-item {
  flex: 1;
}

.scheduling ion-item::part(native) {
  --border-radius: var(--spacer-xs);
  --ion-item-like-padding: 16px 10px;
}

.staff-performance {
  padding: var(--spacer-base);
}

.staff-list {
  display: flex;
  gap: var(--spacer-base);
  overflow-x: auto;
  padding-bottom: var(--spacer-sm);
  scrollbar-width: none;
}

.staff-list::-webkit-scrollbar {
  display: none;
}

.staff-list ion-card {
  min-width: 250px;
  margin: 0;
  flex-shrink: 0;
}

.performance-metric h1 {
  font-size: 48px;
  margin: 0;
}
</style>