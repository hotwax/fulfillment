<template>
  <ion-card class="order">
    <div class="order-header">
      <div class="order-primary-info">
        <ion-label>
          <strong>{{ currentShipment.customerName }}</strong>
          <p>{{ currentShipment.createdDate ? getFromattedDateTime(currentShipment.createdDate) : "-" }}</p>
        </ion-label>
      </div>

      <div class="order-tags">
        <ion-chip @click="copyToClipboard(currentShipment.shipmentId, 'Copied to clipboard')" outline>
          <ion-icon :icon="pricetagOutline" />
          <ion-label>{{ currentShipment.shipmentId }}</ion-label>
        </ion-chip>
      </div>

      <div class="order-metadata">
        <ion-label>
          {{ currentShipment.shipmentMethodTypeDesc ?? currentShipment.shipmentMethodTypeId }}
          <p>{{ currentShipment.destinationFacilityName ?? currentShipment.destinationFacilityId }}</p>
        </ion-label>
      </div>
    </div>

    <div v-for="item in currentShipment.items" :key="item.shipmentItemSeqId">
      <div class="product-info">
        <ion-item>
          <ion-thumbnail slot="start">
            <ShopifyImg :src="item.imageUrl" />
          </ion-thumbnail>
          <ion-label>
            <p class="overline">{{ item.sku }}</p>
            {{ getProduct(item.productId).parentProductName }}
            <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
          </ion-label>
          <ion-label slot="end">{{item.quantityOrdered ? item.quantityOrdered + " qty" : ""}}</ion-label>
        </ion-item>
      </div>
    </div>

    <div class="actions">
      <div class="desktop-only">
        <ion-button :disabled="currentShipment.statusId === 'SHIPMENT_SHIPPED' || currentShipment.items?.length === 0" @click="shipTransferShipment(currentShipment)">{{ translate("Ship Now") }}</ion-button>
        <ion-button :disabled="currentShipment.items?.length === 0" @click="printShippingLabel(currentShipment)" fill="outline">
          {{ translate("Print Shipping Label") }}
          <ion-spinner color="primary" slot="end" v-if="currentShipment.isGeneratingShippingLabel" name="crescent" />
        </ion-button>
      </div>
    </div>
  </ion-card>    
</template>

<script lang="ts">
import {
  IonButton,
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
  IonSpinner,
  IonThumbnail,
  IonChip
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { add, checkmarkDone, barcodeOutline, pricetagOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon';
import { copyToClipboard, showToast, getFeature } from '@/utils'
import { hasError } from '@/adapter'
import logger from '@/logger';
import { ShopifyImg, translate } from "@hotwax/dxp-components";
import { Actions, hasPermission } from '@/authorization'
import { TransferShipmentService } from '@/services/TransferShipmentService'
import { OrderService } from '@/services/OrderService'

export default defineComponent({
  name: "ShipmentDetails",
  components: {
    IonButton,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    IonSpinner,
    IonThumbnail,
    IonChip,
    ShopifyImg
  },
  props: ['query'],
  computed: {
    ...mapGetters({
      currentShipment: 'transferShipment/getCurrentShipment',
      currentFacility: 'user/getCurrentFacility',
      getProduct: 'product/getProduct',
    }),
  },
  methods: {
    async updateTransferShipmentQuery() {
      const transferShipmentsQuery = JSON.parse(JSON.stringify(this.query))
      transferShipmentsQuery.viewIndex = 0
      transferShipmentsQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('transferShipment/updateTransferShipmentQuery', { ...transferShipmentsQuery })
    },
    getFromattedDateTime (time: any) {
      return DateTime.fromMillis(time).toFormat('dd MMMM yyyy t a ZZZZ');
    },
    async shipTransferShipment(shipment: any) {
      const payload = {
        "shipmentId": shipment.shipmentId,
        "statusId": "SHIPMENT_SHIPPED",
        "shipmentTypeId": shipment.shipmentTypeId
      }
      
      try {
        const resp = await TransferShipmentService.shipTransferShipment(payload)
        if (!hasError(resp)) {
          showToast(translate('Transfer Shipment shipped successfully'))
          await Promise.all([this.updateTransferShipmentQuery()]);
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to ship transfer shipment', err)
        showToast(translate('Failed to ship transfer shipment'))
      }
    },
    async printShippingLabel(shipment: any) {
      await OrderService.printShippingLabel([shipment?.shipmentId])
    },
    async retryShippingLabel(shipment: any) {
      const resp = await OrderService.retryShippingLabel([shipment?.shipmentId])
      if (!hasError(resp)) {
        showToast(translate("Shipping Label generated successfully"))
        await this.printShippingLabel(shipment)
      } else {
        showToast(translate("Failed to generate shipping label"))
      }
    },
    async regenerateShippingLabel(shipment: any) {
      // if the request to print shipping label is not yet completed, then clicking multiple times on the button
      // should not do anything
      if (shipment.isGeneratingShippingLabel) {
        return;
      }

      shipment.isGeneratingShippingLabel = true;

      if (shipment.missingLabelImage) {
        await this.retryShippingLabel(shipment)
      } else {
        await this.printShippingLabel(shipment)
      }

      shipment.isGeneratingShippingLabel = false;
    }
  }, 
  setup() {
    const store = useStore(); 
    const router = useRouter();

    return {
      Actions,
      add,
      pricetagOutline,
      barcodeOutline,
      checkmarkDone,
      hasPermission,
      copyToClipboard,
      getFeature,
      store,
      router,
      translate
    };
  },
});
</script>
