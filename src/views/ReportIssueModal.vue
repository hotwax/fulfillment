<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Report an issue") }}</ion-title>
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
            <p v-if="order.reservedDatetime">{{ $t("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
          </ion-label>
        </div>
      </div>
    </ion-card>

    <ion-card v-for="(item, index) in order.items" :key="index" >
      <div class="order-item">
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
          <ion-note>{{ item.itemQuantity }} {{ translate("pieces in stock") }}</ion-note>
        </div>
      </div>
      
      <ion-item lines="none">
        <ion-label>{{ translate("Select issue") }}</ion-label>
        <ion-select interface="popover" @ionChange="updateRejectReason($event, item, order)" :value="item.rejectReason" >
          <ion-select-option v-for="reason in rejectReasons" :key="reason.enumId" :value="reason.enumId">{{ reason.description ? translate(reason.description) : reason.enumId }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card> 
  </ion-content>
</template>

<script>
import { 
  IonCard,
  IonChip,  
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline, pricetag } from "ionicons/icons";
import { mapGetters } from 'vuex';
import { copyToClipboard, formatUtcDate, getFeature } from '@/utils';
import { ShopifyImg, translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "ReportIssueModal",
  components: {
    IonCard,
    IonChip,  
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
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
      getProduct: 'product/getProduct',
      rejectReasons: 'util/getRejectReasons',
    }),
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  props: ['order', 'save', 'updateRejectReason'],
  setup() {
    return {
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
