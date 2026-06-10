<template>
    <ion-content>
      <ion-list>
        <ion-list-header>{{ currentOrder?.trackingCode }}</ion-list-header>
        <ion-item button :disabled="!canCreateShipment" @click="printShippingLabel(currentOrder)">
          {{ translate("View Label") }}
          <ion-icon slot="end" :icon="documentOutline" />
        </ion-item>
        <ion-item button lines="none" :disabled="!canCreateShipment" @click="voidShippingLabel(currentOrder)">
          {{ translate("Void Label") }}
          <ion-icon slot="end" :icon="trashOutline" />
        </ion-item>
      </ion-list>
    </ion-content>
  </template>
  
  <script setup lang="ts">
import { computed, defineProps } from "vue";
  import { IonContent, IonIcon, IonItem, IonList, IonListHeader, popoverController } from "@ionic/vue";
  import { documentOutline, trashOutline } from "ionicons/icons";
import { commonUtil, logger, translate } from "@common";
  import { useOrderStore } from "@/store/order";
  import { useUserStore } from "@/store/user";

const props = defineProps(["currentOrder"]);
const orderStore = useOrderStore();
const canCreateShipment = computed(() => useUserStore().hasPermission("FULFILL_SHIPMENT_CREATE OR FULFILL_SHIPMENT_ADMIN OR SALES_SHIPMENT_ADMIN"));

  const printShippingLabel = async (order: any) => {
    const shipmentIds = [order.shipmentId];
    const shippingLabelPdfUrls: string[] = Array.from(
      new Set(
        (order.shipmentPackageRouteSegDetails ?? [])
          .filter((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
          .map((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
      )
    );
  
    await orderStore.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackageRouteSegDetails);
    popoverController.dismiss();
  };
  
  const voidShippingLabel = async (order: any) => {
    try {
      await orderStore.voidShipmentLabel({
        shipmentId: order.shipmentId,
        shipmentRouteSegmentId: order.shipmentPackageRouteSegDetails[0]?.shipmentRouteSegmentId
      });
  
      commonUtil.showToast(translate("Shipping label voided successfully."));
      await useOrderStore().updateShipmentPackageDetail(order);
    } catch (err) {
      logger.error("Failed to void shipping label", err);
      commonUtil.showToast(translate("Failed to void shipping label"));
    }
    popoverController.dismiss();
  };
  </script>
