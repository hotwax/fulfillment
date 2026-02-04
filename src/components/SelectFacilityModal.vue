<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="update-store-name-close-modal-btn" @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Select facility") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar data-testid="edit-facility-search-input" v-if="facilities.length" v-model="queryString" :placeholder="translate('Search facilities')" />

    <ion-radio-group v-model="selectedFacilityIdValue">
      <ion-item v-for="facility in filteredFacilities()" :key="facility.facilityId">
        <ion-radio :data-testid="`update-facility-radio-options-${facility.facilityId}`" label-placement="end" justify="start" :value="facility.facilityId">
          <ion-label>
            {{ facility.facilityName ? facility.facilityName : facility.facilityId }}
            <p>{{ facility.facilityId }}</p>
          </ion-label>
        </ion-radio>
      </ion-item>
    </ion-radio-group>

    <div v-if="!filteredFacilities().length" class="empty-state">
      <ion-label>{{ translate('No facilities found') }}</ion-label>
    </div>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="update-store-name-transfer-order-btn" :disabled="selectedFacilityIdValue === selectedFacilityId" @click="saveFacility">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonRadio, IonRadioGroup, IonSearchbar, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { defineProps, onMounted, ref } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components'
import { showToast } from '@/utils';

const props = defineProps(["currentFacilityId", "selectedFacilityId", "facilities"]);

const selectedFacilityIdValue = ref("");
const queryString = ref("");

onMounted(() => {
  selectedFacilityIdValue.value = props.selectedFacilityId
})

function filteredFacilities() {
  const value = queryString.value.trim().toLowerCase();
  if(!value) return props.facilities;
  return props.facilities.filter((facility: any) => {
    const name = (facility.facilityName || "").toLowerCase();
    const id = (facility.facilityId || "").toLowerCase();
    return name.includes(value) || id.includes(value);
  });
}

function closeModal(payload = {}) {
  modalController.dismiss({ ...payload });
}

function saveFacility() {
  if(props.currentFacilityId === selectedFacilityIdValue.value) {
    showToast(translate('Origin and destination facility cannot be the same.'));
    return;
  }
  closeModal({ selectedFacilityId: selectedFacilityIdValue.value })
}

</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}
</style>