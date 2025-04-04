<template>
    <ion-content>
      <ion-list>
        <ion-list-header>{{ translate('Shipping label') }}</ion-list-header>
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
    props: ["currentShipment", "productStoreShipmentMethCount"],
    methods: {
      closePopover() {
        popoverController.dismiss();
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