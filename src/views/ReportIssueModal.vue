<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Report an issue") }}</ion-title>
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
            <p v-if="order.reservedDatetime">{{ $t("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
          </ion-label>
        </div>
      </div>
    </ion-card>

    <ion-card v-for="(item, index) in currentOrder.items" :key="index">
      <div class="order-item">
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
          <ion-note v-if="getProductStock(item.productId).quantityOnHandTotal">{{ getProductStock(item.productId).quantityOnHandTotal }} {{ translate('pieces in stock') }}</ion-note>
          <ion-button fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
            <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
          </ion-button>
        </div>
      </div>

      <ion-item>
        <ion-select :label="translate('Select issue')" interface="popover" @ionChange="updateRejectReason($event, item)" :value="selectedReason" >
          <ion-select-option v-for="reason in rejectReasons" :key="reason.enumId" :value="reason.enumId">{{ reason.description ? translate(reason.description) : reason.enumId }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card> 
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="saveOrder()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import { 
  IonCard,
  IonChip,  
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonThumbnail,
  IonToolbar,
  modalController } from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { closeOutline, cubeOutline, pricetag, saveOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex';
import { copyToClipboard, formatUtcDate, getFeature } from '@/utils';
import { getProductIdentificationValue, ShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';

export default defineComponent({
  name: "ReportIssueModal",
  components: { 
    IonCard,
    IonChip,  
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonThumbnail,
    IonToolbar
  },
  props: ["order"],
  data() {
    return {
      selectedReason: "",
      currentOrder: {}
    }
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      rejectReasons: 'util/getRejectReasons',
      getProductStock: 'stock/getProductStock',
    }),
  },
  mounted() {
    this.currentOrder = JSON.parse(JSON.stringify(this.order))
  },
  methods: {
    closeModal(payload = {}) {
      modalController.dismiss({ dismissed: true, ...payload });
    },
    fetchProductStock(productId: string) {
      this.store.dispatch('stock/fetchStock', { productId })
    },
    updateRejectReason(event: any, item: any) {
      const updatedReason = event.detail.value;

      const currentOrderItem = this.currentOrder.items.find((orderItem: any) => orderItem.orderItemSeqId === item.orderItemSeqId);
      currentOrderItem.rejectReason = updatedReason
      this.currentOrder.hasRejectedItem = true;
    },
    saveOrder() {
      this.closeModal({ updatedOrder: this.currentOrder });
    }
  },
  setup() {
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      closeOutline,
      copyToClipboard,
      cubeOutline,
      formatUtcDate,
      getFeature,
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
