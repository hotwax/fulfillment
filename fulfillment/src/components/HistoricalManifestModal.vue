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

<script>
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSpinner,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { cogOutline, closeOutline, printOutline } from 'ionicons/icons';
import { translate, useUserStore } from '@hotwax/dxp-components';
import { useStore } from "vuex";
import { DateTime } from 'luxon';
import logger from '@/logger';
import { UtilService } from '@/services/UtilService';
import { hasError } from '@hotwax/oms-api';
import { showToast } from "@/utils";

export default defineComponent({
  name: "HistoricalManifestModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonSpinner,
    IonTitle,
    IonToolbar,
  },
  data() {
    return {
      items: [],
      loadingContentId: null
    }
  },
  props: ["selectedCarrierPartyId", "carrierConfiguration"],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    getTime(time) {
      return DateTime.fromMillis(time).toFormat("H:mm a dd/MM/yyyy")
    },
    async downloadCarrierManifest(manifest) {
      this.loadingContentId = manifest?.contentId;
      const payload = {
        facilityId: this.currentFacility?.facilityId,
        carrierPartyId: this.selectedCarrierPartyId,
        manifestServiceName: this.carrierConfiguration[this.selectedCarrierPartyId]?.["MANIFEST_PRINT"],
        manifestContentId: manifest.contentId
      }

      try {
        const resp = await UtilService.downloadCarrierManifest(payload);

        if (!resp || resp.status !== 200 || hasError(resp)) {
          throw resp.data
        }

        // Generate local file URL for the blob received
        const pdfUrl = window.URL.createObjectURL(resp.data);
        // Open the file in new tab
        try {
          window.open(pdfUrl, "_blank").focus();
        }
        catch {
          showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'carrier manifest'}), { icon: cogOutline });
        }
      } catch(err) {
        logger.error("Failed to print manifest", err)
        showToast(translate("Failed to print manifest"));
      }
      this.loadingContentId = null;
    }
  },
  setup() {
    const store = useStore();
    const userStore = useUserStore()

    let currentFacility = computed(() => userStore.getCurrentFacility)

    return {
      closeOutline,
      currentFacility,
      printOutline,
      store,
      translate,
      DateTime
    };
  },
});
</script>
