<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Edit packaging") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button fill="clear">{{ $t("Save") }}</ion-button>
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
            <p>{{ $t("Ordered") }} {{ $filters.formatUtcDate(order.orderDate, 'YYYY-MM-DDTHH:mm:ssZ', 'Do MMMM YYYY LT z') }}</p>
          </ion-label>
        </div>

        <div class="order-metadata">
          <!-- <ion-label>
            Next Day Shipping
            <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p>
          </ion-label> -->
        </div>
      </div>

      <div class="order-item">
        <div class="product-info">
          <ion-item lines="none" v-for="(item, index) in order" :key="index">
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
          <ion-item lines="none">   
            <ion-label>{{ $t("Select box") }}</ion-label>
            <ion-select>
              <ion-select-option>Box A Type 3</ion-select-option>
              <ion-select-option>Box B Type 2</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
      </div>
    </ion-card> 

    <ion-list>
      <ion-item lines="none">
        <ion-note slot="start">{{ $t('Boxes') }}</ion-note>
        <ion-button fill="clear" @click="addBox()" slot="end">
          {{ $t("Add") }}
          <ion-icon :icon="addCircleOutline"/>
        </ion-button>
      </ion-item>
      <ion-item>
        <ion-label>Box A</ion-label>
        <ion-select value="3">
          <ion-select-option value="1">Type 1</ion-select-option>
          <ion-select-option value="2">Type 2</ion-select-option>
          <ion-select-option value="3">Type 3</ion-select-option>  
        </ion-select>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang='ts'>
import {
  IonButtons,
  IonButton,
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
  modalController
} from "@ionic/vue";
import Image from '@/components/Image.vue'
import { defineComponent, computed } from "vue";
import { addCircleOutline, close, pricetag } from "ionicons/icons";
import { useStore } from 'vuex'

export default defineComponent({
  name: "EditPackagingModal",
  components: {
    Image,
    IonButtons,
    IonButton,
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
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async addBox() {
      await this.store.dispatch('order/addShipmentBox', this.order)
    }
  },
  props: ["order"],
  setup() {
    const store = useStore();
    const getProduct = computed(() => store.getters['product/getProduct'])

    return {
      addCircleOutline,
      close,
      getProduct,
      pricetag,
      store
    };
  },
});
</script>
<style scoped>
.order-tags {
  border-bottom: 1px solid black;
}

.order-metadata {
  border-bottom: 1px solid black;
}
.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}  
</style>