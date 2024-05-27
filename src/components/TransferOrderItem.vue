<template>
  <ion-card>
    <div class="product">
      <div class="product-info">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
          </ion-thumbnail>
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
            {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
            <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
          </ion-label>
        </ion-item>
      </div>
      <div class="product-count">
        <ion-item v-if="!item.shipmentId" lines="none">
          <ion-input :label="translate('Qty')" label-placement="floating" ref="pickedQuantity" type="number" min="0" v-model="item.pickedQuantity" @ionChange="updatePickedQuantity($event, item)" @ionInput="validatePickedQuantity($event, item)" @ionBlur="markPickedQuantityTouched" :errorText="getErrorText(item)" />
        </ion-item>
        <ion-item v-else lines="none">
          <ion-label slot="end">{{ item.pickedQuantity }} {{ translate('packed') }}</ion-label>
        </ion-item>
      </div>
    </div>

    <div class="action border-top" v-if="item.orderedQuantity > 0">
      <div class="pick-all-qty" v-if="!item.shipmentId">
        <ion-button @click="pickAll(item)" slot="start" size="small" fill="outline">
          {{ translate("Pick All") }}
        </ion-button>
      </div>

      <div class="qty-progress">
        <ion-progress-bar :color="getProgressBarColor(item)" :value="getPickedToOrderedFraction(item)" />
      </div>

      <div class="to-item-history">
        <ion-chip outline @click="shippedHistory(item.productId)">
          <ion-icon :icon="checkmarkDone"/>
          <ion-label> {{ getShippedQuantity(item) }} {{ translate("shipped") }} </ion-label>
        </ion-chip>
      </div>

      <div class="qty-ordered">
        <ion-label>{{ item.orderedQuantity }} {{ translate("ordered") }}</ion-label>   
      </div>         
    </div>
  </ion-card>
</template>

<script lang="ts">
import {
  IonButton,
  IonCard,
  IonChip,
  IonIcon,
  IonItem,
  IonInput,
  IonLabel,
  IonProgressBar,
  IonThumbnail,
  modalController,
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { add, checkmarkDone, barcodeOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';

import { useRouter } from 'vue-router';
import { Actions } from '@/authorization'
import { getFeature } from '@/utils';
import ShippedHistoryModal from '@/components/ShippedHistoryModal.vue'


export default defineComponent({
  name: "TransferOrderItem",
  components: {
    IonButton,
    IonCard,
    IonChip,
    IonIcon,
    IonItem,
    IonInput,
    IonLabel,
    IonProgressBar,
    IonThumbnail,
    DxpShopifyImg,
  },
  props: ["itemDetail"],
  data() {
    return {
      pickedQuantity: this.itemDetail.pickedQuantity,
      item: this.itemDetail
    }
  },
  computed: {
    ...mapGetters({
      currentOrder: 'transferorder/getCurrent',
      getProduct: 'product/getProduct',
    }),
  },
  methods: {
    getProgressBarColor(item: any) {
      const fraction = this.getPickedToOrderedFraction(item);
      if(fraction > 1) return 'danger'
      else if(fraction == 1) return 'success'
      else if(fraction < 1) return 'warning'
    },
    getPickedToOrderedFraction(item: any) {
      return (parseInt(item.pickedQuantity) + this.getShippedQuantity(item)) / item.orderedQuantity;
    },
    getShippedQuantity(item: any) {
      return this.currentOrder?.shippedQuantityInfo?.[item.orderItemSeqId] ? this.currentOrder?.shippedQuantityInfo?.[item.orderItemSeqId] : 0;
    },
    async pickAll(item: any) {
      const selectedItem = this.currentOrder.items.find((ele: any) => ele.orderItemSeqId === item.orderItemSeqId);
      if (selectedItem) {
        this.pickedQuantity = this.getShippedQuantity(item) ? selectedItem.quantity - this.getShippedQuantity(item) : selectedItem.quantity;
        selectedItem.pickedQuantity = this.pickedQuantity
        selectedItem.progress = selectedItem.pickedQuantity / selectedItem.quantity
      }
      //Removing validation erros if any
      (this as any).$refs.pickedQuantity.$el.classList.remove('ion-valid');
      (this as any).$refs.pickedQuantity.$el.classList.remove('ion-invalid');

      await this.store.dispatch('transferorder/updateCurrentTransferOrder', this.currentOrder)
    },
    async updatePickedQuantity(event: any, item: any) {
      const selectedItem = this.currentOrder.items.find((ele: any) => ele.orderItemSeqId === item.orderItemSeqId);
      if (selectedItem) {
        selectedItem.pickedQuantity = event.detail.value ? parseInt(event.detail.value) : 0;
        selectedItem.progress = parseInt(selectedItem.pickedQuantity);
      }
      await this.store.dispatch('transferorder/updateCurrentTransferOrder', this.currentOrder)
    },
    async shippedHistory(productId?: string) {
      const modal = await modalController
        .create({
          component: ShippedHistoryModal,
          componentProps: {productId}
        })
      return modal.present();
    },
    validatePickedQuantity(event: any, item: any) {
      const value = event.target.value;
      (this as any).$refs.pickedQuantity.$el.classList.remove('ion-valid');
      (this as any).$refs.pickedQuantity.$el.classList.remove('ion-invalid');

      if (value === '') return;

      value > (item.orderedQuantity - this.getShippedQuantity(item))
        ? (this as any).$refs.pickedQuantity.$el.classList.add('ion-invalid')
        : (this as any).$refs.pickedQuantity.$el.classList.add('ion-valid');
    },
    markPickedQuantityTouched() {
      (this as any).$refs.pickedQuantity.$el.classList.add('ion-touched');
    },
    getErrorText(item: any) {
      return translate('The picked quantity cannot exceed the ordered quantity.') + " " + (this.getShippedQuantity(item) > 0 ? translate("already shipped.", {shippedQuantity: this.getShippedQuantity(item)}): '')
    }
  }, 
  setup() {
    const store = useStore(); 
    const router = useRouter();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)


    return {
      Actions,
      add,
      barcodeOutline,
      checkmarkDone,
      getFeature,
      getProductIdentificationValue,
      productIdentificationPref,
      store,
      router,
      translate
    };
  },
});
</script>

<style scoped>
ion-thumbnail {
  cursor: pointer;
}

.border-top {
  border-top: 1px solid #ccc;
}

.action {
  display: grid;
  grid: "progressbar ordered"
        "pick     history" 
        / 1fr max-content; 
  gap: var(--spacer-xs);
  padding: var(--spacer-xs);
  align-items: center;
}
.pick-all-qty {
  grid-area: pick;
}

.qty-progress {
  grid-area: progressbar;
}

.to-item-history {
  grid-area: history;
  justify-self: center;
}

.qty-ordered {
  grid-area: ordered;
  text-align: end;
  font-size: 16px;
}
@media (min-width: 720px) {
  .action {
    grid: "pick progressbar history ordered" /  max-content 1fr max-content max-content;
    padding-left: var(--spacer-sm);
  }
}
</style>
