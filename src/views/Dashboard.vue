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
            <h1>{{ openOrderIds.length + inProgressOrderIds.length }}</h1>
            <ion-item lines="none">
              <ion-label>
                <p>Oldest order assigned</p>
                {{ oldestOrderWaitTime }}
              </ion-label>
            </ion-item>
          </div>
          <div class="fulfill">
            <ion-item lines="full" :button="openOrderIds.length > 0" :detail="openOrderIds.length > 0" @click="() => { if(openOrderIds.length > 0) router.push('open')} ">
              <ion-icon :icon="mailUnreadOutline" slot="start" />
              <ion-label>{{ openOrderIds.length }} open</ion-label>
            </ion-item>
            <ion-item lines="none" :button="inProgressOrderIds.length > 0" :detail="inProgressOrderIds.length > 0" @click="() => { if(inProgressOrderIds.length > 0) router.push('in-progress')} ">
              <ion-icon :icon="mailOpenOutline" slot="start" />
              <ion-label>{{ inProgressOrderIds.length }} in progress</ion-label>
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
          <ion-item lines="none" v-if="closingTimeInfo">
            <ion-icon slot="start" :icon="storefrontOutline" color="danger" />
            <ion-label>
              {{ closingTimeInfo.label }}
              <p>{{ closingTimeInfo.time }}</p>
            </ion-label>
          </ion-item> 
        </div>

        <!-- Staff Performance -->
        <div>
          <h1>{{ translate("Staff Performance") }}</h1>
          <div class="staff-list">
            <ion-card>
              <p class="overline title">{{ translate("Most Orders Picked") }}</p>
              <ion-item lines="none">
                <ion-label>
                  <h1>{{ mostOrdersPicked.firstName ? (mostOrdersPicked.firstName + " " + (mostOrdersPicked.lastName || "")) : "-" }}</h1>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                {{ (mostOrdersPicked.pickedShipments?.length || 0) + " " + translate("orders picked") }}
              </ion-item>
            </ion-card>
            <ion-card>
              <p class="overline title">{{ translate("Fastest Packer") }}</p>
              <ion-item lines="none">
                <ion-label>
                  <h1>{{ fastestPacker.name || "-" }}</h1>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <p v-if="fastestPacker.averageTime"> {{ fastestPacker.averageTime + " " + translate("minutes average") }} </p>
                <p v-else>-</p>
              </ion-item>
            </ion-card>
          </div>
        </div>
      </div>
      <div v-if="performanceByPicker.length">
        <ion-list>
          <div class="list-item" v-for="performance in performanceByPicker" :key="performance.partyId"> 
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="performance.partyImageUrl"/>
              </ion-thumbnail>
              <ion-label>
                {{ performance.name }}
              </ion-label>
            </ion-item>
            <ion-label>
              {{ performance.pickedCount }}
              <p>{{ translate("Picked") }}</p>
            </ion-label>
            <ion-label>
              {{ performance.packedCount }}
              <p>{{ translate("Packed") }}</p>
            </ion-label>
            <ion-label>
              {{ performance.rejectedCount }}
              <p>{{ translate("Rejected") }}</p>
            </ion-label>
            <ion-label>
              {{ getAveragePackingTime(performance) }}
              <p>{{ translate("Avg. Pack Time") }}</p>
            </ion-label>
          </div>
        </ion-list>
      </div>
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
  IonThumbnail,
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
import router from '@/router';
import Image from '@/components/Image.vue';
import emitter from '@/event-bus';

const currentFacility: any = computed(() => useUserStore().getCurrentFacility);
const currentFacilityDetails = ref(null as any)
const storeDetails = ref(null as any)
const facilityAllocationsOfDay = ref<any[]>([]);
const rejectedOrderFacilityChange = ref<any[]>([]);
const packedShipments = ref<any[]>([]);
const pendingFulfillmentOrders = ref<any[]>([]);
const openOrderItems = computed(() => pendingFulfillmentOrders.value.filter((order: any) => !order.shipmentId))
const inProgressOrderItems = computed(() => pendingFulfillmentOrders.value.filter((order: any) => order.shipmentStatus === 'SHIPMENT_APPROVED'))
const openOrderIds = computed(() => [...new Set(openOrderItems.value.map((order: any) => order.orderId))])
const inProgressOrderIds = computed(() => [...new Set(inProgressOrderItems.value.map((order: any) => order.orderId))])
const shipmentAndPicklists = ref<any[]>([]);
const pickedOrderByPicker = ref<any[]>([]);
const packedOrderByPicker = ref<any[]>([]);
const rejectedOrderByPicker = ref<any[]>([]);
const todayDate = computed(() => getDateWithOrdinalSuffix(DateTime.now().toMillis(), 'MMMM'))
const fillrate = computed(() => {
  const total = packedShipments.value.length + rejectedOrderFacilityChange.value.length;
  if (!total) return 0;
  const rate = (packedShipments.value.length / total) * 100;
  return rate % 1 === 0 ? rate : rate.toFixed(2);
})

const mostOrdersPicked = computed(() => {
  return [...pickedOrderByPicker.value].sort((a: any, b: any) => b.pickedShipments.length - a.pickedShipments.length)[0] || {}
})

const fastestPacker = computed(() => {
  const performanceList = performanceByPicker.value;
  let bestPacker = null as any;
  let minTime = Infinity;

  performanceList.forEach((performance: any) => {
    const packedShipments = performance.packedShipments;
    if (!packedShipments || packedShipments.length === 0) return;

    let totalTimeMinutes = 0;
    let validCount = 0;

    packedShipments.forEach((packedShipment: any) => {
      const pickedRecord = shipmentAndPicklists.value.find((picked: any) => picked.shipmentId === packedShipment.shipmentId);
      if (pickedRecord && pickedRecord.picklistDate && packedShipment.statusDate) {
        // Difference between the picklist creation and packed status date time.
        const diffMs = packedShipment.statusDate - pickedRecord.picklistDate;
        if (diffMs > 0) {
          totalTimeMinutes += diffMs / (1000 * 60);
          validCount++;
        }
      }
    });

    if (validCount > 0) {
      const avg = totalTimeMinutes / validCount;
      if (avg < minTime) {
        minTime = avg;
        bestPacker = {
          ...performance,
          averageTime: Math.round(avg)
        };
      }
    }
  });

  return bestPacker || {};
})
const closingTimeInfo = computed(() => {
  if (!storeDetails.value) return null;
  const now = DateTime.now();
  const currentDay = now.toLocaleString({ weekday: 'long' }).toLowerCase();
  const closingTimeStr = storeDetails.value[`${currentDay}_close`];
  if (!closingTimeStr) return null;
  const [hours, minutes] = closingTimeStr.split(':').map(Number);
  const closingTime = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  if (now > closingTime) {
    return {
      isClosed: true,
      label: translate("Store is closed"),
      time: closingTime.toFormat('hh:mm a')
    };
  }
  return {
    isClosed: false,
    label: translate("Store closes") + " " + closingTime.toRelative(),
    time: closingTime.toFormat('hh:mm a')
  };
})

const performanceByPicker = computed(() => {
  const performance: any = {}

  // Process picked orders
  pickedOrderByPicker.value.forEach((picker: any) => {
    if (!performance[picker.partyId]) {
      performance[picker.partyId] = {
        partyId: picker.partyId,
        name: picker.firstName ? (picker.firstName + " " + (picker.lastName || "")) : picker.partyId,
        pickedCount: 0,
        packedCount: 0,
        rejectedCount: 0
      }
    }
    performance[picker.partyId].pickedCount = picker.pickedShipments.length
  })

  // Process packed orders
  packedOrderByPicker.value.forEach((picker: any) => {
    if (!performance[picker.partyId]) {
      performance[picker.partyId] = {
        partyId: picker.partyId,
        name: picker.firstName ? (picker.firstName + " " + (picker.lastName || "")) : picker.partyId,
        pickedCount: 0,
        packedCount: 0,
        rejectedCount: 0
      }
    }
    performance[picker.partyId].packedCount = picker.packedShipments.length
    performance[picker.partyId].packedShipments = picker.packedShipments
  })

  // Process rejected orders
  rejectedOrderByPicker.value.forEach((picker: any) => {
    if (!performance[picker.partyId]) {
      performance[picker.partyId] = {
        partyId: picker.partyId,
        name: picker.firstName ? (picker.firstName + " " + (picker.lastName || "")) : picker.partyId,
        pickedCount: 0,
        packedCount: 0,
        rejectedCount: 0
      }
    }
    performance[picker.partyId].rejectedCount = picker.rejectedOrders.length
  })

  return Object.values(performance)
}) as any

const oldestOrderWaitTime = computed(() => {
  if (!pendingFulfillmentOrders.value.length) return "-";

  const oldestReservedDatetime = pendingFulfillmentOrders.value.reduce((oldest: any, order: any) => {
    if (order.reservedDatetime && (!oldest || order.reservedDatetime < oldest)) {
      return order.reservedDatetime;
    }
    return oldest;
  }, null);

  if (!oldestReservedDatetime) return "-";

  return findTimeDiff(oldestReservedDatetime, DateTime.now().toMillis(), 'ago');
})

const findTimeDiff = (startTime: any, endTime: any, format = "") => {
  const timeDiff = DateTime.fromMillis(endTime).diff(DateTime.fromMillis(startTime), ["years", "months", "days", "hours", "minutes"]).toObject();
  const parts = [];
  if (timeDiff.years && Math.floor(timeDiff.years) > 0) parts.push(`${Math.floor(timeDiff.years)} ${Math.floor(timeDiff.years) > 1 ? translate("years") : translate("year")}`);
  if (timeDiff.months && Math.floor(timeDiff.months) > 0) parts.push(`${Math.floor(timeDiff.months)} ${Math.floor(timeDiff.months) > 1 ? translate("months") : translate("month")}`);
  if (timeDiff.days && Math.floor(timeDiff.days) > 0) parts.push(`${Math.floor(timeDiff.days)} ${Math.floor(timeDiff.days) > 1 ? translate("days") : translate("day")}`);
  if (timeDiff.hours && Math.floor(timeDiff.hours) > 0) parts.push(`${Math.floor(timeDiff.hours)} ${Math.floor(timeDiff.hours) > 1 ? translate("hours") : translate("hour")}`);
  if (timeDiff.minutes !== undefined && (Math.floor(timeDiff.minutes) > 0 || parts.length === 0)) parts.push(`${Math.floor(timeDiff.minutes)} ${Math.floor(timeDiff.minutes) > 1 ? translate("minutes") : translate("minute")}`);

  const diffString = parts.join(" ");
  if (format === "ago") return `${diffString} ${translate("ago")}`;
  if (format === "prefix") return `+ ${diffString}`;
  return diffString;
}

onIonViewDidEnter(async () => {
  emitter.emit('presentLoader', { message: 'Loading...', backdropDismiss: false })
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
      fieldsToSelect: "orderId,partyId",
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
        statusId: "SHIPMENT_PACKED",
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

    await getPendingFulfillmentOrders();
    await getApprovedShipmentAndPicklistAndRole();
    getPickedOrderByPicker();
    getPackedOrderByPicker();
    getRejectedOrderByPicker();
  } catch (error) { 
    logger.error(error);
    showToast(translate("Failed to get today's store performance stats"))
  }
  emitter.emit('dismissLoader')
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

  try {
    const resp = await UtilService.storeLookup({
      viewSize: 1,
      filters: [
        `storeCode: ${currentFacility.value.facilityId}`
      ]
    });
    if (!hasError(resp) && resp) {
      storeDetails.value = resp.data.response?.docs?.[0]
    } else {
      throw resp.data
    }
  } catch (error) {
    logger.error("Failed to fetch store details", error);
  }
}

// This will return both Orders without shipment and Order with Approved Shipment.
const getPendingFulfillmentOrders = async () => {
  try {
    const resp = await UtilService.getPendingFulfillmentOrders({
      customParametersMap: {
        pageNoLimit: true,
        orderTypeId: "SALES_ORDER",
        orderStatusId: "ORDER_APPROVED",
        facilityId: currentFacility.value.facilityId,
        facilityId_op: "in",
        shipmentStatus_op: "in",
        shipmentStatus_not: "Y",
        shipmentStatus: "SHIPMENT_PACKED,SHIPMENT_SHIPPED,SHIPMENT_CANCELLED,SHIPMENT_INPUT",
        shipmentMethodTypeId: "STOREPICKUP",
        shipmentMethodTypeId_not: "Y",
        reservedDatetime_from: DateTime.now().startOf('day').toFormat('yyyy-MM-dd')
      }
    });
    if (hasError(resp) || !resp.data || !resp.data.entityValueList) {
      throw resp.data
    }
    pendingFulfillmentOrders.value = resp.data.entityValueList;
  } catch(error) {
    logger.error("Failed to fetch pending fulfillment orders", error);
    showToast(translate("Failed to fetch pending fulfillment orders"))
  }
}

const getPickedOrderByPicker = () => {
  pickedOrderByPicker.value = shipmentAndPicklists.value.reduce((pickers: any, shipment: any) => {
    const picker = pickers.find((p: any) => p.partyId === shipment.partyId)
    if (picker) {
      picker.pickedShipments.push(shipment)
    } else {
      pickers.push({
        partyId: shipment.partyId,
        firstName: shipment.firstName,
        lastName: shipment.lastName,
        pickedShipments: [shipment]
      })
    }
    return pickers
  }, [])
}

const getPackedOrderByPicker = () => {
  packedOrderByPicker.value = packedShipments.value.reduce((packers: any, shipment: any) => {
    const packer = packers.find((p: any) => p.partyId === shipment.partyId)
    if (packer) {
      packer.packedShipments.push(shipment)
    } else {
      packers.push({
        partyId: shipment.partyId,
        firstName: shipment.firstName,
        lastName: shipment.lastName,
        packedShipments: [shipment]
      })
    }
    return packers
  }, [])
}

const getRejectedOrderByPicker = () => {
  rejectedOrderByPicker.value = rejectedOrderFacilityChange.value.reduce((pickers: any, rejection: any) => {
    const picker = pickers.find((p: any) => p.partyId === rejection.partyId)
    if (picker) {
      picker.rejectedOrders.push(rejection)
    } else {
      pickers.push({
        partyId: rejection.partyId,
        firstName: rejection.firstName,
        lastName: rejection.lastName,
        rejectedOrders: [rejection]
      })
    }
    return pickers
  }, [])
}

const getAveragePackingTime = (performance: any) => {
  const packedShipments = performance.packedShipments;
  if (!packedShipments || packedShipments.length === 0) {
    return "-";
  }

  let totalTimeMinutes = 0;
  let validCount = 0;

  packedShipments.forEach((packedShipment: any) => {
    const pickedRecord = shipmentAndPicklists.value.find((picked: any) => picked.shipmentId === packedShipment.shipmentId);
    
    if (pickedRecord && pickedRecord.picklistDate && packedShipment.statusDate) {
      const diffMs = packedShipment.statusDate - pickedRecord.picklistDate;
      if (diffMs > 0) {
        totalTimeMinutes += diffMs / (1000 * 60);
        validCount++;
      }
    }
  });

  if (validCount === 0) return "-";
  
  const averageMinutes = Math.round(totalTimeMinutes / validCount);
  return `${averageMinutes} minutes`;
}

const getApprovedShipmentAndPicklistAndRole = async () => {
  try {
    const resp = await UtilService.shipmentAndPicklistAndRole({
      customParametersMap: {
        pageNoLimit: true,
        shipmentTypeId: "SALES_SHIPMENT",
        statusId: "SHIPMENT_APPROVED",
        shipmentMethodTypeId: "STOREPICKUP",
        shipmentMethodTypeId_not: "Y",
        partyId_op: "empty",
        partyId_not: "Y",
        originFacilityId: currentFacility.value.facilityId,
        picklistDate_from: DateTime.now().startOf('day').toFormat('yyyy-MM-dd'),
        roleTypeId: "WAREHOUSE_PICKER"
      }
    });
    if (hasError(resp) || !resp.data || !resp.data.entityValueList) {
      throw resp.data
    }
    shipmentAndPicklists.value = resp.data.entityValueList;
  } catch(error) {
    logger.error("Failed to fetch pending fulfillment orders", error);
    showToast(translate("Failed to fetch pending fulfillment orders"))
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
  border: var(--border-medium);
  border-radius: 10px;
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
  overflow-x: visible;
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

.list-item {
  --columns-desktop: 6;
  border-bottom: 1px solid var(--ion-color-medium);
}

@media (min-width: 991px) {
  .list-item {
    display: grid;
    grid-template-columns: repeat(var(--columns-desktop, 1), minmax(0, 1fr));
    align-items: center;
  }
}

.performance-metric h1 {
  font-size: 48px;
  margin: 0;
}
</style>