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

<script lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonNote,
  IonIcon,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonList,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components'
import logger from "@/logger";
import { OrderService } from "@/services/OrderService";
import { UtilService } from "@/services/UtilService";
import { hasError } from "@/adapter";

export default defineComponent({
  name: "OrderAdjustmentModal",
  components: {
    IonAccordion,
    IonAccordionGroup,
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonNote,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      grandTotal: 0,
      currency: "",
      orderAdjustmentTypeIds: [] as any,
      orderAdjustmentTypeDesc: {} as any,
      otherShipmentTotal: 0,
      shipmentSubtotal: 0,
      shipmentTotal: 0,
      orderItemSeqIds: [] as Array<string>
    }
  },
  props: ["order", "orderId", "orderAdjustments", "orderHeaderAdjustmentTotal", "adjustmentsByGroup"],
  async mounted() {
    // When calculating total we are not honoring the adjustments added directly on shipGroup level
    // as in the currently flow its assumed that there is no way to add adjustment at shipGroup level
    // If in the future we have such a support then the logic to calculate subtotal and total needs to be updated
    this.orderAdjustments.map((adjustment: any) => {
      this.orderAdjustmentTypeIds.push(adjustment.orderAdjustmentTypeId)
    })

    // Getting seqIds as need to add item level adjustment to specific shipment total
    this.orderItemSeqIds = this.order.items.map((item: any) => item.orderItemSeqId)

    await this.fetchOrderShipGroupInfo();
    await this.fetchAdjustmentTypeDescription();
    this.shipmentTotal = this.shipmentSubtotal + this.orderHeaderAdjustmentTotal
  },
  methods: {
    async fetchOrderShipGroupInfo() {
      try {
        const resp = await OrderService.fetchOrderItems({
          orderId: this.orderId,
          pageSize: 50,
          fieldsToSelect: ["orderId", "orderItemseqId", "shipGroupSeqId", "unitPrice"]
        })

        if(!hasError(resp)) {
          this.grandTotal = this.order.grandTotal
          this.currency = this.order.currencyUom
          resp.data.map((item: any) => {
            if (item.shipGroupSeqId != this.order.shipGroupSeqId) {
              this.otherShipmentTotal += item.unitPrice
            } else {
              this.shipmentSubtotal += item.unitPrice
            }
          })

          Object.entries(this.adjustmentsByGroup).map(([seqId, adjustments]: any) => {
            adjustments.map((adjustment: any) => {
              if(seqId === this.order.shipGroupSeqId) {
                this.shipmentSubtotal += adjustment.amount
              } else if(seqId && seqId !== "_NA_") {
                this.otherShipmentTotal += adjustment.amount
              } else if(this.orderItemSeqIds.includes(adjustment.orderItemSeqId)) {
                this.shipmentSubtotal += adjustment.amount
              } else {
                this.otherShipmentTotal += adjustment.amount
              }
            })
          })
        }
      } catch(err) {
        logger.error("Failed to fetch ship group info for order", err)
      }
    },
    async fetchAdjustmentTypeDescription() {
      try {
        const resp = await UtilService.fetchAdjustmentTypeDescription({
          orderAdjustmentTypeId: this.orderAdjustmentTypeIds,
          orderAdjustmentTypeId_op: "in",
          pageSize: this.orderAdjustmentTypeIds.length,
          fieldsToSelect: ["orderAdjustmentTypeId", "description"]
        })

        if(!hasError(resp)) {
          this.orderAdjustmentTypeDesc = resp.data.reduce((adjustments: any, adjustment: any) => {
            adjustments[adjustment.orderAdjustmentTypeId] = adjustment.description
            return adjustments
          }, {})
        }
      } catch(err) {
        logger.error("Failed to fetch adjustment type descriptions", err)
      }
    },
    closeModal() {
      modalController.dismiss();
    },
  },
  setup() {
    return {
      close,
      translate
    };
  }
});
</script>