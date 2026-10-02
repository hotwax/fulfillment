<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ picker.name || translate("Not on a picklist") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("Packed today") }}</ion-list-header>
      <div v-if="loading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Fetching orders") }}</ion-label>
      </div>
      <div v-else-if="!rows.length" class="empty-state">
        <p>{{ translate("No orders packed today") }}</p>
      </div>
      <template v-else>
        <ion-item v-for="(row, index) in rows" :key="row.shipmentId" :lines="index === rows.length - 1 ? 'none' : 'inset'">
          <ion-label>
            {{ row.orderName }}
            <p v-if="row.customerName">
              {{ row.customerName }}
            </p>
          </ion-label>
          <ion-note slot="end">
            {{ row.packedTime }}
          </ion-note>
        </ion-item>
      </template>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonSpinner, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import { DateTime } from "luxon";
import { computed, onMounted } from "vue";
import { usePackedOrders } from "@/composables/usePackedOrders";
import type { PickerPerformance } from "@/utils/storePerformance";

const props = defineProps<{ picker: PickerPerformance }>();

const { loading, orders, loadPackedOrders } = usePackedOrders();

// Latest first. Until the order details load, or if they fail, a row shows its order ID.
const rows = computed(() => [...props.picker.packedShipments]
  .sort((a, b) => b.packedDate - a.packedDate)
  .map((shipment) => {
    const order = orders.value[shipment.shipmentId];

    return {
      shipmentId: shipment.shipmentId,
      orderName: order?.orderName || shipment.orderId,
      customerName: [order?.firstName, order?.lastName].filter(Boolean).join(" "),
      packedTime: DateTime.fromMillis(shipment.packedDate).toLocaleString(DateTime.TIME_SIMPLE)
    };
  }));

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

onMounted(() => loadPackedOrders(props.picker.packedShipments.map((shipment) => shipment.shipmentId)));
</script>
