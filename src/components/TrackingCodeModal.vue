<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal" data-testid="tracking-code-modal-close-button"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Adding tracking code") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list lines="none">
      <ion-item>
        <ion-input :label="translate('Tracking code')" :helper-text="translate('Carrier:', { carrierName: getCarrierInfo() ? getCarrierInfo().groupName : ''  })" v-model="trackingCode" data-testid="tracking-code-modal-input" />
      </ion-item>
      <ion-item>
        <ion-label color="medium">
          {{ translate("Enter tracking details for shipping labels generated outside of the fulfillment app. This tracking code will be shared with customers when you complete the fulfillment of the order.") }}
        </ion-label>
      </ion-item>
      <ion-item>
        <ion-button fill="clear" :disabled="!trackingCode.trim()" @click="redirectToTrackingUrl()" size="default" data-testid="tracking-code-modal-test-button">
          {{ translate("Test tracking url") }}
          <ion-icon :icon="openOutline" slot="end" />
        </ion-button>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="saveTrackingCode()" :disabled="!trackingCode.trim()" data-testid="tracking-code-modal-save-button">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import { 
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonTitle,
  IonToolbar,
  modalController,
  IonButton,
  IonButtons,
  IonItem,
  IonList
} from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline, copyOutline, openOutline, saveOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { mapGetters, useStore } from "vuex";
import { OrderService } from '@/services/OrderService';
import logger from "@/logger";
import { hasError, showToast } from "@/utils";

export default defineComponent({
  name: "TrackingCodeModal",
  components: { 
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonLabel,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonItem,
    IonList
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      facilityCarriers: 'carrier/getFacilityCarriers',
    })
  },
  data() {
    return {
      trackingCode: ""
    }
  },
  props: ["carrierPartyId"],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async saveTrackingCode() {
      try {
        const shipmentRouteSegmentId = this.order.shipmentPackageRouteSegDetails[0]?.shipmentRouteSegmentId
        const resp = await OrderService.addTrackingCode({
          shipmentId: this.order.shipmentId,
          shipmentRouteSegmentId,
          trackingIdNumber: this.trackingCode
        })
        if (!hasError(resp)) {
          showToast(translate("Tracking code added successfully."));
          await this.store.dispatch('order/updateShipmentPackageDetail', this.order) 
          this.closeModal();
        } else {
          throw resp.data
        }
      } catch (error: any) {
        logger.error('Failed to add tracking code', error);
        showToast(translate("Failed to add tracking code."));
      }
    },
    getCarrierInfo() {
      return this.facilityCarriers.find((carrier: any) => carrier.partyId === this.carrierPartyId)
    },
    redirectToTrackingUrl() {
      const trackingUrl = this.getCarrierInfo()?.trackingUrl
      if(!trackingUrl) {
        showToast(translate("Tracking url is not configured for following carrier."));
        return;
      }

      window.open(trackingUrl.replace("${trackingNumber}", this.trackingCode), "_blank");
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      copyOutline,
      openOutline,
      saveOutline,
      store,
      translate
    };
  },
});
</script>
