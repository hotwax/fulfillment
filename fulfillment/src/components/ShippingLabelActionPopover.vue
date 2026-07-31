<template>
    <ion-content>
      <ion-list>
        <ion-list-header>{{ currentOrder?.trackingCode }}</ion-list-header>
        <ion-item button @click="printShippingLabel(currentOrder)">
          {{ translate("View Label") }}
          <ion-icon slot="end" :icon="documentOutline" />
        </ion-item>
        <ion-item button lines="none" @click="voidShippingLabel(currentOrder)">
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
  import { showToast } from '@/utils'
  import logger from '@/logger';
  
  export default defineComponent({
    name: "ProductStorePopover",
    components: {
      IonContent,
      IonIcon,
      IonItem,
      IonList,
      IonListHeader
    },
    props: ['currentOrder'],
    methods: {
      async printShippingLabel(order: any) {
        const shipmentIds = [order.shipmentId];
        const shippingLabelPdfUrls: string[] = Array.from(
          new Set(
            (order.shipmentPackageRouteSegDetails ?? [])
              .filter((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
              .map((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
          )
        );

        await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackageRouteSegDetails)
        popoverController.dismiss()
      },
      async voidShippingLabel(order: any) {
        let resp = {} as any;
        try {
          resp = await OrderService.voidShipmentLabel({
            "shipmentId": order.shipmentId,
            "shipmentRouteSegmentId": order.shipmentPackageRouteSegDetails[0]?.shipmentRouteSegmentId
          })
          
          showToast(translate("Shipping label voided successfully."))
          //fetching updated shipment packages
          await this.store.dispatch('order/updateShipmentPackageDetail', order) 
        } catch (err) {
          logger.error('Failed to void shipping label', err);
          showToast(translate("Failed to void shipping label"));
        }
        popoverController.dismiss()
      }
    },
    setup() {
      const store = useStore();
  
      return {
        documentOutline,
        trashOutline,
        store,
        translate
      };
    }
  });
  </script>