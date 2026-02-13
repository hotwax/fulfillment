<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Historical Manifests") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ translate("Manifests from the last seven days") }}
      </ion-list-header>
      <ion-item v-for="manifest in carrierConfiguration[selectedCarrierPartyId]?.manifests" :key="manifest.fromDate">
        <ion-label>
          {{ translate("Manifest") }}
          <p>{{ DateTime.fromMillis(manifest.fromDate).toFormat("dd MMMM yyyy hh:mm a ZZZZ") }}</p>
        </ion-label>
        <ion-button fill="outline" @click="downloadCarrierManifest(manifest)">
          <ion-icon :icon="printOutline" slot="start"/>
          {{ translate("Print") }}
          <ion-spinner name="crescent" slot="end" v-if="loadingContentId === manifest.contentId" />
        </ion-button>
      </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div class="empty-state" v-if="!carrierConfiguration[selectedCarrierPartyId]?.manifests?.length">
      <p>{{ translate("No historical manifests found.") }}</p>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonSpinner, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { computed, defineProps, ref } from "vue";
import { cogOutline, closeOutline, printOutline } from "ionicons/icons";
import { translate, useUserStore } from "@hotwax/dxp-components";
import { DateTime } from "luxon";
import logger from "@/logger";
import { UtilService } from "@/services/UtilService";
import { hasError } from "@hotwax/oms-api";
import { showToast } from "@/utils";

const props = defineProps(["selectedCarrierPartyId", "carrierConfiguration"]);
const currentFacility = computed(() => useUserStore().getCurrentFacility);
const loadingContentId = ref(null as any);

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const downloadCarrierManifest = async (manifest: any) => {
  loadingContentId.value = manifest?.contentId;
  const payload = {
    facilityId: currentFacility.value?.facilityId,
    carrierPartyId: props.selectedCarrierPartyId,
    manifestServiceName: props.carrierConfiguration[props.selectedCarrierPartyId]?.["MANIFEST_PRINT"],
    manifestContentId: manifest.contentId
  };

  try {
    const resp = await UtilService.downloadCarrierManifest(payload);
    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    const pdfUrl = window.URL.createObjectURL(resp.data);
    try {
      window.open(pdfUrl, "_blank").focus();
    } catch {
      showToast(translate("Unable to open as browser is blocking pop-ups.", { documentName: "carrier manifest" }), { icon: cogOutline });
    }
  } catch (err) {
    logger.error("Failed to print manifest", err);
    showToast(translate("Failed to print manifest"));
  }
  loadingContentId.value = null;
};
</script>
