<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/carriers" slot="start"></ion-back-button>
        <ion-title>{{ translate("Create carrier") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <ion-item>
          <ion-input label-placement="floating" v-model="carrier.groupName" @ionBlur="setCarrierPartyId($event)">
            <div slot="label">{{ translate("Name") }} <ion-text color="danger">*</ion-text></div>
          </ion-input>
        </ion-item>
        <ion-item>
          <ion-input label-placement="floating" :label="translate('ID')" v-model="carrier.partyId" />
        </ion-item>
        <ion-button class="ion-margin-top" @click="createCarrier()">
          {{ translate("Setup methods") }}
          <ion-icon slot="end" :icon="arrowForwardOutline" />
        </ion-button>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonBackButton, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonPage, IonText, IonTitle, IonToolbar, onIonViewWillEnter } from "@ionic/vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { arrowForwardOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { generateInternalId, showToast } from "@/utils";
import { CarrierService } from "@/services/CarrierService";
import { hasError } from "@/adapter";
import logger from "@/logger";
import { useCarrierStore } from "@/store/carrier";

const router = useRouter();
const carrier = ref({} as any);

const clearCarrierData = () => {
  carrier.value = {} as any;
};

const setCarrierPartyId = (event: any) => {
  carrier.value.partyId = generateInternalId(event.target.value);
};

const createCarrier = async () => {
  if (!carrier.value.groupName?.trim()) {
    showToast(translate("Carrier name can not be empty."));
    return;
  }
  const payload = {
    groupName: carrier.value.groupName.trim(),
    partyId: carrier.value.partyId.trim(),
    partyTypeId: "PARTY_GROUP"
  };
  try {
    const response = await CarrierService.createCarrier(payload);
    if (!hasError(response)) {
      useCarrierStore().clearShipmentMethodQuery();
      router.replace({ path: `/shipment-methods-setup/${response.data.partyId}` });
    }
  } catch (err: any) {
    logger.error("error", err);
    showToast("Failed to create carrier.");
  }
};

onIonViewWillEnter(() => {
  clearCarrierData();
});
</script>

<style scoped>
@media (min-width: 700px) {
  main {
    max-width: 375px;
    margin: auto;
  }
}
</style>
