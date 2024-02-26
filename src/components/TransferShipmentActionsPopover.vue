<template>
    <ion-content>
      <ion-list>
        <ion-list-header>{{ translate('Shipping label') }}</ion-list-header>
        <ion-item button @click="printShippingLabel()">
          <ion-icon slot="end" :icon="copyOutline" />
          {{ translate("Re-print") }}
        </ion-item>
        <ion-item button lines="none" @click="showShippingLabelErrorModal()">
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


  
  export default defineComponent({
    name: "TransferShipmentActionsPopover",
    components: { 
      IonContent,
      IonIcon,
      IonItem,
      IonList,
      IonListHeader
    },
    props: ["shipmentId", "productStoreShipmentMethCount"],
    methods: {
      closePopover() {
        popoverController.dismiss();
      },
      async printShippingLabel() {
        await OrderService.printShippingLabel([this.shipmentId])
      },
      async showShippingLabelErrorModal(){
        const shippingLabelErrorModal = await modalController.create({
          component: ShippingLabelErrorModal,
          componentProps: {
            shipmentIds: [this.shipmentId]
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