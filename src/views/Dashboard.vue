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
                1 hour 10 minutes ago
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
          <ion-item lines="none">
            <ion-icon slot="start" :icon="storefrontOutline" color="danger" />
            <ion-label>
              Store closes in 30 minutes
              <p>04:30pm</p>
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
              <p class="overline title">{{ translate("Fastest Picker") }}</p>
              <ion-item lines="none">
                <ion-label>
                  <h1>{{ "First" + " " + "Last Name" }}</h1>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                {{ "20 minutes average" }}
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

const currentFacility: any = computed(() => useUserStore().getCurrentFacility);
const currentFacilityDetails = ref(null as any)
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
const fillrate = computed(() => (packedShipments.value.length / (packedShipments.value.length + rejectedOrderFacilityChange.value.length)) * 100)

const mostOrdersPicked = computed(() => {
  return [...pickedOrderByPicker.value].sort((a: any, b: any) => b.pickedShipments.length - a.pickedShipments.length)[0] || {}
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

.list-item {
  --columns-desktop: 5;
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