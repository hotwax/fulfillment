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

  <ion-content class="ion-padding">
    <div>
      <ion-list>
        <ion-item>
          <ion-label>{{ translate("Shipment subtotal") }}</ion-label>
          <ion-note slot="end">{{ currency }} {{ shipmentSubtotal }}</ion-note>
        </ion-item>
        <ion-accordion-group>
          <ion-accordion value="adjustment">
            <ion-item slot="header" color="light" lines="full">
              <ion-label>{{ translate("Order adjustments") }}</ion-label>
              <ion-note slot="end">{{ currency }} {{ orderHeaderAdjustmentTotal }}</ion-note>
            </ion-item>
            <div slot="content">
              <ion-item v-for="adjustment in orderAdjustments" :key="adjustment">
                <ion-label>{{ orderAdjustmentTypeDesc[adjustment.orderAdjustmentTypeId] }}</ion-label>
                <ion-note slot="end">{{ currency }} {{ adjustment.amount }}</ion-note>
              </ion-item>
            </div>
          </ion-accordion>
        </ion-accordion-group>
        <ion-item>
          <ion-label>{{ translate("Shipment total") }}</ion-label>
          <ion-note slot="end">{{ currency }} {{ shipmentTotal }}</ion-note>
        </ion-item>
        <ion-item v-if="otherShipmentTotal">
          <ion-label>{{ translate("Other shipment totals") }}</ion-label>
          <ion-note slot="end">{{ currency }} {{ otherShipmentTotal }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>{{ translate("Order total") }}</ion-label>
          <ion-note slot="end">{{ currency }} {{ grandTotal }}</ion-note>
        </ion-item>
      </ion-list>
    </div>
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
  IonIcon,
  IonTitle,
  IonToolbar,
  IonItem,
  IonList,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close, save, saveOutline } from "ionicons/icons";
import { useStore, mapGetters } from "vuex";
import { translate } from '@hotwax/dxp-components'
import logger from "@/logger";
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
    IonIcon,
    IonItem,
    IonList,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      grandTotal: "",
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

    await this.fetchOrderPayment();
    await this.fetchAdjustmentTypeDescription();
    this.shipmentTotal = this.shipmentSubtotal + this.orderHeaderAdjustmentTotal
  },
  methods: {
    async fetchOrderPayment() {
      try {
        const resp = await UtilService.fetchOrderPayment({
          inputFields: {
            orderId: this.orderId
          },
          entityName: "OrderHeaderItemAndShipGroup",
          viewSize: 50,
          fieldList: ["orderId", "grandTotal", "currencyUom", "unitPrice", "shipGroupSeqId"]
        })

        if(!hasError(resp) && resp.data?.count) {
          this.grandTotal = resp.data.docs[0].grandTotal
          this.currency = resp.data.docs[0].currencyUom
          resp.data.docs.map((group: any) => {
            if (group.shipGroupSeqId != this.order.shipGroupSeqId) {
              this.otherShipmentTotal += group.unitPrice
            } else {
              this.shipmentSubtotal += group.unitPrice
            }
          })

          Object.entries(this.adjustmentsByGroup).map(([seqId, adjustments]: any) => {
            adjustments.map((adjustment: any) => {
              if(seqId === this.order.shipGroupSeqId) {
                this.shipmentSubtotal += adjustment.amount
              } else if(seqId !== "_NA_") {
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
        logger.error("Failed to fetch order payment info", err)
      }
    },
    async fetchAdjustmentTypeDescription() {
      try {
        const resp = await UtilService.fetchAdjustmentTypeDescription({
          inputFields: {
            orderAdjustmentTypeId: this.orderAdjustmentTypeIds,
            orderAdjustmentTypeId_op: "in"
          },
          entityName: "OrderAdjustmentType",
          viewSize: this.orderAdjustmentTypeIds.length,
          fieldList: ["orderAdjustmentTypeId", "description"]
        })

        if(!hasError(resp) && resp.data?.count) {
          this.orderAdjustmentTypeDesc = resp.data.docs.reduce((adjustments: any, adjustment: any) => {
            adjustments[adjustment.orderAdjustmentTypeId] = adjustment.description
            return adjustments
          }, {})
        }
      } catch(err) {
        logger.error("Failed to fetch order payment info", err)
      }
    },
    closeModal() {
      modalController.dismiss();
    },
  },
  setup() {
    const store = useStore();
    return {
      close,
      save,
      saveOutline,
      store,
      translate
    };
  }
});
</script>