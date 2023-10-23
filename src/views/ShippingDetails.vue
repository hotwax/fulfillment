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
        </ion-label>
      </ion-item>
      <ion-item color="light" lines="none" v-if="currentOrder?.shippingInstructions">
        <ion-label class="ion-text-wrap">
          <p class="overline">{{ translate("Handling Instructions") }}</p>
          <p>{{ currentOrder?.shippingInstructions ? currentOrder.shippingInstructions : 'Sample Handling instructions' }}</p>
        </ion-label>
      </ion-item>
      <ion-item lines="none" v-if="currentOrder.trackingCode">
        <ion-label>
          {{ currentOrder.trackingCode }}
        </ion-label>        
        <ion-button fill="clear" @click="printShippingLabel(currentOrder)">
          <ion-icon :icon="openOutline" slot="end" />
        </ion-button>
      </ion-item>
      <ion-item lines="none" v-if="!currentOrder.trackingCode && currentOrder.shipmentPackages && ['PICKITEM_PICKED', 'PICKITEM_COMPLETED'].includes(currentOrder?.items[0]?.picklistItemStatusId)">
        <ion-label class="ion-text-wrap" v-if="shipmentLabelErrorMessages">
          {{ shipmentLabelErrorMessages }}
        </ion-label>
        <ion-label v-else>
          {{ translate('Missing shipping label') }}
        </ion-label>
        <ion-button fill="clear" @click="retryShippingLabel(currentOrder)">
          <ion-icon :icon="refreshSharp" slot="end" />
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
  IonLabel
} from "@ionic/vue";
import { defineComponent } from "vue";
import { openOutline, refreshSharp } from "ionicons/icons";
import { useStore, mapGetters } from "vuex";
import { showToast } from '@/utils';
import { translate } from '@hotwax/dxp-components'
import { OrderService } from '@/services/OrderService';
import { hasError } from '@/adapter'

export default defineComponent({
  name: "CreateMappingModal",
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonIcon,
    IonItem,
    IonLabel
  },
  data() {
    return {
      shipmentLabelErrorMessages: ""
    }
  },
  computed: {
    ...mapGetters({
      currentOrder: 'order/getCurrent'
    })
  },
  async mounted() {
    // Fetching shipment label errors
    const shipmentIds = this.currentOrder.shipments?.map((shipment: any) => shipment.shipmentId);
    const labelErrors = await OrderService.fetchShipmentLabelError(shipmentIds);
    this.shipmentLabelErrorMessages = labelErrors.join(', ');
  },
  methods: {
    async printShippingLabel(order: any) {
      const shipmentIds = order.shipments.map((shipment: any) => shipment.shipmentId)
      await OrderService.printShippingLabel(shipmentIds)
    },
    async retryShippingLabel(order: any) {
      const shipmentIds = order.shipmentPackages.map((shipmentPackage: any) => shipmentPackage.shipmentId);
      const resp = await OrderService.retryShippingLabel(shipmentIds)
      if (!hasError(resp)) {
        showToast(translate("Shipping Label generated successfully"))
        await this.printShippingLabel(order)
      } else {
        showToast(translate("Failed to generate shipping label"))
      }
    }
  },
  setup() {
    const store = useStore();
    return {
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
}
</style>
