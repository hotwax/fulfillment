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
            {{ order.customerName }}
            <p>{{ translate("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
          </ion-label>
        </div>

        <div class="order-metadata">
          <ion-label>
            {{ order.shipmentMethodTypeDesc }}
            <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
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
              <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
            </ion-label>
          </ion-item>
        </div>

        <div class="product-metadata">
          <ion-item lines="none">
            <ion-select aria-label="Select box" interface="popover" :value="item.selectedBox" @ionChange="updateBox($event, item)">
              <ion-select-option v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" :value="shipmentPackage.packageName"> {{ translate("Box") }} {{ shipmentPackage.packageName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
      </div>
    </ion-card> 

    <ion-list>
      <ion-item lines="none">
        <ion-note slot="start">{{ translate('Boxes') }}</ion-note>
        <ion-button fill="clear" slot="end" :disabled="addingBoxForOrderIds.includes(currentOrder.orderId)" @click="addBox(currentOrder)">
          {{ translate("Add") }}
          <ion-icon :icon="addCircleOutline"/>
        </ion-button>
      </ion-item>
      <ion-item v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId">
        <ion-select :label="translate('Box ') + shipmentPackage.packageName" interface="popover" :value="shipmentPackage.shipmentBoxTypeId" :placeholder="translate('Select')" :disabled="!shipmentPackage.shipmentBoxTypes.length" @ionChange="updateBoxType($event, shipmentPackage.shipmentId)">
          <ion-select-option v-for="boxType in shipmentPackage.shipmentBoxTypes" :key="boxTypeDesc(boxType)" :value="boxType">{{ boxTypeDesc(boxType) }}</ion-select-option>
        </ion-select>
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
import { copyToClipboard, formatUtcDate, getFeature } from "@/utils";
import { mapGetters } from "vuex";

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
  props: ["addingBoxForOrderIds", "addShipmentBox", "order"],
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      boxTypeDesc: 'util/getShipmentBoxDesc'
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
    getShipmentPackageType(shipmentPackage: any) {
      let packageType = '';
      if(shipmentPackage.shipmentBoxTypes.length){
        packageType = shipmentPackage.shipmentBoxTypes.find((boxType: string) => boxType === shipmentPackage.shipmentBoxTypeId) ? shipmentPackage.shipmentBoxTypes.find((boxType: string) => boxType === shipmentPackage.shipmentBoxTypeId) : shipmentPackage.shipmentBoxTypes[0];
      }
      return packageType;
    },
    updateBox(event: any, item: any) {
      const updatedBox = event.detail.value;

      const currentOrderItem = this.currentOrder.items.find((currentItem: any) => currentItem.orderItemSeqId === item.orderItemSeqId);
      currentOrderItem.selectedBox = updatedBox

      this.currentOrder.isModified = true;
    },
    updateBoxType(event: any, shipmentId: any) {
      const updatedBoxType = event.detail.value;

      const currentShipmentPackage = this.currentOrder.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.shipmentId === shipmentId)
      currentShipmentPackage.shipmentBoxTypeId = updatedBoxType;

      this.currentOrder.isModified = true
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
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      addCircleOutline,
      closeOutline,
      copyToClipboard,
      formatUtcDate,
      getFeature,
      getProductIdentificationValue,
      productIdentificationPref,
      pricetag,
      saveOutline,
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