<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Edit packaging") }}</ion-title>
      <ion-buttons slot="end" @click="save(order)">
        <ion-button color="primary" fill="clear">{{ translate("Save") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-card>
      <div class="card-header">
        <div class="order-tags">
          <ion-chip @click="copyToClipboard(order.orderName, 'Copied to clipboard')" outline>
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

      <div v-for="(item, index) in order.items" :key="index" class="order-item">
        <div class="product-info">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <ShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
            </ion-thumbnail>
            <ion-label>
              <p class="overline">{{ item.productSku }}</p>
              {{ item.productName }}
              <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
            </ion-label>
          </ion-item>
        </div>

        <div class="product-metadata">
          <ion-item lines="none">
            <ion-select aria-label="Select box" interface="popover" @ionChange="updateBox($event, item, order)" :value="item.selectedBox">
              <ion-select-option v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" :value="shipmentPackage.packageName"> {{ translate("Box") }} {{ shipmentPackage.packageName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
      </div>
    </ion-card> 

    <ion-list>
      <ion-item lines="none">
        <ion-note slot="start">{{ translate('Boxes') }}</ion-note>
        <ion-button :disabled="addingBoxForOrderIds.includes(order.orderId)" @click="addShipmentBox(order)" fill="clear" slot="end">
          {{ translate("Add") }}
          <ion-icon :icon="addCircleOutline"/>
        </ion-button>
      </ion-item>

      <!-- Todo: Need to add the box type changing functionality -->
      <ion-item v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId">
        <ion-label>{{ shipmentPackage.packageName }}</ion-label>
        <ion-select interface="popover" value="3">
          <ion-select-option value="1">Type 1</ion-select-option>
          <ion-select-option value="2">Type 2</ion-select-option>
          <ion-select-option value="3">Type 3</ion-select-option>  
        </ion-select>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script>
import { 
  IonButton,
  IonButtons,
  IonCard,
  IonChip,
  IonContent,
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
import { defineComponent } from "vue";
import { addCircleOutline, closeOutline, pricetag } from "ionicons/icons";
import { mapGetters } from 'vuex';
import { copyToClipboard, formatUtcDate, getFeature } from '@/utils';
import { ShopifyImg, translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "EditPackagingModal",
  components: {
    IonButton,
    IonButtons,
    IonCard,
    IonChip,
    IonContent,
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
    ShopifyImg
  }, 
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct'
    }),
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    }
  },
  props: ['addingBoxForOrderIds', 'addShipmentBox', 'order', 'save', 'updateBox'],
  setup() {
    return {
      addCircleOutline,
      closeOutline,
      copyToClipboard,
      formatUtcDate,
      getFeature,
      pricetag,
      translate
    };
  },
});
</script>