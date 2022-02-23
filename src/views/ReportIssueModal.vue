<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Report an issue") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button fill="clear" @click="saveOrder()">{{ $t("Save") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

 <ion-content>
   <ion-card>
     <div class="card-header">
       <div class="order-tags">
         <ion-chip outline>
           <ion-icon :icon="pricetag" />
           <ion-label>{{ order[0].orderId }}</ion-label>
         </ion-chip>
       </div>

       <div class="order-primary-info">
         <ion-label>
           {{ order[0].customerName }}
           <p>{{ $t("Ordered") }} {{ $filters.formatUtcDate(order[0].orderDate, 'YYYY-MM-DDTHH:mm:ssZ', 'Do MMMM YYYY LT z') }}</p>
         </ion-label>
       </div>

       <div class="order-metadata">
         <!-- <ion-label>
           Next Day Shipping
           <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p>
         </ion-label> -->
       </div>
     </div>
    </ion-card>

    <ion-card v-for="(item, index) in order" :key="index">
      <div class="order-item">
        <div class="product-info">
          <ion-item lines="none">
            <ion-thumbnail>
              <Image :src="getProduct(item.productId).mainImageUrl" />
            </ion-thumbnail>
            <ion-label>
              <p class="overline">{{ item.productSku }}</p>
              {{ item.virtualProductName }}
              <p>{{$filters.getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{$filters.getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
            </ion-label>
          </ion-item>
        </div>

        <div class="product-metadata">
          <ion-note>{{ getProductStock(item.productId) }} {{ $t("pieces in stock") }}</ion-note>
        </div>
      </div>

      <ion-item>
        <ion-label>{{ $t("Select an issue") }}</ion-label>
        <ion-select v-model="item.reason">
          <ion-select-option v-for="reason in unfillableReason" :value="reason.id" :key="reason.id">{{ reason.label }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card> 
  </ion-content>
</template>

<script lang="ts">
import { 
  IonCard,
  IonChip,  
  IonButtons,
  IonButton,
  IonContent,
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
import { defineComponent, computed, reactive } from "vue";
import { close, pricetag } from "ionicons/icons";
import { useStore } from 'vuex'
import Image from '@/components/Image.vue'

export default defineComponent({
  name: "ReportIssueModal",
  components: {
    Image,
     IonCard,
     IonChip,  
     IonButtons,
     IonButton,
     IonContent,
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
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    saveOrder() {
      this.closeModal();
    }
  },
  props: ["order"],
  setup() {
    const store = useStore();
    const getProduct = computed(() => store.getters['product/getProduct'])
    const getProductStock = computed(() => store.getters['stock/getProductStock'])
    const unfillableReason = reactive(JSON.parse(process.env.VUE_APP_UNFILLABLE_REASONS))

    return {
      close,
      getProduct,
      getProductStock,
      pricetag,
      store,
      unfillableReason
    };
  },
});
</script>

<style scoped>
.order-tags {
  border-bottom: 1px solid black;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}  
</style>