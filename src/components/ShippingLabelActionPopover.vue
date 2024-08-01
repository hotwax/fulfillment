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
  import { mapGetters, useStore } from "vuex";
  import { OrderService } from '@/services/OrderService';
  import { showToast } from '@/utils'
  import { hasError } from "@/adapter";
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
    computed: {
      ...mapGetters({
        facilityProductStores: 'facility/getFacilityProductStores',
        getProductStore: 'util/getProductStore',
        productStores: 'util/getProductStores',
        shopifyShopIdForProductStore: 'util/getShopifyShopIdForProductStore',
        current: 'facility/getCurrent'
      })
    },
    methods: {
      async printShippingLabel(order: any) {
        const shipmentIds = order?.shipmentIds?.length > 0 ? order?.shipmentIds : order.shipments?.map((shipment: any) => shipment.shipmentId);
        const shippingLabelPdfUrls = order.shipmentPackages
            ?.filter((shipmentPackage: any) => shipmentPackage.labelPdfUrl)
            .map((shipmentPackage: any) => shipmentPackage.labelPdfUrl);
        await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
        popoverController.dismiss()
      },
      async voidShippingLabel(order: any) {
        let resp = {} as any;
        try {
          for (const shipmentPackage of order.shipmentPackages) {
            resp = await OrderService.updateShipmentPackageRouteSeg({
              "shipmentId": shipmentPackage.shipmentId,
              "shipmentRouteSegmentId": shipmentPackage.shipmentRouteSegmentId,
              "shipmentPackageSeqId": shipmentPackage.shipmentPackageSeqId,
              "trackingCode": "",
              "labelImage": null,
              "labelIntlSignImage": null,
              "labelHtml": "",
              "labelImageUrl": "",
              "internationalInvoiceUrl": ""

            });
            if (!hasError(resp)) {
              resp = await OrderService.updateShipmentRouteSegment({
                "shipmentId": shipmentPackage.shipmentId,
                "shipmentRouteSegmentId": shipmentPackage.shipmentRouteSegmentId,
                "carrierServiceStatusId": "SHRSCS_VOIDED",
                "trackingIdNumber": ""
              }) as any;
              if (hasError(resp)) {
                throw resp.data;             
              }
            } else {
              throw resp.data;
            }
          }
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