<template>
  <template v-if="filteredShipmentMethods?.length > 0">
  <div class="list-item  ion-padding" v-for="shipmentMethod in filteredShipmentMethods" :key="shipmentMethod.shipmentMethodTypeId">
    <ion-item lines="none">
      <ion-label>
        {{ shipmentMethod.description }}
        <p>{{ shipmentMethod.shipmentMethodTypeId }}</p>
      </ion-label>
    </ion-item>
    <div class="tablet">
      <ion-chip v-if="shipmentMethod.deliveryDays" outline @click.stop="editDeliveryDays(shipmentMethod)">
        <ion-label>{{ shipmentMethod?.deliveryDays }}</ion-label>
      </ion-chip>
      <ion-chip v-else :disabled="!shipmentMethod.isChecked" outline @click.stop="editDeliveryDays(shipmentMethod)">
        <ion-icon :icon="addCircleOutline" />
        <ion-label>{{ translate('delivery days') }}</ion-label>
      </ion-chip>
      <ion-note class="config-label">{{ translate('delivery days') }}</ion-note>
    </div>
    <div class="tablet">
      <ion-chip v-if="shipmentMethod?.carrierServiceCode" outline @click.stop="editCarrierCode(shipmentMethod)">
        <ion-label>{{ shipmentMethod?.carrierServiceCode }}</ion-label>
      </ion-chip>
      <ion-chip v-else :disabled="!shipmentMethod.isChecked" outline @click.stop="editCarrierCode(shipmentMethod)">
        <ion-icon :icon="addCircleOutline" />
        <ion-label>{{ translate('carrier code') }}</ion-label>
      </ion-chip>
      <ion-note class="config-label">{{ translate('carrier code') }}</ion-note>
    </div>
    <div class="tablet">
      <ion-checkbox :checked="shipmentMethod.isChecked" @click="updateCarrierShipmentMethodAssociation($event, shipmentMethod)" />
    </div>
    <ion-button fill="clear" color="medium" @click="openShipmentMethodActionsPopover($event, shipmentMethod)">
      <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
    </ion-button>
  </div>
  </template>
  <div v-else class="empty-state">
    <p>{{ translate('No data found') }}</p>
  </div>

</template>  
  <script lang="ts">
  import {
    IonButton,
    IonCheckbox,
    IonChip,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    alertController,
    popoverController
  } from '@ionic/vue';
  import { defineComponent } from 'vue';
  import { add, checkmarkDone, barcodeOutline, pricetagOutline, addCircleOutline, addOutline, ellipsisVerticalOutline, peopleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
  import { mapGetters, useStore } from "vuex";
  import { translate } from '@hotwax/dxp-components';

  import { useRouter } from 'vue-router';
  import { showToast } from '@/utils';
  import emitter from "@/event-bus";
  import { hasError } from '@/adapter';
  import logger from '@/logger';
  import { Actions } from '@/authorization'
  import { CarrierService } from '@/services/CarrierService';
  import ShipmentMethodActionsPopover from '@/components/ShipmentMethodActionsPopover.vue'
  
  
  export default defineComponent({
    name: "ShipmentMethods",
    components: {
      IonButton,
      IonCheckbox,
      IonChip,
      IonIcon,
      IonItem,
      IonLabel,
      IonNote
    },
    computed: {
      ...mapGetters({
        currentCarrier: 'carrier/getCurrent',
        filteredShipmentMethods: "carrier/getFilteredShipmentMethods",
        shipmentMethods: "carrier/getShipmentMethods",
      }),
    },
    methods: {
      async editDeliveryDays(shipmentMethod: any) {
        const alert = await alertController.create({
          header: translate('Edit delivery days'),
          inputs: [{
            name: "deliveryDays",
            value: shipmentMethod.deliveryDays
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Apply'),
            handler: async (data) => {
              const currentDeliveryDays = shipmentMethod.deliveryDays ? shipmentMethod.deliveryDays : "";
              if (data.deliveryDays.trim() != currentDeliveryDays) {
                const updatedData = {"fieldName": "deliveryDays", "fieldValue": data.deliveryDays.trim()}
                const messages = {"successMessage": "Delivery days updated.", "errorMessage": "Failed to update delivery days."}
                await this.store.dispatch('carrier/updateCarrierShipmentMethod', {shipmentMethod, updatedData, messages});
              }
            }
          }]
        })
        await alert.present()
      },
      async editCarrierCode(shipmentMethod: any) {
        const alert = await alertController.create({
          header: translate('Edit carrier code'),
          inputs: [{
            name: "carrierServiceCode",
            value: shipmentMethod.carrierServiceCode
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Apply'),
            handler: async (data) => {
              const currentCarrierServiceCode = shipmentMethod.carrierServiceCode ? shipmentMethod.carrierServiceCode : "";
              if (data.carrierServiceCode.trim() != currentCarrierServiceCode) {
                const updatedData = {"fieldName": "carrierServiceCode", "fieldValue": data.carrierServiceCode.trim()}
                const messages = {"successMessage": "Carrier code updated.", "errorMessage": "Failed to update carrier code."}
                await this.store.dispatch('carrier/updateCarrierShipmentMethod', {shipmentMethod, updatedData, messages});
              }
            }
          }]
        })
        await alert.present()
      },
      async updateCarrierName() {
        const alert = await alertController.create({
          header: translate('Edit carrier detail'),
          inputs: [{
            name: "groupName",
            value: this.currentCarrier.groupName
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Confim'),
            handler: async (data: any) => {
              if (data.groupName) {
                let resp;
                const payload = { partyId: this.currentCarrier.partyId, ...data }
                emitter.emit('presentLoader')

                try {
                  resp = await CarrierService.updateCarrier(payload)
                  if (!hasError(resp)) {
                    showToast(translate("Carrier name updated successfully."))
                    await this.store.dispatch("carrier/updateCurrentCarrier", { ...this.currentCarrier, ...payload });
                  } else {
                    throw resp.data;
                  }
                } catch(err) {
                  logger.error(err)
                }
                emitter.emit('dismissLoader')
              }
            }
          }]
        })
        await alert.present()
      },
            
      async updateCarrierShipmentMethodAssociation(event: any, shipmentMethod: any) {
        event.stopPropagation();

        let resp = {} as any;
        const payload = {
          shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
          partyId: this.currentCarrier.partyId,
          roleTypeId: "CARRIER",
          sequenceNumber: 1 //starting sequencing from 1
        } as any

        let currentCarrierShipmentMethods = this.currentCarrier.shipmentMethods ? JSON.parse(JSON.stringify(this.currentCarrier.shipmentMethods)) : {}

        try {
          if (shipmentMethod.isChecked) {
            resp = await CarrierService.removeCarrierShipmentMethod(payload)

            if (hasError(resp)) {
              throw resp.data;
            }

            delete currentCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId]
          } else {
            if (Object.keys(currentCarrierShipmentMethods).length !== 0) {
              const values = Object.values(currentCarrierShipmentMethods) as any

              //calculating next sequence number by adding one to sequence number of last shipment methods in the list
              const sequenceNumber = values[values.length - 1].sequenceNumber
              payload.sequenceNumber = sequenceNumber ? sequenceNumber + 1 : 1
            }

            resp = await CarrierService.addCarrierShipmentMethod(payload)

            if (hasError(resp)) {
              throw resp.data;
            }

            currentCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId] = payload
          }

          if (!hasError(resp)) {
            showToast(translate("Carrier and shipment method association updated successfully."))
            await this.store.dispatch('carrier/updateCurrentCarrierShipmentMethods', currentCarrierShipmentMethods)
            await this.store.dispatch('carrier/checkAssociatedShipmentMethods')
            await this.store.dispatch('carrier/checkAssociatedProductStoreShipmentMethods')
            event.target.checked = !shipmentMethod.isChecked
          } else {
            throw resp.data
          }
        } catch(err) {
          showToast(translate("Failed to update carrier and shipment method association."))
          logger.error(err)
        }
      },
      
      async openShipmentMethodActionsPopover(event: Event, shipmentMethod: any) {
        const popover = await popoverController.create({
          component: ShipmentMethodActionsPopover,
          componentProps: {
            shipmentMethod
          },
          showBackdrop: false,
          event: event
        });
        popover.present();
      }
    }, 
    setup() {
      const store = useStore(); 
      const router = useRouter();
  
      return {
        Actions,
        add,
        addCircleOutline,
        addOutline,
        barcodeOutline,
        checkmarkDone,
        ellipsisVerticalOutline,
        pricetagOutline,
        peopleOutline,
        shieldCheckmarkOutline,
        store,
        router,
        translate
      };
    },
  });
  </script>
  
  <style scoped>
  .list-item {
    --columns-desktop: 5;
  }
  .list-item:hover {
    cursor: default;
  }
  .tablet {
    display: block;
    text-align: center;
  }
  .config-label {
    display: block;
    text-align: center;
  }
</style>
  