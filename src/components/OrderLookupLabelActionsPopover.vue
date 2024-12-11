<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ currentOrder.shipGroups[shipGroupSeqId][0]?.trackingIdNumber }}</ion-list-header>
      <ion-item button :disabled="!getCarriersTrackingInfo(carrierPartyId)?.trackingUrl" @click="redirectToTrackingUrl()">
        {{ getCarriersTrackingInfo(carrierPartyId)?.carrierName ? getCarriersTrackingInfo(carrierPartyId).carrierName : carrierPartyId }}
        <ion-icon slot="end" :icon="openOutline" />
      </ion-item>
      <ion-item button @click="printShippingLabel(shipGroupSeqId)" lines="none">
        {{ translate("View Label") }}
        <ion-icon slot="end" :icon="documentOutline" />
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
import { documentOutline, openOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { mapGetters, useStore } from "vuex";
import { OrderService } from '@/services/OrderService';

export default defineComponent({
  name: "OrderLookupLabelActionsPopover",
  components: {
    IonContent,
    IonIcon,
    IonItem,
    IonList,
    IonListHeader
  },
  computed: {
    ...mapGetters({
      getCarriersTrackingInfo: "orderLookup/getCarriersTrackingInfo",
    })
  },
  props: ["carrierPartyId", "currentOrder", "shipGroupSeqId"],
  methods: {
    async printShippingLabel(shipGroupSeqId: any) {
      const shipmentPackages = this.currentOrder.shipmentPackages[shipGroupSeqId];
      const shipmentIds = [] as any;
      const shippingLabelPdfUrls = [] as any;

      shipmentPackages.map((shipmentPackage: any) => {
        if(!shipmentIds.includes(shipmentPackage.shipmentId)) {
          shipmentIds.push(shipmentPackage.shipmentId)
          shippingLabelPdfUrls.push(shipmentPackage.labelImageUrl)
        }
      })

      await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
      popoverController.dismiss()
    },

    redirectToTrackingUrl() {
      const trackingUrl = this.getCarriersTrackingInfo(this.carrierPartyId)?.trackingUrl
      const trackingCode = this.currentOrder.shipGroups[this.shipGroupSeqId][0]?.trackingIdNumber
      window.open(trackingUrl.replace("${trackingNumber}", trackingCode), "_blank");
      popoverController.dismiss()
    }
  },
  setup() {
    const store = useStore();

    return {
      documentOutline,
      openOutline,
      store,
      translate
    };
  }
});
</script>