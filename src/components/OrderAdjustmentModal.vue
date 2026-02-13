<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("COD Calculation") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item class="ion-margin-top" lines="none">
      <ion-label>{{ translate("Order level charges like shipping fees and taxes are being credited on this label becuase it is the first shipment of this order.") }}</ion-label>
    </ion-item>
    <ion-list>
      <ion-item v-if="shipmentSubtotal">
        <ion-label>{{ translate("Shipment subtotal") }}</ion-label>
        <ion-note slot="end">{{ currency }} {{ shipmentSubtotal.toFixed(2) }}</ion-note>
      </ion-item>
      <ion-accordion-group v-if="orderAdjustments.length">
        <ion-accordion value="adjustment">
          <ion-item slot="header" color="light" lines="full">
            <ion-label>{{ translate("Order adjustments") }}</ion-label>
            <ion-note slot="end">{{ currency }} {{ orderHeaderAdjustmentTotal?.toFixed(2) }}</ion-note>
          </ion-item>
          <div slot="content">
            <ion-item v-for="adjustment in orderAdjustments" :key="adjustment">
              <ion-label>{{ orderAdjustmentTypeDesc[adjustment.orderAdjustmentTypeId] ?? adjustment.orderAdjustmentTypeId }}</ion-label>
              <ion-note slot="end">{{ currency }} {{ adjustment.amount.toFixed(2) }}</ion-note>
            </ion-item>
          </div>
        </ion-accordion>
      </ion-accordion-group>
      <ion-item v-if="shipmentTotal">
        <ion-label>{{ translate("Shipment total") }}</ion-label>
        <ion-note slot="end">{{ currency }} {{ shipmentTotal.toFixed(2) }}</ion-note>
      </ion-item>
      <ion-item v-if="otherShipmentTotal">
        <ion-label>{{ translate("Other shipment totals") }}</ion-label>
        <ion-note slot="end">{{ currency }} {{ otherShipmentTotal.toFixed(2) }}</ion-note>
      </ion-item>
      <ion-item v-if="grandTotal">
        <ion-label>{{ translate("Order total") }}</ion-label>
        <ion-note slot="end">{{ currency }} {{ grandTotal.toFixed(2) }}</ion-note>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonAccordion, IonAccordionGroup, IonButtons, IonButton, IonContent, IonHeader, IonNote, IonIcon, IonTitle, IonToolbar, IonItem, IonLabel, IonList, modalController } from "@ionic/vue";
import { defineProps, onMounted, ref } from "vue";
import { close } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import logger from "@/logger";
import { OrderService } from "@/services/OrderService";
import { UtilService } from "@/services/UtilService";
import { hasError } from "@/adapter";

const props = defineProps(["order", "orderId", "orderAdjustments", "orderHeaderAdjustmentTotal", "adjustmentsByGroup"]);

const grandTotal = ref(0);
const currency = ref("");
const orderAdjustmentTypeIds = ref([] as any[]);
const orderAdjustmentTypeDesc = ref({} as any);
const otherShipmentTotal = ref(0);
const shipmentSubtotal = ref(0);
const shipmentTotal = ref(0);
const orderItemSeqIds = ref([] as string[]);

const fetchOrderShipGroupInfo = async () => {
  try {
    const resp = await OrderService.fetchOrderItems({
      orderId: props.orderId,
      pageSize: 50,
      fieldsToSelect: ["orderId", "orderItemseqId", "shipGroupSeqId", "unitPrice"]
    });

    if (!hasError(resp)) {
      grandTotal.value = props.order.grandTotal;
      currency.value = props.order.currencyUom;
      resp.data.map((item: any) => {
        if (item.shipGroupSeqId != props.order.shipGroupSeqId) {
          otherShipmentTotal.value += item.unitPrice;
        } else {
          shipmentSubtotal.value += item.unitPrice;
        }
      });

      Object.entries(props.adjustmentsByGroup).map(([seqId, adjustments]: any) => {
        adjustments.map((adjustment: any) => {
          if (seqId === props.order.shipGroupSeqId) {
            shipmentSubtotal.value += adjustment.amount;
          } else if (seqId && seqId !== "_NA_") {
            otherShipmentTotal.value += adjustment.amount;
          } else if (orderItemSeqIds.value.includes(adjustment.orderItemSeqId)) {
            shipmentSubtotal.value += adjustment.amount;
          } else {
            otherShipmentTotal.value += adjustment.amount;
          }
        });
      });
    }
  } catch (err) {
    logger.error("Failed to fetch ship group info for order", err);
  }
};

const fetchAdjustmentTypeDescription = async () => {
  try {
    const resp = await UtilService.fetchAdjustmentTypeDescription({
      orderAdjustmentTypeId: orderAdjustmentTypeIds.value,
      orderAdjustmentTypeId_op: "in",
      pageSize: orderAdjustmentTypeIds.value.length,
      fieldsToSelect: ["orderAdjustmentTypeId", "description"]
    });

    if (!hasError(resp)) {
      orderAdjustmentTypeDesc.value = resp.data.reduce((adjustments: any, adjustment: any) => {
        adjustments[adjustment.orderAdjustmentTypeId] = adjustment.description;
        return adjustments;
      }, {});
    }
  } catch (err) {
    logger.error("Failed to fetch adjustment type descriptions", err);
  }
};

const closeModal = () => {
  modalController.dismiss();
};

onMounted(async () => {
  props.orderAdjustments.map((adjustment: any) => {
    orderAdjustmentTypeIds.value.push(adjustment.orderAdjustmentTypeId);
  });

  orderItemSeqIds.value = props.order.items.map((item: any) => item.orderItemSeqId);

  await fetchOrderShipGroupInfo();
  await fetchAdjustmentTypeDescription();
  shipmentTotal.value = shipmentSubtotal.value + props.orderHeaderAdjustmentTotal;
});
</script>
