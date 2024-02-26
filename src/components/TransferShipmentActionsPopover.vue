<template>
    <ion-content>
      <ion-list>
        <ion-list-header>{{ translate('Shipping label') }}</ion-list-header>
        <ion-item button @click="generateShippingLabel(currentShipment)">
          <ion-icon slot="end" :icon="copyOutline" />
          {{ translate("Re-print") }}
        </ion-item>
        <ion-item button lines="none" @click="showShippingLabelErrorModal(currentShipment)">
          <ion-icon slot="end" :icon="arrowForwardOutline" />
          {{ translate("Show label error") }}
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
    modalController,
    popoverController
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import { arrowForwardOutline, bagCheckOutline, copyOutline } from 'ionicons/icons'
  import { translate } from "@hotwax/dxp-components";
  import { useStore } from 'vuex';
  import { OrderService } from '@/services/OrderService';
  import ShippingLabelErrorModal from '@/components/ShippingLabelErrorModal.vue';
  import { showToast } from '@/utils';
  import { hasError } from '@/adapter'
  


  
  export default defineComponent({
    name: "TransferShipmentActionsPopover",
    components: { 
      IonContent,
      IonIcon,
      IonItem,
      IonList,
      IonListHeader
    },
    props: ["currentShipment", "productStoreShipmentMethCount"],
    methods: {
      closePopover() {
        popoverController.dismiss();
      },
      async generateShippingLabel(currentShipment: any) {
        
        // If there are no product store shipment method configured, then not generating the label and displaying an error toast
        if (this.productStoreShipmentMethCount <= 0) {
          showToast(translate('Unable to generate shipping label due to missing product store shipping method configuration'))
          return;
        }

        // if the request to print shipping label is not yet completed, then clicking multiple times on the button
        // should not do anything
        if (currentShipment.isGeneratingShippingLabel) {
          return;
        }

        currentShipment.isGeneratingShippingLabel = true;

        if (!currentShipment.trackingCode) {
          //regenerate shipping label if missing tracking code
          //TODO: Currently doing force rate shop. Need to add support on easypost integration if we don't want it
          const resp = await OrderService.retryShippingLabel([currentShipment.shipmentId], true)
          if (!hasError(resp)) {
            showToast(translate("Shipping Label generated successfully"))
            await OrderService.printShippingLabel([currentShipment.shipmentId])
            await this.store.dispatch('transferorder/fetchTransferShipmentDetail', { shipmentId: this.$route.params.shipmentId })
          } else {
            showToast(translate("Failed to generate shipping label"))
          }
        } else {
          //print shipping label if label already exists
          await OrderService.printShippingLabel([currentShipment.shipmentId])
        }

        currentShipment.isGeneratingShippingLabel = false;
      },
      async showShippingLabelErrorModal(currentShipment: any){
        const shippingLabelErrorModal = await modalController.create({
          component: ShippingLabelErrorModal,
          componentProps: {
            shipmentIds: [currentShipment.shipmentId]
          }
        });
        return shippingLabelErrorModal.present();
      }
    },
    setup() {
      const store = useStore();
  
      return {
        arrowForwardOutline,
        bagCheckOutline,
        copyOutline,
        store,
        translate
      }
    }
  });
  </script>