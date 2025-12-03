<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Edit packaging") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-card>
      <div class="card-header">
        <div class="order-tags">
          <ion-chip outline @click="copyToClipboard(order.orderName, 'Copied to clipboard')">
            <ion-icon :icon="pricetag" />
            <ion-label>{{ order.orderName }}</ion-label>
          </ion-chip>
        </div>

        <div class="order-primary-info">
          <ion-label>
            <strong>{{ order.customerName }}</strong>
            <p>{{ translate("Ordered") }} {{ getTime(order.orderDate) }}</p>
          </ion-label>
        </div>

        <div class="order-metadata">
          <ion-label>
            {{ getShipmentMethodDesc(order.shipmentMethodTypeId) }}
            <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ getTime(order.reservedDatetime) }}</p>
          </ion-label>
        </div>
      </div>

      <div class="order-item" v-for="(item, index) in order.items" :key="index">
        <div class="product-info">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
            </ion-thumbnail>
            <ion-label>
              <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
              {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
              <p>{{ getFeatures(getProduct(item.productId).productFeatures)}} {{ getFeatures(getProduct(item.productId).productFeatures)}}</p>
            </ion-label>
          </ion-item>
        </div>

        <div class="product-metadata">
          <ion-item lines="none">
            <ion-select aria-label="Select box" interface="popover" :value="item.selectedBox" @ionChange="updateBox($event, item, order)">
              <ion-select-option v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" :value="shipmentPackage.packageName"> {{ translate("Box") }} {{ shipmentPackage.packageName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
      </div>
    </ion-card> 

    <ion-list>
      <ion-item lines="none">
        <ion-note slot="start">{{ translate('Boxes') }}</ion-note>
        <ion-button :disabled="order.items.length <= order.shipmentPackages.length" fill="clear" slot="end" @click="addBox(currentOrder)">
          {{ translate("Add") }}
          <ion-icon :icon="addCircleOutline"/>
        </ion-button>
      </ion-item>
      <ion-item v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId">
        <template v-if="!getShipmentBoxTypes(order.carrierPartyId).length">
          <ion-label>{{ translate('Box ') + shipmentPackage.packageName }}</ion-label>
          <ion-label slot="end">{{  boxTypeDesc(shipmentPackage.shipmentBoxTypeId) }}</ion-label>
        </template>
        <template v-else>
          <ion-select :label="translate('Box ') + shipmentPackage.packageName" interface="popover" :value="shipmentPackage.shipmentBoxTypeId" :placeholder="translate('Select')" @ionChange="updateShipmentBoxType(shipmentPackage, order, $event)">
            <ion-select-option v-for="boxType in getShipmentBoxTypes(order.carrierPartyId)" :key="boxTypeDesc(boxType.shipmentBoxTypeId)" :value="boxType.shipmentBoxTypeId">{{ boxTypeDesc(boxType.shipmentBoxTypeId) }}</ion-select-option>
          </ion-select>
        </template>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="saveOrder()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { addCircleOutline, closeOutline, pricetag, saveOutline } from "ionicons/icons";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { copyToClipboard, formatUtcDate, getFeatures } from "@/utils";
import { mapGetters, useStore } from "vuex";
import { DateTime } from 'luxon';

export default defineComponent({
  name: "EditPackagingModal",
  components: { 
    IonButtons,
    IonButton,
    IonCard,
    IonChip,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  },
  props: ["addShipmentBox", "order"],
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      boxTypeDesc: 'util/getShipmentBoxDesc',
      carrierShipmentBoxTypes: 'util/getCarrierShipmentBoxTypes',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc'
    }),
  },
  data() {
    return {
      currentOrder: {} as any
    }
  },
  mounted() {
    this.currentOrder = JSON.parse(JSON.stringify(this.order));
  },
  methods: {
    closeModal(payload = {}) {
      modalController.dismiss({ dismissed: true, ...payload });
    },
    getTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    getShipmentBoxTypes(carrierPartyId: string) {
      return this.carrierShipmentBoxTypes[carrierPartyId] ? this.carrierShipmentBoxTypes[carrierPartyId] : [];
    },
    updateBox(event: any, item: any, order: any) {
      const updatedBox = event.detail.value;
      if (item.selectedBox !== updatedBox) item.selectedBox = updatedBox;
      order.items.map((orderItem: any) => {
        if(orderItem.orderItemSeqId === item.orderItemSeqId) {
          orderItem.selectedBox = updatedBox;
        }
      })
      this.store.dispatch('order/updateInProgressOrder', order)
    },
    updateShipmentBoxType(shipmentPackage: any, order: any, ev: CustomEvent) {
      const updatedBoxType = ev.detail.value;
      if (shipmentPackage.shipmentBoxTypeId !== updatedBoxType) {
        shipmentPackage.shipmentBoxTypeId = updatedBoxType;
      }
      this.store.dispatch('order/updateInProgressOrder', order);
    },
    addBox(currentOrder: any) {
      this.addShipmentBox(currentOrder);
      modalController.dismiss();
    },
    saveOrder() {
      this.closeModal({ updatedOrder: this.currentOrder })
    }
  },
  setup() {
    const productIdentificationStore = useProductIdentificationStore();
    const store = useStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      addCircleOutline,
      closeOutline,
      copyToClipboard,
      formatUtcDate,
      getFeatures,
      getProductIdentificationValue,
      productIdentificationPref,
      pricetag,
      saveOutline,
      store,
      translate
    };
  },
});
</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}
</style>