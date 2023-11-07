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
            <Image :src="item.imageUrl" />
          </ion-thumbnail>
          <ion-label>
            {{ item.internalName }}
            <p>{{ item.productName }}</p>
          </ion-label>
          <ion-label slot="end">{{item.quantityOrdered ? item.quantityOrdered + " qty" : ""}}</ion-label>
        </ion-item>
      </div>
    </div>

    <div class="actions">
      <div class="desktop-only">
        <ion-button :disabled="!currentShipment.items || currentShipment.items.length === 0" @click="shipTransferShipment(currentShipment)">{{ translate("Ship Now") }}</ion-button>
        <ion-button :disabled="!currentShipment.items || currentShipment.items.length === 0" @click="printShippingLabel(currentShipment)" fill="outline">{{ translate("Print Shipping Label") }}</ion-button>
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
  IonThumbnail,
  IonChip
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { add, checkmarkDone, barcodeOutline, pricetagOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import Image from "@/components/Image.vue";
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon';
import { copyToClipboard, showToast } from '@/utils'
import { hasError } from '@/adapter'
import logger from '@/logger';
import { translate } from "@hotwax/dxp-components";
import { Actions, hasPermission } from '@/authorization'
import { TransferShipmentService } from '@/services/TransferShipmentService'

export default defineComponent({
  name: "ShipmentDetails",
  components: {
    IonButton,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    IonThumbnail,
    IonChip,
    Image,
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
      await TransferShipmentService.printShippingLabel(shipment?.shipmentId)
    },
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
      store,
      router,
      translate
    };
  },
});
</script>
