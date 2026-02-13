<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add tracking details") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div class="ion-padding">
      <ion-label>
        {{ translate("We were unable to automatically fetch a shipping label from", {carrierName: getCarrier() ? getCarrier() : 'carrier'}) }}<br/>
        {{ translate("To pack this order you must add a tracking details.") }}
      </ion-label>
      <br/><br/>
      <ion-label :color="selectedSegment === 'update-carrier' ? '' : 'medium'">1. {{ translate("Try generating a label with a different carrier.") }}<br/></ion-label>
      <ion-label :color="selectedSegment === 'update-tracking-detail' ? '' : 'medium'">2. {{ translate("Generate a label externally and add tracking details manually.") }}<br/></ion-label>
      <ion-label :color="selectedSegment === 'reject-order' ? '' : 'medium'">3. {{ translate("Reject order and share troubleshooting details.") }}<br/></ion-label>
    </div>
    <ion-item lines="full" v-if="order.gatewayMessage || packingErrorMessage">
      <ion-label>
        <p class="overline">{{ translate("Gateway error") }}</p>
        {{ order.gatewayMessage || packingErrorMessage }}
      </ion-label>
      <ion-button fill="clear" color="medium" @click="copyToClipboard(order.gatewayMessage || packingErrorMessage, 'Copied to clipboard')">
        <ion-icon slot="icon-only" :icon="copyOutline" />
      </ion-button>
    </ion-item>
    <ion-segment scrollable v-model="selectedSegment" @click="reinitializeData">
      <ion-segment-button value="update-carrier">
        <ion-label>{{ translate("Update carrier") }}</ion-label>
      </ion-segment-button>
      <ion-segment-button value="update-tracking-detail">
        <ion-label>{{ translate("Manual tracking details") }}</ion-label>
      </ion-segment-button>
      <ion-segment-button value="reject-order">
        <ion-label>{{ translate("Reject order") }}</ion-label>
      </ion-segment-button>
    </ion-segment>
    <div class="segments">
      <template v-if="selectedSegment === 'reject-order'">
        <ion-list>
          <ion-item lines="none">
            <ion-checkbox justify="start" label-placement="end" v-model="rejectOrder">
              <div>
                <ion-label>{{ translate('I am unable to provide tracking for this order and need to reject it.') }}</ion-label>
                <ion-note>{{ translate('This will not affect the inventory for the ordered items at your store.') }}</ion-note>
              </div>
            </ion-checkbox>
          </ion-item>
          <ion-textarea class="ion-padding" fill="outline" placeholder="Add a message" v-model="rejectionComment" />
        </ion-list>
      </template>
      <template v-else-if="selectedSegment === 'update-tracking-detail'">
        <ion-list>
          <ion-item>
            <ion-select :disabled="!order.missingLabelImage" :label="translate('Carrier')" :selectedText="getCarrier()" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrier(carrierPartyId)">
              <ion-select-option v-for="carrier in filteredFacilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <template v-if="carrierMethods && carrierMethods.length > 0">
              <ion-select :disabled="!order.missingLabelImage || shipmentMethodTypeId === 'SHIP_TO_STORE'" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover">
                <ion-select-option v-for="method in carrierMethods" :key="carrierMethods.partyId + method.shipmentMethodTypeId" :value="method.shipmentMethodTypeId">{{ translate(method.description) }}</ion-select-option>
              </ion-select>
            </template>
            <template v-else>
              <ion-label>
                {{ translate('No shipment methods linked to', {carrierName: getCarrier()}) }}
              </ion-label>
              <ion-button @click="openShippingMethodDocumentReference()" fill="clear" color="medium" slot="end">
                <ion-icon slot="icon-only" :icon="informationCircleOutline" />
              </ion-button>
            </template>
          </ion-item>
          <ion-item>
            <ion-input :label="translate('Tracking code')" :placeholder="translate('enter code')" v-model="trackingCode" />
          </ion-item>
          <ion-item>
            <ion-label>{{ generateTrackingUrl() }}</ion-label>
            <ion-button slot="end" fill="clear" size="default" :disabled="!trackingCode.trim() || !getCarrierTrackingUrl()" @click="redirectToTrackingUrl()">
              {{ translate("Test") }}
              <ion-icon :icon="openOutline" slot="end" />
            </ion-button>
          </ion-item>
        </ion-list>
      </template>
      <template v-else>
        <ion-list>
          <ion-item>
            <ion-select :disabled="!order.missingLabelImage" :label="translate('Carrier')" :selectedText="getCarrier()" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrier(carrierPartyId)">
              <ion-select-option v-for="carrier in filteredFacilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <template v-if="carrierMethods && carrierMethods.length > 0">
              <ion-select :disabled="!order.missingLabelImage || shipmentMethodTypeId === 'SHIP_TO_STORE'" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover">
                <ion-select-option v-for="method in carrierMethods" :key="carrierMethods.partyId + method.shipmentMethodTypeId" :value="method.shipmentMethodTypeId">{{ translate(method.description) }}</ion-select-option>
              </ion-select>
            </template>
            <template v-else>
              <ion-label>
                {{ translate('No shipment methods linked to', {carrierName: getCarrier()}) }}
              </ion-label>
              <ion-button @click="openShippingMethodDocumentReference()" fill="clear" color="medium" slot="end">
                <ion-icon slot="icon-only" :icon="informationCircleOutline" />
              </ion-button>
            </template>
          </ion-item>
        </ion-list>
      </template>
    </div>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :color="selectedSegment === 'reject-order' ? 'danger' : ''" :disabled="(selectedSegment !== 'reject-order' && !shipmentMethodTypeId) || (selectedSegment === 'reject-order' && !rejectOrder)" @click="confirmSave()">
      <ion-icon :icon="selectedSegment === 'reject-order' ? trashOutline : archiveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { computed, defineProps, onMounted, ref } from "vue";
import { archiveOutline, closeOutline, copyOutline, informationCircleOutline, openOutline, trashOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { OrderService } from "@/services/OrderService";
import logger from "@/logger";
import { copyToClipboard, showToast } from "@/utils";
import { hasError } from "@/adapter";
import { useRouter } from "vue-router";
import { useCarrierStore } from "@/store/carrier";
import { useUserStore } from "@/store/user";

const props = defineProps(["order", "updateCarrierShipmentDetails", "executePackOrder", "rejectEntireOrder", "updateParameter", "documentOptions", "packingError", "isDetailPage", "initialShipmentMethodTypeId"]);

const router = useRouter();
const shippingRejectionReason = "NO_VARIANCE_LOG";
const rejectOrder = ref(false);
const rejectionComment = ref("");
const selectedSegment = ref("update-carrier");
const isTrackingRequired = ref(false);
const carrierMethods = ref([] as any[]);
const carrierPartyId = ref("");
const shipmentMethodTypeId = ref("");
const trackingCode = ref("");
const packingErrorMessage = ref("");

const facilityCarriers = computed(() => useCarrierStore().getFacilityCarriers);
const productStoreShipmentMethods = computed(() => useCarrierStore().getProductStoreShipmentMethods);
const userProfile = computed(() => useUserStore().getUserProfile);

const filteredFacilityCarriers = computed(() => {
  const methodTypeId = props.initialShipmentMethodTypeId ? props.initialShipmentMethodTypeId : props.order?.shipmentMethodTypeId;
  if (methodTypeId === "SHIP_TO_STORE") {
    const allowedPartyIds = new Set(productStoreShipmentMethods.value.filter((method: any) => method.shipmentMethodTypeId === "SHIP_TO_STORE").map((method: any) => method.partyId));
    return facilityCarriers.value.filter((carrier: any) => allowedPartyIds.has(carrier.partyId));
  }
  return facilityCarriers.value;
});

onMounted(async () => {
  await Promise.all([useCarrierStore().fetchFacilityCarriers(), useCarrierStore().fetchProductStoreShipmentMeths()]);
  isTrackingRequired.value = isTrackingRequiredForAnyShipmentPackage();
  if (facilityCarriers.value) {
    carrierPartyId.value = props.order?.carrierPartyId ? props.order?.carrierPartyId : facilityCarriers.value[0].partyId;
    carrierMethods.value = await getProductStoreShipmentMethods(carrierPartyId.value);
    shipmentMethodTypeId.value = props.order?.shipmentMethodTypeId;
  }
  packingErrorMessage.value = props.packingError;
});

const closeModal = (payload = {}) => {
  modalController.dismiss({ dismissed: true, ...payload });
};

const openShippingMethodDocumentReference = () => {
  window.open("https://docs.hotwax.co/documents/v/system-admins/fulfillment/shipping-methods/carrier-and-shipment-methods", "_blank");
};

const isTrackingRequiredForAnyShipmentPackage = () => {
  return props.order.isTrackingRequired === "Y";
};

const getProductStoreShipmentMethods = async (partyId: string) => {
  const methodTypeId = props.initialShipmentMethodTypeId ? props.initialShipmentMethodTypeId : props.order?.shipmentMethodTypeId;
  return productStoreShipmentMethods.value?.filter((method: any) => method.partyId === partyId && (methodTypeId === "SHIP_TO_STORE" || method.shipmentMethodTypeId !== "SHIP_TO_STORE")) || [];
};

const getCarrier = () => {
  const carrier = facilityCarriers.value.find((facilityCarrier: any) => facilityCarrier.partyId === carrierPartyId.value);
  return carrier?.groupName ? carrier?.groupName : carrier?.carrierPartyId ? carrier.carrierPartyId : carrierPartyId.value;
};

const updateCarrier = async (partyId: string) => {
  carrierMethods.value = await getProductStoreShipmentMethods(partyId);
  const isCurrentMethodSupported = shipmentMethodTypeId.value && carrierMethods.value.some((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId.value);
  shipmentMethodTypeId.value = isCurrentMethodSupported ? shipmentMethodTypeId.value : (carrierMethods.value?.[0]?.shipmentMethodTypeId || "");
};

const reinitializeData = () => {
  carrierPartyId.value = props.order.carrierPartyId;
  shipmentMethodTypeId.value = props.order.shipmentMethodTypeId;
  trackingCode.value = "";
  rejectOrder.value = false;
  rejectionComment.value = "";
};

const confirmSave = async () => {
  const order = props.order;
  let isSuccess = true;
  if (selectedSegment.value !== "reject-order" && (order.carrierPartyId !== carrierPartyId.value || order.shipmentMethodTypeId !== shipmentMethodTypeId.value)) {
    const isUpdated = await updateCarrierAndShippingMethod(carrierPartyId.value, shipmentMethodTypeId.value);
    if (!isUpdated) {
      showToast(translate("Failed to update shipment method detail."));
      return;
    }
  }
  const rejectEntireOrder = selectedSegment.value === "reject-order" && rejectOrder.value;
  if (rejectEntireOrder) {
    order.items.map((orderItem: any) => {
      orderItem.rejectReason = shippingRejectionReason;
    });
    isSuccess = await props.rejectEntireOrder(order, "report");
    if (isSuccess) {
      try {
        OrderService.createCommunicationEvent({ communicationEventTypeId: "FULFILLMENT_ERROR", statusId: "COM_COMPLETE", partyIdFrom: userProfile.value.partyId, content: rejectionComment.value });
      } catch (e) {
        logger.log("Error in creating communication event for order rejection due to shipping label error");
      }
      if (props.isDetailPage) {
        router.push("/in-progress");
      }
    }
  } else {
    const packingResponse = await props.executePackOrder(props.order, props.updateParameter, trackingCode.value.trim(), props.documentOptions);
    isSuccess = packingResponse.isPacked;
    packingErrorMessage.value = packingResponse.errors;
  }
  if (isSuccess) {
    closeModal();
  }
};

const getCarrierTrackingUrl = () => {
  return facilityCarriers.value.find((carrier: any) => carrier.partyId === carrierPartyId.value)?.trackingUrl;
};

const generateTrackingUrl = () => {
  if (getCarrierTrackingUrl()) {
    return translate("Tracking URL:", { trackingUrl: getCarrierTrackingUrl()?.replace("${trackingNumber}", trackingCode.value) });
  }
  return translate("A tracking URL is not configured for", { carrierName: getCarrier() });
};

const updateCarrierAndShippingMethod = async (partyId: string, methodTypeId: string) => {
  try {
    const carrierShipmentMethods = await getProductStoreShipmentMethods(partyId);
    methodTypeId = methodTypeId ? methodTypeId : carrierShipmentMethods?.[0]?.shipmentMethodTypeId;
    const shipmentRouteSegmentId = props.order?.shipmentPackageRouteSegDetails[0]?.shipmentRouteSegmentId;

    const trackingRequired = carrierShipmentMethods.find((method: any) => method.shipmentMethodTypeId === methodTypeId)?.isTrackingRequired;
    const params = {
      shipmentId: props.order.shipmentId,
      shipmentRouteSegmentId,
      shipmentMethodTypeId: methodTypeId ? methodTypeId : "",
      carrierPartyId: partyId,
      isTrackingRequired: trackingRequired ? trackingRequired : "Y"
    };

    const resp = await OrderService.updateShipmentCarrierAndMethod(params);
    if (hasError(resp)) {
      throw resp.data;
    }

    isTrackingRequired.value = trackingRequired === "N" ? false : true;
  } catch (error: any) {
    logger.error("Failed to update carrier and method", error);
    return false;
  }

  props.updateCarrierShipmentDetails && props.updateCarrierShipmentDetails(partyId, methodTypeId);
  return true;
};

const redirectToTrackingUrl = () => {
  window.open(getCarrierTrackingUrl().replace("${trackingNumber}", trackingCode.value), "_blank");
};
</script>
<style scoped>
ion-content {
  --padding-bottom: 80px;
}
</style>
