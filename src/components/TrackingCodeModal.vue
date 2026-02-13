<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Adding tracking code") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list lines="none">
      <ion-item>
        <ion-input :label="translate('Tracking code')" :helper-text="translate('Carrier:', { carrierName: getCarrierInfo() ? getCarrierInfo().groupName : ''  })" v-model="trackingCode" />
      </ion-item>
      <ion-item>
        <ion-label color="medium">
          {{ translate("Enter tracking details for shipping labels generated outside of the fulfillment app. This tracking code will be shared with customers when you complete the fulfillment of the order.") }}
        </ion-label>
      </ion-item>
      <ion-item>
        <ion-button fill="clear" :disabled="!trackingCode.trim()" @click="redirectToTrackingUrl()" size="default">
          {{ translate("Test tracking url") }}
          <ion-icon :icon="openOutline" slot="end" />
        </ion-button>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="saveTrackingCode()" :disabled="!trackingCode.trim()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonLabel, IonTitle, IonToolbar, modalController, IonButton, IonButtons, IonItem, IonList } from "@ionic/vue";
import { computed, defineProps, ref } from "vue";
import { closeOutline, openOutline, saveOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { useOrderStore } from "@/store/order";
import { useCarrierStore } from "@/store/carrier";
import { OrderService } from "@/services/OrderService";
import logger from "@/logger";
import { hasError, showToast } from "@/utils";

const props = defineProps(["carrierPartyId"]);
const trackingCode = ref("");

const order = computed(() => useOrderStore().getCurrent);
const facilityCarriers = computed(() => useCarrierStore().getFacilityCarriers);

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const saveTrackingCode = async () => {
  try {
    const shipmentRouteSegmentId = order.value.shipmentPackageRouteSegDetails[0]?.shipmentRouteSegmentId;
    const resp = await OrderService.addTrackingCode({
      shipmentId: order.value.shipmentId,
      shipmentRouteSegmentId,
      trackingIdNumber: trackingCode.value
    });
    if (!hasError(resp)) {
      showToast(translate("Tracking code added successfully."));
      await useOrderStore().updateShipmentPackageDetail(order.value);
      closeModal();
    } else {
      throw resp.data;
    }
  } catch (error: any) {
    logger.error("Failed to add tracking code", error);
    showToast(translate("Failed to add tracking code."));
  }
};

const getCarrierInfo = () => {
  return facilityCarriers.value.find((carrier: any) => carrier.partyId === props.carrierPartyId);
};

const redirectToTrackingUrl = () => {
  const trackingUrl = getCarrierInfo()?.trackingUrl;
  if (!trackingUrl) {
    showToast(translate("Tracking url is not configured for following carrier."));
    return;
  }
  window.open(trackingUrl.replace("${trackingNumber}", trackingCode.value), "_blank");
};
</script>
