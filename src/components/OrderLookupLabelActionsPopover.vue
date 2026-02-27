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

<script setup lang="ts">
import { IonContent, IonIcon, IonItem, IonList, IonListHeader, popoverController } from "@ionic/vue";
import { documentOutline, openOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { defineProps } from "vue";
import { useOrderLookupStore } from "@/store/orderLookup";
import { OrderLookupService } from "@/services/OrderLookupService";

const props = defineProps(["shipGroup"]);
const getCarriersTrackingInfo = (partyId: string) => useOrderLookupStore().getCarriersTrackingInfo(partyId);

const printShippingLabel = async () => {
  const shipmentPackageRouteSegDetails = props.shipGroup.shipmentPackageRouteSegDetails;
  const shippingLabelPdfUrls: string[] = Array.from(
    new Set(
      (shipmentPackageRouteSegDetails ?? [])
        .filter((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
        .map((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
    )
  );

  const shipmentIds: string[] = Array.from(new Set(shipmentPackageRouteSegDetails.map((shipmentPackageRouteSegDetail: any) => shipmentPackageRouteSegDetail.shipmentId)));

  await OrderLookupService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, shipmentPackageRouteSegDetails);
  popoverController.dismiss();
};

const redirectToTrackingUrl = () => {
  const trackingUrl = getCarriersTrackingInfo(props.shipGroup.carrierPartyId)?.trackingUrl;
  const trackingCode = props.shipGroup?.trackingIdNumber;
  window.open(trackingUrl.replace("${trackingNumber}", trackingCode), "_blank");
  popoverController.dismiss();
};
</script>
