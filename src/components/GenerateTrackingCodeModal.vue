<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Pack order") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item lines="none">
        <ion-label>
          {{ translate(isTrackingRequired ? "Tracking details are required in order to pack this shipment. Try generating a label from the selected carrier or enter a tracking code manually." : "Tracking details are missing in order to pack this shipment. Try generating a label from the selected carrier or enter a tracking code manually.") }}
        </ion-label>
      </ion-item>
      <ion-item>
        <ion-select :disabled="!order.missingLabelImage" :label="translate('Carrier')" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrier(carrierPartyId)">
          <ion-select-option v-for="carrier in facilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-select :disabled="!order.missingLabelImage" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover">
          <ion-select-option v-for="method in carrierMethods" :key="method.productStoreShipMethId" :value="method.shipmentMethodTypeId">{{ translate(method.description) }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input :label="translate('Tracking code')" :placeholder="translate('enter code')" v-model="trackingCode" />
      </ion-item>
      <ion-item>
        <ion-label>
          {{ translate("Tracking URL:", { trackingUrl: "http" }) }}
        </ion-label>
        <ion-button slot="end" fill="clear" size="default" :disabled="!trackingCode.trim()">
          {{ translate("Test") }}
          <ion-icon :icon="openOutline" slot="end" />
        </ion-button>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!isTrackingDetailUpdated()" @click="confirmSave()">
      <ion-icon :icon="isForceScanEnabled ? barcodeOutline : saveOutline" />
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
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController,
  IonButton,
  IonButtons,
  IonItem,
  IonList
} from "@ionic/vue";
import { defineComponent } from "vue";
import { barcodeOutline, closeOutline, copyOutline, openOutline, saveOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { mapGetters, useStore } from "vuex";
import { OrderService } from '@/services/OrderService';
import logger from "@/logger";
import { showToast } from "@/utils";
import { hasError } from "@/adapter";

export default defineComponent({
  name: "GenerateTrackingCodeModal",
  components: { 
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonItem,
    IonList
  },
  computed: {
    ...mapGetters({
      facilityCarriers: 'carrier/getFacilityCarriers',
      isForceScanEnabled: 'util/isForceScanEnabled',
      productStoreShipmentMethods: 'carrier/getProductStoreShipmentMethods',
      productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount',
      order: "order/getCurrent",
      completedOrders: 'order/getCompletedOrders',
    })
  },
  data() {
    return {
      isTrackingRequired: false,
      carrierMethods:[] as any,
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      trackingCode: "",
      isGeneratingShippingLabel: false
    }
  },
  async mounted() {
    this.isTrackingRequired = this.isTrackingRequiredForAnyShipmentPackage()
    if (this.facilityCarriers) {
      const shipmentPackage = this.order.shipmentPackages?.[0];
      this.carrierPartyId = shipmentPackage?.carrierPartyId ? shipmentPackage?.carrierPartyId : this.facilityCarriers[0].partyId;
      this.carrierMethods = await this.getProductStoreShipmentMethods(this.carrierPartyId);
      this.shipmentMethodTypeId = shipmentPackage?.shipmentMethodTypeId;
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    isTrackingRequiredForAnyShipmentPackage() {
      return this.order.shipmentPackages?.some((shipmentPackage: any) => shipmentPackage.isTrackingRequired === 'Y')
    },
    async getProductStoreShipmentMethods(carrierPartyId: string) { 
      return this.productStoreShipmentMethods?.filter((method: any) => method.partyId === carrierPartyId) || [];
    },
    isTrackingDetailUpdated() {
      return (this.trackingCode.trim() || this.shipmentMethodTypeId)
    },
    async updateCarrier(carrierPartyId: string) {
      this.carrierMethods = await this.getProductStoreShipmentMethods(carrierPartyId);
      this.shipmentMethodTypeId = this.carrierMethods?.[0]?.shipmentMethodTypeId;
    },
    async confirmSave() {
      let order = this.order
      let isRegenerated = false as any;

      // if the request to print shipping label is not yet completed, then clicking multiple times on the button
      // should not do anything
      if(this.isGeneratingShippingLabel) {
        return;
      }

      this.isGeneratingShippingLabel = true;

      if(this.trackingCode.trim()) {
        isRegenerated = await this.addCustomTrackingCode(order);
      } else {
        isRegenerated = await this.regenerateShippingLabel(order)
      }

      if(isRegenerated) {
        modalController.dismiss({ dismissed: true, isRegenerated });
      }
      this.isGeneratingShippingLabel = false;
    },
    async addCustomTrackingCode(order: any) {
      try {
        for (const shipmentPackage of order.shipmentPackages) {
          await OrderService.addTrackingCode({
            "shipmentId": shipmentPackage.shipmentId,
            "shipmentRouteSegmentId": shipmentPackage.shipmentRouteSegmentId,
            "shipmentPackageSeqId": shipmentPackage.shipmentPackageSeqId,
            "trackingCode": this.trackingCode.trim()
          });
        }
        //fetching updated shipment packages
        await this.store.dispatch('order/updateShipmentPackageDetail', order)
        return true;
      } catch (error: any) {
        logger.error('Failed to add tracking code', error);
        showToast(translate("Failed to add tracking code."));
      }
      return false;
    },
    async regenerateShippingLabel(order: any) {
      // If there are no product store shipment method configured, then not generating the label and displaying an error toast
      if(this.productStoreShipmentMethCount <= 0) {
        showToast(translate('Unable to generate shipping label due to missing product store shipping method configuration'))
        return;
      }

      // Getting all the shipmentIds from shipmentPackages for which label is missing
      const shipmentIds = order.shipmentPackages
          ?.filter((shipmentPackage: any) => !shipmentPackage.trackingCode)
          .map((shipmentPackage: any) => shipmentPackage.shipmentId);

      if(!shipmentIds?.length) {
        showToast(translate("Failed to generate shipping label"))
        return;
      }

      try {
        const resp = await OrderService.retryShippingLabel(shipmentIds)

        if (!hasError(resp)) {
          //Updated shipment package detail is needed if the label pdf url is generated on retrying shipping label generation
          await this.store.dispatch('order/updateShipmentPackageDetail', order) 

          // TODO fetch specific order
          this.initialiseOrderQuery();
          return true;
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
        showToast(translate("Failed to generate shipping label"))
      }
      return false;
    },
    async initialiseOrderQuery() {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      completedOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
  },
  setup() {
    const store = useStore();
    return {
      barcodeOutline,
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