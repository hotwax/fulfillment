<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal"> 
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Create shipment method") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-item>
        <ion-input label-placement="floating" v-model="shipmentMethod.description" @ionBlur="setShipmentMethodTypeId($event)">
          <div slot="label">{{ translate("Name") }} <ion-text color="danger">*</ion-text></div>
        </ion-input>
      </ion-item>
      <ion-item>
        <ion-input label-placement="floating" v-model="shipmentMethod.shipmentMethodTypeId">
          <div slot="label">{{ translate("ID") }} <ion-text color="danger">*</ion-text></div>
        </ion-input>
      </ion-item>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createShipmentMethod()">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </template>
  
  <script setup lang="ts">
  import { IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonText, IonTitle, IonToolbar, IonItem, modalController, onIonViewWillEnter } from "@ionic/vue";
  import { computed, ref } from "vue";
  import { close, saveOutline } from "ionicons/icons";
  import { commonUtil } from "@/utils/commonUtil";
  import { translate } from "@hotwax/dxp-components";
  import logger from "@/logger";
  import { hasError } from "@/adapter";
  import { CarrierService } from "@/services/CarrierService";
  import { useCarrierStore } from "@/store/carrier";
  
  const shipmentMethods = computed(() => useCarrierStore().getFilteredShipmentMethods);
  const currentCarrier = computed(() => useCarrierStore().getCurrent);
  
  const filteredShipmentMethods = ref([] as any[]);
  const shipmentMethod = ref({} as any);
  
  onIonViewWillEnter(() => {
    filteredShipmentMethods.value = shipmentMethods.value ? JSON.parse(JSON.stringify(shipmentMethods.value)) : [];
  });
  
  const closeModal = () => {
    modalController.dismiss({ dismissed: true });
  };
  
  const setShipmentMethodTypeId = (event: any) => {
    shipmentMethod.value.shipmentMethodTypeId = commonUtil.generateInternalId(event.target.value);
  };
  
  const updateCarrierShipmentMethodAssociation = async () => {
    try {
      const payload = {
        shipmentMethodTypeId: shipmentMethod.value.shipmentMethodTypeId,
        partyId: currentCarrier.value.partyId,
        roleTypeId: "CARRIER",
        sequenceNumber: 1
      } as any;
  
      const currentCarrierShipmentMethods = currentCarrier.value.shipmentMethods ? JSON.parse(JSON.stringify(currentCarrier.value.shipmentMethods)) : {};
      const values = Object.values(currentCarrierShipmentMethods) as any;
      const sequenceNumber = values[values.length - 1]?.sequenceNumber;
      payload.sequenceNumber = sequenceNumber ? sequenceNumber + 1 : 1;
  
      const resp = await CarrierService.addCarrierShipmentMethod(payload);
      if (hasError(resp)) {
        throw resp.data;
      }
    } catch (err: any) {
      logger.log(err);
    }
  };
  
  const createShipmentMethod = async () => {
    if (!shipmentMethod.value.description?.trim() || !shipmentMethod.value.shipmentMethodTypeId?.trim()) {
      commonUtil.showToast(translate("Please fill all the required fields"));
      return;
    }
  
    try {
      const resp = await CarrierService.createShipmentMethod(shipmentMethod.value);
      if (!hasError(resp)) {
        commonUtil.showToast(translate("Shipment method created successfully."));
        await updateCarrierShipmentMethodAssociation();
        await useCarrierStore().fetchShipmentMethodTypes();
        await useCarrierStore().fetchCarrierShipmentMethods({ partyId: currentCarrier.value.partyId });
        await useCarrierStore().checkAssociatedShipmentMethods();
        await useCarrierStore().checkAssociatedProductStoreShipmentMethods();
        modalController.dismiss();
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      let errorMessage = translate("Failed to create shipment method");
      if (err?.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      }
      logger.error("error", err);
      commonUtil.showToast(errorMessage);
    }
  };
  </script>
