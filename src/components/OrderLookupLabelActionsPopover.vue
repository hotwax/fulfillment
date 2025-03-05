<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ shipGroup?.trackingIdNumber }}</ion-list-header>
      <ion-item button :disabled="!getCarriersTrackingInfo(shipGroup.carrierPartyId)?.trackingUrl" @click="redirectToTrackingUrl()">
        {{ getCarriersTrackingInfo(shipGroup.carrierPartyId)?.carrierName ? getCarriersTrackingInfo(shipGroup.carrierPartyId).carrierName : shipGroup.carrierPartyId }}
        <ion-icon slot="end" :icon="openOutline" />
      </ion-item>
      <ion-item button @click="printShippingLabel(shipGroup.shipGroupSeqId)" lines="none">
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
  props: ["shipGroup"],
  methods: {
    async printShippingLabel(shipGroupSeqId: any) {
      const shipmentPackageRouteSegDetails = this.shipGroup.shipmentPackageRouteSegDetails;
      const shippingLabelPdfUrls: string[] = Array.from(
        new Set(
          (shipmentPackageRouteSegDetails ?? [])
            .filter((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
            .map((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
        )
      );

      const shipmentIds: string[] = Array.from(new Set (shipmentPackageRouteSegDetails.map((shipmentPackageRouteSegDetail: any) => shipmentPackageRouteSegDetail.shipmentId)))

     await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
      popoverController.dismiss()
    },

    redirectToTrackingUrl() {
      const trackingUrl = this.getCarriersTrackingInfo(this.shipGroup.carrierPartyId)?.trackingUrl
      const trackingCode = this.shipGroup?.trackingIdNumber
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