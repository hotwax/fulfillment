<template>
  <ion-card>
    <ion-card-content>
      <h2>{{ translate('Destination') }}</h2>  
      <ion-item lines="none">
        <ion-label>
          <h3>{{ currentOrder?.shippingAddress?.toName }}</h3>
          <p>{{ currentOrder?.shippingAddress?.address1 }}</p>
          <p v-if="currentOrder?.shippingAddress?.address2">{{ currentOrder?.shippingAddress?.address2 }}</p>
          <p>{{ currentOrder?.shippingAddress?.city ? currentOrder?.shippingAddress?.city + "," : "" }} {{ currentOrder.shippingAddress?.zipCode }}</p>
          <p>{{ currentOrder?.shippingAddress?.stateName ? currentOrder?.shippingAddress?.stateName + "," : "" }} {{ currentOrder.shippingAddress?.countryName }}</p>
        </ion-label>
      </ion-item>
      <ion-item color="light" lines="none">
        <ion-label class="ion-text-wrap">
          <p class="overline">{{ translate("Handling Instructions") }}</p>
          <p>{{ currentOrder?.shippingInstructions ? currentOrder?.shippingInstructions : 'Sample Handling instructions' }}</p>
        </ion-label>
      </ion-item>
      <ion-item lines="none" v-if="currentOrder.trackingCode">
        <ion-label>
                    <p>{{ currentOrder.trackingCode }}</p>
        </ion-label>        
        <ion-button fill="clear" @click="printShippingLabel(currentOrder)">
          <ion-icon :icon="openOutline" slot="end"></ion-icon>
        </ion-button>
      </ion-item>
      <ion-item lines="none" v-if="!currentOrder.trackingCode && ['PICKITEM_PICKED', 'PICKITEM_COMPLETED'].includes(currentOrder?.items[0]?.picklistItemStatusId)">
        <ion-label v-for="message, index in shipmentLabelErrorMessages" :key="index">
            {{ message }}
        </ion-label>
        <ion-label v-if="!shipmentLabelErrorMessages.length">
          <p>{{ translate('No carrier error') }}</p>
        </ion-label>
        <ion-button fill="clear" @click="retryShippingLabel(currentOrder)">
          <ion-icon :icon="refreshSharp" slot="end" ></ion-icon>
        </ion-button>
      </ion-item>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
  import { 
    IonLabel,
    IonItem,
    IonCard,
    IonCardContent
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
      IonLabel,
      IonItem,
      IonCard,
      IonCardContent
    },
    data() {
      return {
        shipmentLabelErrorMessages: []
      }
    },
    computed: {
      ...mapGetters({
        currentOrder: 'order/getCurrent'
      })
    },
    async ionViewWillEnter() {
      // Fetching shipment label errors
      const shipmentIds = this.currentOrder.shipments.map((shipment: any) => shipment.shipmentId);
      this.shipmentLabelErrorMessages = await OrderService.fetchShipmentLabelError(shipmentIds);
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