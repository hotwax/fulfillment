<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate('Carriers') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <template v-if="carriers.total">
        <div class="results">
          <ion-list>
            <ion-item v-for="(carrier, index) in carriers.list" :key="index" @click="viewCarrierDetail(carrier)" button detail>
              <ion-label>
                <p class="overline">{{ carrier.partyId }}</p>
                {{ carrier.groupName }}
              </ion-label>
              <ion-note slot="end"> {{ carrier.shipmentMethodCount }} {{ translate('methods') }}</ion-note>
            </ion-item>
          </ion-list>
        </div>
      </template>
      <div v-else class="empty-state">
        <p>
          {{ translate("No carrier found.") }}
        </p>
      </div>
    </ion-content>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="createCarrier()">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from "@ionic/vue";
import { computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { translate } from "@hotwax/dxp-components";
import { addOutline } from "ionicons/icons";
import { useCarrierStore } from "@/store/carrier";

const router = useRouter();

const carriers = computed(() => useCarrierStore().getCarriers);

const viewCarrierDetail = async (carrier: any) => {
  await useCarrierStore().updateCurrentCarrier(carrier);
  router.push({ path: `/carrier-details/${carrier.partyId}` });
};

const createCarrier = () => {
  router.push({ path: "/create-carrier" });
};

onIonViewWillEnter(async () => {
  await useCarrierStore().fetchCarriers();
  await useCarrierStore().clearShipmentMethodQuery();
});

onUnmounted(() => {
  useCarrierStore().clearCarriers();
});
</script>

<style scoped>
ion-note {
  align-self: center;
  padding: 0;
}
</style>
