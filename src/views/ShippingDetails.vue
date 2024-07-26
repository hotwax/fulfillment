<template>
  <div class="shipgroup-details">
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          {{ translate('Destination') }}
        </ion-card-title>
      </ion-card-header>
      <ion-item lines="none">
        <ion-label>
          <h3>{{ currentOrder?.shippingAddress?.toName }}</h3>
          <p class="ion-text-wrap">{{ currentOrder?.shippingAddress?.address1 }}</p>
          <p class="ion-text-wrap" v-if="currentOrder?.shippingAddress?.address2">{{ currentOrder.shippingAddress.address2 }}</p>
          <p class="ion-text-wrap">{{ currentOrder?.shippingAddress?.city ? currentOrder.shippingAddress.city + "," : "" }} {{ currentOrder.shippingAddress?.postalCode }}</p>
          <p class="ion-text-wrap">{{ currentOrder?.shippingAddress?.stateName ? currentOrder.shippingAddress.stateName + "," : "" }} {{ currentOrder.shippingAddress?.countryName }}</p>
          <p class="ion-text-wrap" v-if="currentOrder?.contactNumber">{{ currentOrder?.contactNumber }}</p>
        </ion-label>
      </ion-item>
      <ion-item color="light" lines="none" v-if="currentOrder?.shippingInstructions">
        <ion-label class="ion-text-wrap">
          <p class="overline">{{ translate("Handling Instructions") }}</p>
          <p>{{ currentOrder?.shippingInstructions ? currentOrder.shippingInstructions : 'Sample Handling instructions' }}</p>
        </ion-label>
      </ion-item>
    </ion-card>

    <ion-card v-if="['PICKITEM_PENDING', 'PICKITEM_PICKED', 'PICKITEM_COMPLETED'].includes(currentOrder?.items[0]?.picklistItemStatusId)">
      <ion-card-header>
        <ion-card-title>
          {{ translate('Shipment method') }}
        </ion-card-title>
      </ion-card-header>
      <ion-item>
        <ion-select :disabled="currentOrder.trackingCode" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover" @ionChange="updateCarrierAndShippingMethod(carrierPartyId, shipmentMethodTypeId)">
          <ion-select-option v-for="method in carrierMethods" :key="method.shipmentMethodTypeId" :value="method.shipmentMethodTypeId">{{ translate(method.description) }}</ion-select-option>
          <ion-select-option value="">{{ translate("None") }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-select :disabled="currentOrder.trackingCode" :label="translate('Carrier')" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrierAndShippingMethod(carrierPartyId, '')">
          <ion-select-option v-for="carrier in facilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
        </ion-select>
      </ion-item>
      <template v-if="!currentOrder.trackingCode">
        <ion-button :disabled="!shipmentMethodTypeId" fill="outline" expand="block" @click.stop="retryShippingLabel(currentOrder)">
          {{ shipmentLabelErrorMessages ? translate("Retry Label") : translate("Generate Label") }}
          <ion-spinner color="primary" slot="end" v-if="currentOrder.isGeneratingShippingLabel" name="crescent" />
        </ion-button>
        <ion-item lines="none" v-if="shipmentLabelErrorMessages">
          <ion-label class="ion-text-wrap">
            {{ shipmentLabelErrorMessages }}
          </ion-label>
        </ion-item>
      </template>
      <ion-item v-else>
        <ion-label>
          {{ currentOrder.trackingCode }}
          <p>{{ translate("tracking code") }}</p>
        </ion-label>        
        <ion-button slot="end" fill="clear" color="medium" @click="shippingLabelActionPopover($event, currentOrder)">
          <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
        </ion-button>
      </ion-item>
    </ion-card>
  </div>
</template>

<script lang="ts">
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { ellipsisVerticalOutline, openOutline, refreshSharp } from "ionicons/icons";
import { useStore, mapGetters } from "vuex";
import { showToast } from '@/utils';
import { translate } from '@hotwax/dxp-components'
import { OrderService } from '@/services/OrderService';
import logger from '@/logger';
import { hasError } from '@/adapter'
import ShippingLabelActionPopover from '@/components/ShippingLabelActionPopover.vue';

export default defineComponent({
  name: "ShippingDetails",
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonIcon,
    IonItem,
    IonLabel,
    IonSelect,
    IonSpinner,
    IonSelectOption
  },
  data() {
    return {
      shipmentLabelErrorMessages: "",
      shipmentMethodTypeId: "",
      carrierPartyId: "",
      carrierMethods:[] as any
    }
  },
  computed: {
    ...mapGetters({
      currentOrder: 'order/getCurrent',
      productStoreShipmentMethods: 'carrier/getProductStoreShipmentMethods',
      facilityCarriers: 'carrier/getFacilityCarriers',
    })
  },
  async mounted() {
    await Promise.all([this.store.dispatch('carrier/fetchFacilityCarriers'), this.store.dispatch('carrier/fetchProductStoreShipmentMeths')]);
    if (this.facilityCarriers) {
      const shipmentPackage = this.currentOrder.shipmentPackages?.[0];
      this.carrierPartyId = shipmentPackage?.carrierPartyId ? shipmentPackage?.carrierPartyId : this.facilityCarriers[0].partyId;
      await this.getProductStoreShipmentMethods(this.carrierPartyId);
      this.shipmentMethodTypeId = shipmentPackage?.shipmentMethodTypeId;
    }
    
    // Fetching shipment label errors 
    const shipmentIds = this.currentOrder?.shipmentIds?.length > 0 ? this.currentOrder?.shipmentIds : this.currentOrder.shipments?.map((shipment: any) => shipment.shipmentId);
    if (shipmentIds && shipmentIds.length > 0) {
      const labelErrors = await OrderService.fetchShipmentLabelError(shipmentIds);
      this.shipmentLabelErrorMessages = labelErrors.join(', ');
    }
  },
  methods: {
    async shippingLabelActionPopover(ev: Event, currentOrder: any) {
      const popover = await popoverController.create({
        component: ShippingLabelActionPopover,
        componentProps: {
          currentOrder: currentOrder
        },
        event: ev,
        showBackdrop: false
      });

      return popover.present()
    },
    async updateCarrierAndShippingMethod(carrierPartyId: string, shipmentMethodTypeId: string) {
      let resp;
      try {
        for (const shipmentPackage of this.currentOrder.shipmentPackages) {
          resp = await OrderService.updateShipmentRouteSegment({
            "shipmentId": shipmentPackage.shipmentId,
            "shipmentRouteSegmentId": shipmentPackage.shipmentRouteSegmentId,
            "carrierPartyId": carrierPartyId,
            "shipmentMethodTypeId": shipmentMethodTypeId
          }) as any;
          if (!hasError(resp)) {
            showToast(translate("Shipment method detail updated successfully."))
            //fetching updated shipment packages
            await this.store.dispatch('order/updateShipmentPackageDetail', this.currentOrder) 
            await this.getProductStoreShipmentMethods(carrierPartyId)
          } else {
            throw resp.data;
          }
        }
      } catch (err) {
        logger.error('Failed to update carrier and method', err);
        showToast(translate("Failed to update shipment method detail."));
      }
    },

    async getProductStoreShipmentMethods(carrierPartyId: string) {
      this.carrierMethods = this.productStoreShipmentMethods?.filter((method: any) => method.partyId === carrierPartyId) || [];
    },
    async printShippingLabel(order: any) {
      const shipmentIds = order?.shipmentIds?.length > 0 ? order?.shipmentIds : order.shipments?.map((shipment: any) => shipment.shipmentId);
      const shippingLabelPdfUrls = order.shipmentPackages
          ?.filter((shipmentPackage: any) => shipmentPackage.labelPdfUrl)
          .map((shipmentPackage: any) => shipmentPackage.labelPdfUrl);
      await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
    },
    async retryShippingLabel(order: any) {
      order.isGeneratingShippingLabel = true;
      const shipmentIds = order.shipmentPackages.map((shipmentPackage: any) => shipmentPackage.shipmentId);
      const resp = await OrderService.retryShippingLabel(shipmentIds)
      if (!hasError(resp)) {
        //Updated shipment package detail is needed if the label pdf url is generated on retrying shipping label generation
        await this.store.dispatch('order/updateShipmentPackageDetail', order) 
        order = this.currentOrder;
        showToast(translate("Shipping Label generated successfully"))
        await this.printShippingLabel(order)
      } else {
        showToast(translate("Failed to generate shipping label"))
      }
      order.isGeneratingShippingLabel = false;
    }
  },
  setup() {
    const store = useStore();
    return {
      ellipsisVerticalOutline,
      openOutline,
      refreshSharp,
      translate,
      store
    };
  }
});
</script>

<style>
.shipgroup-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(343px, 1fr));
  gap: 10px;
  align-items: start;
}
</style>
