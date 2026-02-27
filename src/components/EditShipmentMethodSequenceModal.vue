<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal"> 
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Sequence methods") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <main>
        <div v-if="shipmentMethods.length">
          <ion-reorder-group @ionItemReorder="doReorder($event)" :disabled="false">
            <div class="list-item" v-for="shipmentMethod in filteredShipmentMethods" :key="shipmentMethod.shipmentMethodTypeId">
              <ion-item lines="none">
                <ion-label>
                  {{ shipmentMethod.description ? shipmentMethod.description : shipmentMethod.shipmentMethodTypeId }}
                  <p>{{ shipmentMethod.shipmentMethodTypeId }}</p>
                </ion-label>
              </ion-item>
              <ion-reorder />
            </div>
          </ion-reorder-group>
        </div>
        <div class="empty-state" v-else>
          <p>{{ translate("No shipment methods found.") }}</p>
        </div>
      </main>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="saveShipmentMethodsOrder()">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </template>
  
  <script setup lang="ts">
  import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonReorder, IonReorderGroup, IonTitle, IonToolbar, modalController } from "@ionic/vue";
  import { computed, onMounted, ref } from "vue";
  import { close, saveOutline } from "ionicons/icons";
  import { commonUtil } from "@/utils/commonUtil";
  import { CarrierService } from "@/services/CarrierService";
  import { translate } from "@hotwax/dxp-components";
  import { useCarrierStore } from "@/store/carrier";
  const filteredShipmentMethods = ref([] as any[]);
  const currentCarrier = computed(() => useCarrierStore().getCurrent);
  const shipmentMethods = computed(() => useCarrierStore().getFilteredShipmentMethods);
  
  onMounted(() => {
    const methods = shipmentMethods.value.filter((shipmentMethod: any) => shipmentMethod.isChecked);
    commonUtil.sortItems(methods, "sequenceNumber");
    filteredShipmentMethods.value = methods;
  });
  
  const closeModal = () => {
    modalController.dismiss({ dismissed: true });
  };
  
  const findShipmentMethodsDiff = (previousSeq: any, updatedSeq: any) => {
    const diffSeq: any = Object.keys(previousSeq).reduce((diff: any, key: any) => {
      if (updatedSeq[key].shipmentMethodTypeId === previousSeq[key].shipmentMethodTypeId && updatedSeq[key].sequenceNumber === previousSeq[key].sequenceNumber) return diff;
      return { ...diff, [key]: updatedSeq[key] };
    }, {});
    return diffSeq;
  };
  
  const doReorder = async (event: CustomEvent) => {
    const previousSeq = JSON.parse(JSON.stringify(filteredShipmentMethods.value));
    const updatedSeq = event.detail.complete(JSON.parse(JSON.stringify(filteredShipmentMethods.value)));
  
    let diffSeq = findShipmentMethodsDiff(previousSeq, updatedSeq);
  
    const updatedSeqenceNum = previousSeq.map((shipmentMethod: any) => shipmentMethod.sequenceNumber);
    Object.keys(diffSeq).map((key: any) => {
      diffSeq[key].sequenceNumber = updatedSeqenceNum[key];
    });
  
    diffSeq = Object.keys(diffSeq).map((key) => diffSeq[key]);
    filteredShipmentMethods.value = updatedSeq;
  
    if (diffSeq.length) {
      commonUtil.showToast(translate("Shipment methods order has been changed. Click save button to update them."));
    }
  };
  
  const saveShipmentMethodsOrder = async () => {
    const diffShipmentMethods = filteredShipmentMethods.value.filter((filteredShipmentMethod: any) => shipmentMethods.value.some((shipmentMethod: any) => shipmentMethod.shipmentMethodTypeId === filteredShipmentMethod.shipmentMethodTypeId && shipmentMethod.sequenceNumber !== filteredShipmentMethod.sequenceNumber));
    const currentCarrierShipmentMethods = currentCarrier.value.shipmentMethods ? JSON.parse(JSON.stringify(currentCarrier.value.shipmentMethods)) : {};
  
    const responses = await Promise.allSettled(diffShipmentMethods.map(async (method: any) => {
      await CarrierService.updateCarrierShipmentMethod(method);
      currentCarrierShipmentMethods[method.shipmentMethodTypeId] = method;
      await useCarrierStore().updateCurrentCarrierShipmentMethods(currentCarrierShipmentMethods);
      await useCarrierStore().checkAssociatedShipmentMethods();
    }));
  
    const isFailedToUpdateSomeMethod = responses.some((response) => response.status === "rejected");
    if (isFailedToUpdateSomeMethod) {
      commonUtil.showToast(translate("Failed to update sequence for some shipment methods."));
    } else {
      commonUtil.showToast(translate("Sequence for shipment methods updated successfully."));
    }
  
    modalController.dismiss();
  };
  </script>
  <style scoped>
  .list-item {
    --columns-desktop: 2;
  }
  ion-content {
    --padding-bottom: 80px;
  }
  </style>
