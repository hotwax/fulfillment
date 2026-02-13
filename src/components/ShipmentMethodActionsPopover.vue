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
  
  <script setup lang="ts">
import { defineProps } from "vue";
  import { IonContent, IonIcon, IonItem, IonList, IonListHeader, modalController, popoverController, alertController } from "@ionic/vue";
  import { computed } from "vue";
  import { pencilOutline, calendarClearOutline, codeWorkingOutline, listOutline, unlinkOutline } from "ionicons/icons";
  import EditShipmentMethodSequenceModal from "@/components/EditShipmentMethodSequenceModal.vue";
  import { translate } from "@hotwax/dxp-components";
  import { CarrierService } from "@/services/CarrierService";
  import { hasError } from "@/adapter";
  import { showToast } from "@/utils";
  import logger from "@/logger";
  import { useCarrierStore } from "@/store/carrier";
  
  const props = defineProps(["shipmentMethod"]);
  const currentCarrier = computed(() => useCarrierStore().getCurrent);
  const shipmentMethods = computed(() => useCarrierStore().getShipmentMethods);
  
  const closePopover = () => {
    popoverController.dismiss();
  };
  
  const renameShipmentMethod = async () => {
    const alert = await alertController.create({
      header: translate("Rename shipment method"),
      inputs: [{ name: "shipmentMethodName", value: props.shipmentMethod.description }],
      buttons: [
        { text: translate("Cancel"), role: "cancel" },
        {
          text: translate("Apply"),
          handler: (data) => {
            const { shipmentMethodName } = data;
            updateShipmentMethodName(props.shipmentMethod, shipmentMethodName);
          }
        }
      ]
    });
    await alert.present();
    closePopover();
  };
  
  const editDeliveryDays = async () => {
    const alert = await alertController.create({
      header: translate("Edit delivery days"),
      inputs: [{ name: "deliveryDays", value: props.shipmentMethod.deliveryDays }],
      buttons: [
        { text: translate("Cancel"), role: "cancel" },
        {
          text: translate("Apply"),
          handler: async (data) => {
            let { deliveryDays } = data;
            deliveryDays = deliveryDays.trim();
            const currentDeliveryDays = props.shipmentMethod.deliveryDays ? props.shipmentMethod.deliveryDays : "";
            if (deliveryDays !== currentDeliveryDays) {
              const messages = { successMessage: "Delivery days updated.", errorMessage: "Failed to update delivery days." };
              const updatedData = { fieldName: "deliveryDays", fieldValue: deliveryDays };
              await useCarrierStore().updateCarrierShipmentMethod({ shipmentMethod: props.shipmentMethod, updatedData, messages });
            }
          }
        }
      ]
    });
    await alert.present();
    closePopover();
  };
  
  const editCarrierCode = async () => {
    const alert = await alertController.create({
      header: translate("Edit carrier code"),
      inputs: [{ name: "carrierServiceCode", value: props.shipmentMethod.carrierServiceCode }],
      buttons: [
        { text: translate("Cancel"), role: "cancel" },
        {
          text: translate("Apply"),
          handler: async (data) => {
            let { carrierServiceCode } = data;
            carrierServiceCode = carrierServiceCode.trim();
            const currentCarrierServiceCode = props.shipmentMethod.carrierServiceCode ? props.shipmentMethod.carrierServiceCode : "";
            if (carrierServiceCode !== currentCarrierServiceCode) {
              const messages = { successMessage: "Carrier code updated.", errorMessage: "Failed to update carrier code." };
              const updatedData = { fieldName: "carrierServiceCode", fieldValue: carrierServiceCode };
              await useCarrierStore().updateCarrierShipmentMethod({ shipmentMethod: props.shipmentMethod, updatedData, messages });
            }
          }
        }
      ]
    });
    await alert.present();
    closePopover();
  };
  
  const openEditSequenceModal = async () => {
    const shipmentMethodSequenceModal = await modalController.create({ component: EditShipmentMethodSequenceModal });
    shipmentMethodSequenceModal.onDidDismiss().finally(() => {
      closePopover();
    });
    return shipmentMethodSequenceModal.present();
  };
  
  const removeCarrierShipmentMethod = async () => {
    const currentCarrierShipmentMethods = JSON.parse(JSON.stringify(currentCarrier.value.shipmentMethods));
    try {
      const resp = await CarrierService.removeCarrierShipmentMethod(props.shipmentMethod);
      if (!hasError(resp)) {
        delete currentCarrierShipmentMethods[props.shipmentMethod.shipmentMethodTypeId];
        showToast(translate("Carrier and shipment method association updated successfully."));
        await useCarrierStore().updateCurrentCarrierShipmentMethods(currentCarrierShipmentMethods);
        await useCarrierStore().checkAssociatedShipmentMethods();
        closePopover();
      } else {
        throw resp.data;
      }
    } catch (err) {
      showToast(translate("Failed to update product store and shipment method association."));
      logger.error(err);
    }
  };
  
  const updateShipmentMethodName = async (shipmentMethod: any, updatedShipmentMethodName: any) => {
    try {
      updatedShipmentMethodName = updatedShipmentMethodName.trim();
      if (!updatedShipmentMethodName) {
        showToast(translate("Shipment method name can not be empty."));
        return;
      }
  
      if (updatedShipmentMethodName != shipmentMethod.description) {
        const resp = await CarrierService.updateShipmentMethodType({ shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId, description: updatedShipmentMethodName });
        if (!hasError(resp)) {
          showToast(translate("Shipment method renamed."));
          const updatedShipmentMethods = JSON.parse(JSON.stringify(shipmentMethods.value));
          const updatedShipmentMethod = updatedShipmentMethods[shipmentMethod.shipmentMethodTypeId];
          updatedShipmentMethod.description = updatedShipmentMethodName;
          useCarrierStore().updateShipmentMethods(updatedShipmentMethods);
        } else {
          throw resp.data;
        }
      }
    } catch (error) {
      showToast(translate("Failed to rename facility group."));
      logger.error("Failed to rename facility group.", error);
    }
  };
  </script>
