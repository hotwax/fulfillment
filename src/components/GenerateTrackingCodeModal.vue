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
    <ion-list>
      <ion-item lines="none">
        <ion-label>
          {{ translate("We were unable to automatically fetch a shipping label from", {carrierName: getCarrier() ? getCarrier() : 'carrier'}) }}<br/>
          {{ translate("To pack this order you must add a tracking details.") }}
          <br/><br/>
            1. {{ translate("Try generating a label with a different carrier.") }}<br/>
            2. {{ translate("Generate a label externally and add tracking details manually.") }}<br/>
            3. {{ translate("Reject order and share troubleshooting details.") }}<br/>
        </ion-label>
      </ion-item>
      <ion-item>
        <ion-label color="danger">
          <p class="overline">{{ translate("Gateway error") }}</p>
          {{ order.gatewayMessage }}
        </ion-label>
        <ion-button fill="clear" color="medium" @click="copyToClipboard(order.gatewayMessage, 'Copied to clipboard')"> 
          <ion-icon slot="icon-only" :icon="copyOutline" />
        </ion-button>
      </ion-item>
    </ion-list>
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
          <ion-item lines="none">
            <ion-textarea fill="outline" placeholder="Add a message" v-model="rejectionComment" />
          </ion-item>
        </ion-list>
      </template>
      <template v-else-if="selectedSegment === 'update-tracking-detail'">
        <ion-list>
          <ion-item>
            <ion-select :disabled="!order.missingLabelImage || !hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)" :label="translate('Carrier')" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrier(carrierPartyId)">
              <ion-select-option v-for="carrier in facilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <template v-if="carrierMethods && carrierMethods.length > 0">
              <ion-select :disabled="!order.missingLabelImage || !hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover">
                <ion-select-option v-for="method in carrierMethods" :key="carrierMethods.partyId + method.shipmentMethodTypeId" :value="method.shipmentMethodTypeId">{{ translate(method.description) }}</ion-select-option>
              </ion-select>
            </template>
            <template v-else>
              <ion-label>
                {{ translate('No shipment methods linked to', {carrierName: getCarrierName()}) }}
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
            <ion-select :disabled="!order.missingLabelImage || !hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)" :label="translate('Carrier')" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrier(carrierPartyId)">
              <ion-select-option v-for="carrier in facilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <template v-if="carrierMethods && carrierMethods.length > 0">
              <ion-select :disabled="!order.missingLabelImage || !hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover">
                <ion-select-option v-for="method in carrierMethods" :key="carrierMethods.partyId + method.shipmentMethodTypeId" :value="method.shipmentMethodTypeId">{{ translate(method.description) }}</ion-select-option>
              </ion-select>
            </template>
            <template v-else>
              <ion-label>
                {{ translate('No shipment methods linked to', {carrierName: getCarrierName()}) }}
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

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { archiveOutline, barcodeOutline, closeOutline, copyOutline, informationCircleOutline, openOutline, saveOutline, trashOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { mapGetters, useStore } from "vuex";
import { OrderService } from '@/services/OrderService';
import logger from "@/logger";
import { copyToClipboard, showToast } from "@/utils";
import { hasError } from "@/adapter";
import { retryShippingLabel } from "@/utils/order";
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: "GenerateTrackingCodeModal",
  components: { 
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      facilityCarriers: 'carrier/getFacilityCarriers',
      productStoreShipmentMethods: 'carrier/getProductStoreShipmentMethods',
      productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount',
    })
  },
  data() {
    return {
      shippingRejectionReason: "NO_VARIANCE_LOG", //TODO: Specifc reason should be used in order to track rejection due to shipping label issues
      rejectOrder: false,
      rejectionComment: "",
      selectedSegment: 'update-carrier',
      isTrackingRequired: false,
      carrierMethods:[] as any,
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      trackingCode: ""
    }
  },
  props: ["order", "updateCarrierShipmentDetails", "executePackOrder", "rejectEntireOrder", "updateParameter", "documentOptions"],
  async mounted() {
    this.isTrackingRequired = this.isTrackingRequiredForAnyShipmentPackage()
    if (this.facilityCarriers) {
      this.carrierPartyId = this.order?.carrierPartyId ? this.order?.carrierPartyId : this.facilityCarriers[0].partyId;
      this.carrierMethods = await this.getProductStoreShipmentMethods(this.carrierPartyId);
      this.shipmentMethodTypeId = this.order?.shipmentMethodTypeId;
    }
  },
  methods: {
    closeModal(payload = {}) {
      modalController.dismiss({ dismissed: true, ...payload });
    },
    openShippingMethodDocumentReference() {
      window.open('https://docs.hotwax.co/documents/v/system-admins/fulfillment/shipping-methods/carrier-and-shipment-methods', '_blank');
    },
    isTrackingRequiredForAnyShipmentPackage() {
      return this.order.isTrackingRequired === 'Y'
    },
    async getProductStoreShipmentMethods(carrierPartyId: string) { 
      return this.productStoreShipmentMethods?.filter((method: any) => method.partyId === carrierPartyId) || [];
    },
    getCarrierName() {
      this.order.carrier
    },
    getCarrier() {
      const carrier = this.facilityCarriers.find((facilityCarrier: any) => facilityCarrier.partyId === this.order.carrierPartyId)
      return carrier?.groupName ? carrier?.groupName : carrier?.carrierPartyId
    },
    async updateCarrier(carrierPartyId: string) {
      this.carrierMethods = await this.getProductStoreShipmentMethods(carrierPartyId);
      this.shipmentMethodTypeId = this.carrierMethods?.[0]?.shipmentMethodTypeId;
    },
    reinitializeData(){
      this.carrierPartyId = this.order.carrierPartyId
      this.shipmentMethodTypeId = this.order.shipmentMethodTypeId
      this.trackingCode = ""
      this.rejectOrder = false;
      this.rejectionComment = ""
    },
    async confirmSave() {
      let order = this.order
      let isSuccess = true;
      if (this.selectedSegment !== 'reject-order' && hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE) && (order.carrierPartyId !== this.carrierPartyId || order.shipmentMethodTypeId !== this.shipmentMethodTypeId)) {
        const isUpdated = await this.updateCarrierAndShippingMethod(this.carrierPartyId, this.shipmentMethodTypeId)
        if(!isUpdated) {
          showToast(translate("Failed to update shipment method detail."));
          return;
        }
      }
      const rejectEntireOrder = this.selectedSegment === 'reject-order' && this.rejectOrder
      if (rejectEntireOrder) {
        order.items.map((orderItem: any) => {
          orderItem.rejectReason = this.shippingRejectionReason
        })
        isSuccess = await this.rejectEntireOrder(order, 'report')
      } else {
        isSuccess = await this.executePackOrder(this.order, this.updateParameter, this.trackingCode.trim(), this.documentOptions);
      }
      if (isSuccess) {
        this.closeModal();
      }
    },
    getCarrierTrackingUrl() {
      return this.facilityCarriers.find((carrier: any) => carrier.partyId === this.carrierPartyId)?.trackingUrl
    },
    generateTrackingUrl() {
      if(this.getCarrierTrackingUrl()) {
        return translate("Tracking URL:", { trackingUrl: this.getCarrierTrackingUrl()?.replace("${trackingNumber}", this.trackingCode) })
      }
      return translate("A tracking URL is not configured for", { carrierName: this.getCarrierName() })
    },
    async updateCarrierAndShippingMethod(carrierPartyId: string, shipmentMethodTypeId: string) {
      let resp;
      try{
        const carrierShipmentMethods = await this.getProductStoreShipmentMethods(carrierPartyId);
        shipmentMethodTypeId = shipmentMethodTypeId ? shipmentMethodTypeId : carrierShipmentMethods?.[0]?.shipmentMethodTypeId;
        const shipmentRouteSegmentId = this.order?.shipmentPackageRouteSegDetails[0]?.shipmentRouteSegmentId

        const isTrackingRequired = carrierShipmentMethods.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)?.isTrackingRequired
        const params = {
          shipmentId: this.order.shipmentId,
          shipmentRouteSegmentId,
          shipmentMethodTypeId : shipmentMethodTypeId ? shipmentMethodTypeId : "",
          carrierPartyId,
          isTrackingRequired: isTrackingRequired ? isTrackingRequired : "Y"
        }

        resp = await OrderService.updateShipmentCarrierAndMethod(params)
        if (hasError(resp)) {
          throw resp.data;
        }

        this.isTrackingRequired = isTrackingRequired === "N" ? false : true
      } catch(error: any) {
        logger.error("Failed to update carrier and method", error);
        return false;
      }

      this.updateCarrierShipmentDetails && this.updateCarrierShipmentDetails(carrierPartyId, shipmentMethodTypeId);
      return true;
    },
    redirectToTrackingUrl() {
      window.open(this.getCarrierTrackingUrl().replace("${trackingNumber}", this.trackingCode), "_blank");
    }
  },
  setup() {
    const store = useStore();
    return {
      Actions,
      archiveOutline,
      barcodeOutline,
      copyToClipboard,
      closeOutline,
      copyOutline,
      hasPermission,
      informationCircleOutline,
      openOutline,
      retryShippingLabel,
      saveOutline,
      store,
      translate,
      trashOutline
    };
  },
});
</script>
<style scoped>
ion-content {
  --padding-bottom: 80px;
}
</style>