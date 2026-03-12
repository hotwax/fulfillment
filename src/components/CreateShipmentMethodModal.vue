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
import { commonUtil, logger, translate } from "@common";

  import { useCarrier } from "@/composables/useCarrier";
  import { useCarrierStore } from "@/store/carrier";
  
  const { createShipmentMethod: createShipmentMethodComposable, updateCarrierShipmentMethodAssociation } = useCarrier();
  const carrierStore = useCarrierStore();
  const shipmentMethods = computed(() => carrierStore.getFilteredShipmentMethods);
  const currentCarrier = computed(() => carrierStore.getCurrent);
  
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
  
  const createShipmentMethod = async () => {
    if (!shipmentMethod.value.description?.trim() || !shipmentMethod.value.shipmentMethodTypeId?.trim()) {
      commonUtil.showToast(translate("Please fill all the required fields"));
      return;
    }
  
    try {
      await createShipmentMethodComposable(shipmentMethod.value);
      await updateCarrierShipmentMethodAssociation(shipmentMethod.value, currentCarrier.value.partyId, true);
      await carrierStore.fetchShipmentMethodTypes();
      await carrierStore.checkAssociatedProductStoreShipmentMethods();
      modalController.dismiss();
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
