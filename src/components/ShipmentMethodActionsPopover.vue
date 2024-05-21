<template>
    <ion-content>
      <ion-list>
        <ion-list-header>{{ shipmentMethod.description ? shipmentMethod.description : shipmentMethod.shipmentMethodTypeId}}</ion-list-header>
        <ion-item lines="none" button @click="renameShipmentMethod()">
          <ion-icon slot="end" :icon="pencilOutline" />
          {{ translate("Edit name") }}
        </ion-item>
        <template v-if="shipmentMethod.isChecked">
          <ion-item button @click="editDeliveryDays()">
            <ion-icon slot="end" :icon="calendarClearOutline" />
            {{ translate("Edit delivery days") }}
          </ion-item>
          <ion-item button @click="editCarrierCode()">
            <ion-icon slot="end" :icon="codeWorkingOutline" />
            {{ translate("Edit carrier code") }}
          </ion-item>
          <ion-item button @click="openEditSequenceModal()">
            <ion-icon slot="end" :icon="listOutline" />
            {{ translate("Edit sequence") }}
          </ion-item>
          <ion-item lines="none" button @click="removeCarrierShipmentMethod()">
            <ion-icon slot="end" :icon="unlinkOutline" />
            {{ translate("Remove from carrier") }}
          </ion-item>
        </template>
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
    popoverController,
    alertController
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import { pencilOutline, calendarClearOutline, codeWorkingOutline, listOutline,  unlinkOutline} from 'ionicons/icons'
  import EditShipmentMethodSequenceModal from '@/components/EditShipmentMethodSequenceModal.vue';
  import { translate } from "@hotwax/dxp-components";
  import { mapGetters, useStore } from "vuex";
  import { CarrierService } from '@/services/CarrierService';
  import { hasError } from '@/adapter';
  import { showToast } from '@/utils';
  import logger from '@/logger';
  
  export default defineComponent({
    name: "ShipmentMethodActionsPopover",
    components: { 
      IonContent,
      IonIcon,
      IonItem,
      IonList,
      IonListHeader
    },
    computed: {
      ...mapGetters({
        currentCarrier: 'carrier/getCurrent'
      })
    },
    props: ["shipmentMethod"],
    methods: {
      closePopover() {
        popoverController.dismiss();
      },
      async renameShipmentMethod() {
        const alert = await alertController.create({
          header: translate('Rename shipment method'),
          inputs: [{
            name: "shipmentMethodName",
            value: this.shipmentMethod.description
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Apply'),
            handler: (data) => {
              const { shipmentMethodName } = data
              popoverController.dismiss( {"fieldName": "shipmentMethodName", "fieldValue": shipmentMethodName})
            }
          }]
        })
        await alert.present()
        this.closePopover()
      },
      async editDeliveryDays() {
        const alert = await alertController.create({
          header: translate('Edit delivery days'),
          inputs: [{
            name: "deliveryDays",
            value: this.shipmentMethod.deliveryDays
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Apply'),
            handler: (data) => {
              const { deliveryDays } = data
              popoverController.dismiss( {"fieldName": "deliveryDays", "fieldValue": deliveryDays})
            }
          }]
        })
        await alert.present()
        this.closePopover()
      },
      async editCarrierCode() {
        const alert = await alertController.create({
          header: translate('Edit carrier code'),
          inputs: [{
            name: "carrierServiceCode",
            value: this.shipmentMethod.carrierServiceCode
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Apply'),
            handler: (data) => {
              const { carrierServiceCode } = data
              popoverController.dismiss({"fieldName": "carrierServiceCode", "fieldValue": carrierServiceCode})
            }
          }]
        })
        await alert.present()
        this.closePopover()
      },
      async openEditSequenceModal() {
        const shipmentMethodSequenceModal = await modalController.create({
          component: EditShipmentMethodSequenceModal
        });
  
        // dismissing the popover once the picker modal is closed
        shipmentMethodSequenceModal.onDidDismiss().finally(() => {
          this.closePopover();
        });
        return shipmentMethodSequenceModal.present();
      },
      async removeCarrierShipmentMethod() {
        let currentCarrierShipmentMethods = JSON.parse(JSON.stringify(this.currentCarrier.shipmentMethods))
        try {
            const resp = await CarrierService.removeCarrierShipmentMethod(this.shipmentMethod)
            if (!hasError(resp)) {
              delete currentCarrierShipmentMethods[this.shipmentMethod.shipmentMethodTypeId]
              showToast(translate("Carrier and shipment method association updated successfully."))
              await this.store.dispatch('carrier/updateCurrentCarrierShipmentMethods', currentCarrierShipmentMethods)
              await this.store.dispatch('carrier/checkAssociatedShipmentMethods')
              this.closePopover();
            } else {
              throw resp.data
            }
        } catch(err) {
          showToast(translate("Failed to update product store and shipment method association."))
          logger.error(err)
        }
      }
    },
    setup() {
      const store = useStore();
  
      return {
        calendarClearOutline,
        codeWorkingOutline,
        listOutline,
        pencilOutline,
        unlinkOutline,
        store,
        translate
      }
    }
  });
  </script>