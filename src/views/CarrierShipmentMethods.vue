<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Setup methods") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-list class="items-inline">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="peopleOutline"></ion-icon>
            <ion-label>
              <p class="overline">{{ currentCarrier.partyId }}</p>
              {{ currentCarrier.groupName }}
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
            <ion-toggle v-model="shipmentMethodQuery.showSelected" @ionChange="updateShipmentMethodQuery()">
              {{ translate("Only methods for this carrier") }}
            </ion-toggle>
          </ion-item>
        </ion-list>
        <hr />
        <ShipmentMethods />
      </main>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="solid" color="medium" @click="openCreateShipmentMethodModal()">
            <ion-icon :icon="addCircleOutline" />
            {{ translate("Create shipment method") }}
          </ion-button>
          <ion-button fill="solid" color="primary" @click="viewCarrierDetail()">
            <ion-icon slot="start" :icon="checkmarkDoneOutline" />
            {{ translate("Finish setup") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToggle, IonToolbar, modalController } from "@ionic/vue";
import { computed, onMounted } from "vue";
import { addCircleOutline, checkmarkDoneOutline, peopleOutline, shieldCheckmarkOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { useRoute, useRouter } from "vue-router";
import { commonUtil } from "@/utils/commonUtil";
import ShipmentMethods from "@/components/ShipmentMethods.vue";
import CreateShipmentMethodModal from "@/components/CreateShipmentMethodModal.vue";
import { useCarrierStore } from "@/store/carrier";

const router = useRouter();
const route = useRoute();

const shipmentMethodQuery = computed(() => useCarrierStore().getShipmentMethodQuery);
const currentCarrier = computed(() => useCarrierStore().getCurrent);

const viewCarrierDetail = async () => {
  await useCarrierStore().clearShipmentMethodQuery();
  commonUtil.showToast(translate("Carrier and shipment methods have been set up successfully."));
  router.replace({ path: `/carrier-details/${currentCarrier.value.partyId}` });
};

const updateShipmentMethodQuery = async () => {
  await useCarrierStore().updateShipmentMethodQuery(shipmentMethodQuery.value);
};

const openCreateShipmentMethodModal = async () => {
  const createShipmentMethodModal = await modalController.create({
    component: CreateShipmentMethodModal,
    componentProps: { carrier: currentCarrier.value }
  });
  return createShipmentMethodModal.present();
};

onMounted(async () => {
  await useCarrierStore().fetchCarrierDetail({ partyId: route.params.partyId });
  await useCarrierStore().fetchShipmentMethodTypes();
});
</script>

<style scoped>
ion-content > main {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}

.items-inline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(228px, 1fr));
  gap: var(--spacer-xs);
  align-items: start;
  margin-bottom: var(--spacer-lg);
}

.list-item {
  --columns-desktop: 5;
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
