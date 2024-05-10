<template>
  <ion-card>
    <ion-item lines="none">
      <ion-thumbnail slot="start">
        <Image :src="getProduct(item.productId)?.mainImageUrl" />
      </ion-thumbnail>
      <ion-label class="ion-text-wrap">
        <p class="overline">{{ getProduct(item.productId)?.sku }}</p>
        {{ item.parentProductName ? item.parentProductName : item.productName }}
      </ion-label>
      <div class="metadata">
        <ion-badge slot="end" :color="getColorByDesc(item.orderItemStatusDesc) || getColorByDesc('default')">{{ item.orderItemStatusDesc }}</ion-badge>
      </div>
    </ion-item>
    <div>
      <!-- Removed as we are not getting price of the item in the ORDER doc -->
      <!-- <ion-item>
        <ion-label>{{ "Price" }}</ion-label>
        <p slot="end">{{ item.price || "-" }}</p>
      </ion-item> -->
      <!-- Removed as we are not getting allocation time for the item in the ORDER doc -->
      <!-- <ion-item>
        <ion-label>{{ "Allocation" }}</ion-label>
        <ion-label slot="end">{{ "-" }}</ion-label>
      </ion-item> -->
      <ion-item>
        <ion-label>{{ translate("Facility") }}</ion-label>
        <p slot="end">{{ item.facilityName || item.facilityId || "-" }}</p>
      </ion-item>
      <ion-item>
        <ion-label>{{ translate("Method") }}</ion-label>
        <p slot="end">{{ getShipmentMethodDesc(item.shipmentMethodTypeId) || item.shipmentMethodTypeId || "-" }}</p>
      </ion-item>
      <!-- Removed as we are not getting fulfillment status (as its derived) time for the item in the ORDER doc -->
      <!-- <ion-item>
        <ion-label>{{ "Fulfillment Status" }}</ion-label>
        <p slot="end">{{ "-" }}</p>
      </ion-item> -->
      <ion-item v-if="item.orderItemStatusId !== 'ITEM_CANCELLED' && item.orderItemStatusId !== 'ITEM_COMPLETED'">
        <ion-label>{{ translate("QOH") }}</ion-label>
        <p slot="end" v-if="getProductStock(item.productId, item.facilityId).quantityOnHandTotal >= 0">
          {{ getProductStock(item.productId, item.facilityId).quantityOnHandTotal }} {{ translate('pieces in stock') }}
        </p>
        <ion-spinner slot="end" v-else-if="isFetchingStock" color="medium" name="crescent" />
        <ion-button v-else fill="clear" @click.stop="fetchProductStock(item.productId, item.facilityId)">
          <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
        </ion-button>
      </ion-item>
    </div>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  IonBadge,
  IonButton,
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
  IonSpinner,
  IonThumbnail
} from '@ionic/vue'
import { mapGetters, useStore } from "vuex";
import Image from '@/components/Image.vue'
import { translate } from "@hotwax/dxp-components";
import { getColorByDesc } from "@/utils";
import { cubeOutline } from "ionicons/icons";

export default defineComponent({
  name: "OrderItemCard",
  components: {
    Image,
    IonBadge,
    IonButton,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    IonSpinner,
    IonThumbnail
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      getProductStock: "stock/getProductStock"
    })
  },
  props: ["item"],
  data() {
    return {
      isFetchingStock: false
    }
  },
  methods: {
    async fetchProductStock(productId: string, facilityId: string) {
      this.isFetchingStock = true
      // TODO: fetch QOH only for brokered facility
      await this.store.dispatch('stock/fetchStock', { productId, facilityId })
      this.isFetchingStock = false
    },
  },
  setup() {
    const store = useStore();
    return {
      cubeOutline,
      getColorByDesc,
      store,
      translate
    }
  }
});
</script>

<style scoped>
.metadata {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  row-gap: 4px;
}
</style>
