<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ currentOrder.shipGroups[shipGroupSeqId][0]?.trackingIdNumber }}</ion-list-header>
      <ion-item button @click="printShippingLabel(shipGroupSeqId)">
        {{ translate("View Label") }}
        <ion-icon slot="end" :icon="documentOutline" />
      </ion-item>
      <ion-item button lines="none" @click="voidShippingLabel(shipGroupSeqId)">
        {{ translate("Void Label") }}
        <ion-icon slot="end" :icon="trashOutline" />
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  IonListHeader,
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { documentOutline, trashOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { useStore } from "vuex";
import { OrderService } from '@/services/OrderService';
import { isPdf, showToast } from '@/utils'
import { hasError } from "@/adapter";
import logger from '@/logger';

export default defineComponent({
  name: "OrderLookupLabelActionsPopover",
  components: {
    IonContent,
    IonIcon,
    IonItem,
    IonList,
    IonListHeader
  },
  props: ["currentOrder", "shipGroupSeqId"],
  methods: {
    async printShippingLabel(shipGroupSeqId: any) {
      const shipmentPackages = this.currentOrder.shipmentPackages[shipGroupSeqId];
      const shipmentIds = [] as any;
      const shippingLabelPdfUrls = [] as any;

      shipmentPackages.map((shipmentPackage: any) => {
        shipmentIds.push(shipmentPackage.shipmentId)
        this.isPdf(shipmentPackage.labelImageUrl) && shippingLabelPdfUrls.push(shipmentPackage.labelImageUrl)
      })

      await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
      popoverController.dismiss()
    },
    
    async voidShippingLabel(shipGroupSeqId: any) {
      let resp = {} as any;

      try {
        for(const shipmentPackage of this.currentOrder.shipmentPackages[shipGroupSeqId]) {
          resp = await OrderService.voidShipmentLabel({
            "shipmentId": shipmentPackage.shipmentId,
            "shipmentRouteSegmentId": shipmentPackage.shipmentRouteSegmentId
          })

          if(hasError(resp)) {
            throw resp.data;
          }
        }
        showToast(translate("Shipping label voided successfully."))
      } catch (err) {
        logger.error("Failed to void shipping label", err);
        showToast(translate("Failed to void shipping label"));
      }
      await this.store.dispatch("orderLookup/getOrderDetails", this.currentOrder.orderId)
      popoverController.dismiss()
    },
  },
  setup() {
    const store = useStore();

    return {
      documentOutline,
      isPdf,
      trashOutline,
      store,
      translate
    };
  }
});
</script>