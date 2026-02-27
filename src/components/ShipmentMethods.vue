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
  <script setup lang="ts">
  import { IonButton, IonCheckbox, IonChip, IonIcon, IonItem, IonLabel, IonNote, alertController, popoverController } from "@ionic/vue";
  import { computed } from "vue";
  import { addCircleOutline, ellipsisVerticalOutline } from "ionicons/icons";
  import { translate } from "@hotwax/dxp-components";
  import { DateTime } from "luxon";
  import { commonUtil } from "@/utils/commonUtil";
  import emitter from "@/event-bus";
  import { hasError } from "@/adapter";
  import logger from "@/logger";
  import { CarrierService } from "@/services/CarrierService";
  import ShipmentMethodActionsPopover from "@/components/ShipmentMethodActionsPopover.vue";
  import { useCarrierStore } from "@/store/carrier";
  const currentCarrier = computed(() => useCarrierStore().getCurrent);
  const filteredShipmentMethods = computed(() => useCarrierStore().getFilteredShipmentMethods);
  
  const editDeliveryDays = async (shipmentMethod: any) => {
    const alert = await alertController.create({
      header: translate("Edit delivery days"),
      inputs: [{ name: "deliveryDays", value: shipmentMethod.deliveryDays }],
      buttons: [
        { text: translate("Cancel"), role: "cancel" },
        {
          text: translate("Apply"),
          handler: async (data) => {
            const currentDeliveryDays = shipmentMethod.deliveryDays ? shipmentMethod.deliveryDays : "";
            if (data.deliveryDays.trim() != currentDeliveryDays) {
              const updatedData = { fieldName: "deliveryDays", fieldValue: data.deliveryDays.trim() };
              const messages = { successMessage: "Delivery days updated.", errorMessage: "Failed to update delivery days." };
              await useCarrierStore().updateCarrierShipmentMethod({ shipmentMethod, updatedData, messages });
            }
          }
        }
      ]
    });
    await alert.present();
  };
  
  const editCarrierCode = async (shipmentMethod: any) => {
    const alert = await alertController.create({
      header: translate("Edit carrier code"),
      inputs: [{ name: "carrierServiceCode", value: shipmentMethod.carrierServiceCode }],
      buttons: [
        { text: translate("Cancel"), role: "cancel" },
        {
          text: translate("Apply"),
          handler: async (data) => {
            const currentCarrierServiceCode = shipmentMethod.carrierServiceCode ? shipmentMethod.carrierServiceCode : "";
            if (data.carrierServiceCode.trim() != currentCarrierServiceCode) {
              const updatedData = { fieldName: "carrierServiceCode", fieldValue: data.carrierServiceCode.trim() };
              const messages = { successMessage: "Carrier code updated.", errorMessage: "Failed to update carrier code." };
              await useCarrierStore().updateCarrierShipmentMethod({ shipmentMethod, updatedData, messages });
            }
          }
        }
      ]
    });
    await alert.present();
  };
  
  const updateCarrierShipmentMethodAssociation = async (event: any, shipmentMethod: any) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  
    let resp = {} as any;
    const payload = {
      shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
      partyId: currentCarrier.value.partyId,
      roleTypeId: "CARRIER",
      sequenceNumber: 1
    } as any;
  
    const currentCarrierShipmentMethods = currentCarrier.value.shipmentMethods ? JSON.parse(JSON.stringify(currentCarrier.value.shipmentMethods)) : {};
  
    try {
      if (shipmentMethod.isChecked) {
        resp = await CarrierService.removeCarrierShipmentMethod(payload);
  
        if (!hasError(resp)) {
          await removeProductStoreShipmentMethods(shipmentMethod.shipmentMethodTypeId);
        } else {
          throw resp.data;
        }
  
        delete currentCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId];
      } else {
        if (Object.keys(currentCarrierShipmentMethods).length !== 0) {
          const values = Object.values(currentCarrierShipmentMethods) as any;
          const sequenceNumber = values[values.length - 1].sequenceNumber;
          payload.sequenceNumber = sequenceNumber ? sequenceNumber + 1 : 1;
        }
  
        resp = await CarrierService.addCarrierShipmentMethod(payload);
  
        if (hasError(resp)) {
          throw resp.data;
        }
  
        currentCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId] = payload;
      }
  
      if (!hasError(resp)) {
        commonUtil.showToast(translate("Carrier and shipment method association updated successfully."));
        await useCarrierStore().updateCurrentCarrierShipmentMethods(currentCarrierShipmentMethods);
        await useCarrierStore().checkAssociatedShipmentMethods();
        await useCarrierStore().checkAssociatedProductStoreShipmentMethods();
        event.target.checked = !shipmentMethod.isChecked;
      } else {
        throw resp.data;
      }
    } catch (err) {
      commonUtil.showToast(translate("Failed to update carrier and shipment method association."));
      logger.error(err);
    }
  };
  
  const removeProductStoreShipmentMethods = async (shipmentMethodTypeId: string) => {
    try {
      const productStoreShipmentMethods = currentCarrier.value.productStoreShipmentMethods ? JSON.parse(JSON.stringify(currentCarrier.value.productStoreShipmentMethods)) : {};
  
      if (productStoreShipmentMethods) {
        const methods = Object.values(productStoreShipmentMethods).flatMap((store: any) => Object.values(store));
        const methodsToRemove = methods.filter((productStoreShipmentMethod: any) => productStoreShipmentMethod.shipmentMethodTypeId === shipmentMethodTypeId);
  
        const responses = await Promise.allSettled(methodsToRemove.map((productStoreShipmentMethod: any) => {
          const removePromise = CarrierService.removeProductStoreShipmentMethod({
            productStoreShipMethId: productStoreShipmentMethod.productStoreShipMethId,
            thruDate: DateTime.now().toMillis()
          });
  
          delete productStoreShipmentMethods[productStoreShipmentMethod.productStoreId][productStoreShipmentMethod.shipmentMethodTypeId];
          return removePromise;
        }));
  
        const hasFailedResponse = responses.some((response: any) => response.status === "rejected");
        if (hasFailedResponse) {
          logger.error("Failed to update some product store shipment method association(s).");
        }
        await useCarrierStore().updateCurrentCarrierProductStoreShipmentMethods(productStoreShipmentMethods);
        await useCarrierStore().checkAssociatedProductStoreShipmentMethods();
      }
    } catch (err) {
      logger.error(err);
    }
  };
  
  const openShipmentMethodActionsPopover = async (event: Event, shipmentMethod: any) => {
    const popover = await popoverController.create({
      component: ShipmentMethodActionsPopover,
      componentProps: { shipmentMethod },
      showBackdrop: false,
      event: event
    });
    popover.present();
  };
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
  
