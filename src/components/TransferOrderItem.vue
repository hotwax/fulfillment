<template>
  <ion-card :data-testid="`product-card-btn-${item.orderItemSeqId}`" :id="item.scannedId ? item.scannedId : getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))" :class="{ 'scanned-item': lastScannedId && lastScannedId === (item.scannedId || getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))) }">
    <div class="product">
      <div class="product-info">
        <ion-item lines="none">
          <ion-thumbnail slot="start" v-image-preview="getProduct(item.productId)" :key="getProduct(item.productId)?.mainImageUrl">
            <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
          </ion-thumbnail>
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
            {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productId }}
            <p>{{ getFeatures(getProduct(item.productId).productFeatures)}}</p>
          </ion-label>
        </ion-item>
      </div>
      <div class="product-count">
        <ion-item v-if="!item.shipmentId" lines="none">
          <ion-input data-testid="qty-input" :label="translate('Qty')" label-placement="floating" ref="pickedQuantity" type="number" min="0" :value="item.pickedQuantity" @ionInput="updatePickedQuantity($event, item); validatePickedQuantity($event, item); markPickedQuantityTouched()" @ionBlur="updateItemQuantity(item)" :errorText="getErrorText(item)" :disabled="isForceScanEnabled" />
        </ion-item>
        <ion-item v-else lines="none">
          <ion-label slot="end">{{ item.pickedQuantity }} {{ translate('packed') }}</ion-label>
        </ion-item>
      </div>
    </div>
    <div class="action border-top">
      <div class="pick-all-qty" v-if="!item.shipmentId">
        <ion-button v-if="item.orderedQuantity" @click="pickAll(item)" slot="start" size="small" fill="outline" :disabled="isForceScanEnabled">
          {{ translate("Pick All") }}
        </ion-button>
        <ion-button data-testid="book-qoh-btn" v-else :disabled="!item.qoh || item.qoh <= 0 || item.pickedQuantity >= item.qoh" slot="start" size="small" fill="outline" @click="bookQoh(item)">
          {{ translate("Book qoh") }}
        </ion-button>
      </div>

      <div class="qty-progress">
        <ion-progress-bar :color="getProgressBarColor(item)" :value="getPickedToOrderedFraction(item)" />
      </div>

      <div class="to-item-history" v-if="isRejectionSupported && !isAnyItemShipped">
        <ion-chip outline color="danger" v-if="item.rejectReasonId" @click="openRejectReasonPopover($event, item)">
          <ion-icon :icon="closeCircleOutline" @click.stop="removeRejectionReason(item)"/>
          <ion-label>{{ getRejectionReasonDescription(item.rejectReasonId) }}</ion-label>
          <ion-icon :icon="caretDownOutline"/>
        </ion-chip>
        <ion-chip outline color="danger" v-else-if="isAnyItemSelectedForRejection" @click="openRejectReasonPopover($event, item)">
          <ion-label>{{ getRejectionReasonDescription(defaultRejectReasonId) }}</ion-label>
          <ion-icon :icon="caretDownOutline"/>
        </ion-chip>
        <ion-chip outline v-else @click="openRejectReasonPopover($event, item)">
          <ion-label>{{ translate("Report an issue") }}</ion-label>
          <ion-icon :icon="caretDownOutline"/>
        </ion-chip>
      </div>

      <div class="to-item-history" v-else-if="!router.currentRoute.value.path.includes('/create-transfer-order/')">
        <ion-chip outline @click="item.shippedQuantity && shippedHistory(item.productId)">
          <ion-icon :icon="checkmarkDone"/>
          <ion-label> {{ item.shippedQuantity || 0 }} {{ translate("shipped") }} </ion-label>
        </ion-chip>
      </div>

      <div class="qty-ordered" v-if="item.orderedQuantity">
        <ion-label>{{ item.orderedQuantity }} {{ translate("ordered") }}</ion-label>
      </div>

      <ion-item v-if="router.currentRoute.value.path.includes('/create-transfer-order/')" class="ion-no-padding qty-qoh" lines="none">
        <ion-label>{{ item.qoh != null ? item.qoh : 0 }} {{ translate("Qoh") }}</ion-label>
        <ion-button fill="clear" size="default" color="medium" @click="removeOrderItem(item)">
          <ion-icon data-testid="remove-item-btn" slot="icon-only" color="danger" :icon="removeCircleOutline" />
        </ion-button>
      </ion-item>
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
  popoverController,
} from '@ionic/vue';
import { computed, defineComponent, onMounted } from 'vue';
import { add, caretDownOutline, checkmarkDone, closeCircleOutline, barcodeOutline, removeCircleOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { TransferOrderService } from '@/services/TransferOrderService';
import { OrderService } from '@/services/OrderService';
import { useRouter } from 'vue-router';
import { Actions } from '@/authorization'
import { getFeatures } from '@/utils';
import { hasError } from '@/adapter';
import logger from '@/logger';
import { showToast } from '@/utils';
import ShippedHistoryModal from '@/components/ShippedHistoryModal.vue'
import ReportIssuePopover from './ReportIssuePopover.vue';

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
  // As we are using the same component on detail and review page, thus defined prop isRejectionSupported
  // for handing the case to enable rejection functionality
  props: ["itemDetail", "isRejectionSupported", "lastScannedId"],
  data() {
    return {
      pickedQuantity: this.itemDetail.pickedQuantity,
      item: this.itemDetail,
      defaultRejectReasonId: "NO_VARIANCE_LOG"  // default variance reason, to be used when any other item is selected for rejection
    }
  },
  computed: {
    ...mapGetters({
      currentOrder: 'transferorder/getCurrent',
      getProduct: 'product/getProduct',
      isForceScanEnabled: 'util/isForceScanEnabled',
      rejectReasons: "transferorder/getRejectReasons",
      barcodeIdentifier: "util/getBarcodeIdentificationPref"
    }),
    isAnyItemSelectedForRejection() {
      return this.currentOrder.items.some((item: any) => item.rejectReasonId)
    },
    isAnyItemShipped() {
      return this.currentOrder.items.some((item: any) => item.shippedQuantity > 0)
    }
  },
  methods: {
    getProgressBarColor(item: any) {
      const fraction = this.getPickedToOrderedFraction(item);
      if(fraction > 1) return 'danger'
      else if(fraction == 1) return 'success'
      else return 'primary'
    },
    getPickedToOrderedFraction(item: any) {
      return item.quantity ? item.pickedQuantity / item.qoh : (parseInt(item.pickedQuantity) + this.item.shippedQuantity) / item.orderedQuantity
    },
    async pickAll(item: any) {
      const selectedItem = this.currentOrder.items.find((ele: any) => ele.orderItemSeqId === item.orderItemSeqId);
      if (selectedItem) {
        this.pickedQuantity = this.item.shippedQuantity ? selectedItem.quantity - this.item.shippedQuantity : selectedItem.quantity;
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
      const path = this.router.currentRoute.value.path;

      (this as any).$refs.pickedQuantity.$el.classList.remove('ion-valid');
      (this as any).$refs.pickedQuantity.$el.classList.remove('ion-invalid');

      // Apply zero/negative check only on /create-transfer-order
      if(path.includes('/create-transfer-order') && value <= 0) {
        (this as any).$refs.pickedQuantity.$el.classList.add('ion-invalid');
        return;
      }

      if (value === '') return;

      value > (item.orderedQuantity - this.item.shippedQuantity)
        ? (this as any).$refs.pickedQuantity.$el.classList.add('ion-invalid')
        : (this as any).$refs.pickedQuantity.$el.classList.add('ion-valid');
    },
    markPickedQuantityTouched() {
      (this as any).$refs.pickedQuantity.$el.classList.add('ion-touched');
    },
    getErrorText(item: any) {
      const path = this.router.currentRoute.value.path;
      return path.includes('/create-transfer-order')
        ? translate("Please enter valid item quantity.")
        : translate('The picked quantity cannot exceed the ordered quantity.') + " " + (this.item.shippedQuantity > 0 ? translate("already shipped.", {shippedQuantity: this.item.shippedQuantity}): '')
    },
    async openRejectReasonPopover(ev: Event, item: any) {
      const reportIssuePopover = await popoverController.create({
        component: ReportIssuePopover,
        componentProps: { rejectReasons: this.rejectReasons },
        event: ev,
        translucent: true,
        showBackdrop: false,
      });

      reportIssuePopover.present();

      const result = await reportIssuePopover.onDidDismiss();

      if(result.data) {
        item.rejectReasonId = result.data
        await this.store.dispatch('transferorder/updateCurrentTransferOrder', this.currentOrder)
      }
    },
    async removeRejectionReason(item: any) {
      delete item["rejectReasonId"];
      await this.store.dispatch('transferorder/updateCurrentTransferOrder', this.currentOrder)
    },
    getRejectionReasonDescription(rejectionReasonId: string) {
      const reason = this.rejectReasons?.find((reason: any) => reason.enumId === rejectionReasonId)
      return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    async bookQoh(item: any) {
      if(item.qoh) {
        // set pickedQuantity = qoh
        if(item.pickedQuantity !== item.qoh) {
          item.pickedQuantity = item.qoh;
          await this.updateItemQuantity(item);
        }
      }
    },
    async updateItemQuantity(item: any) {
      const currentItem = this.currentOrder.items.find((orderItem: any) => orderItem.orderItemSeqId === item.orderItemSeqId);
      // Skip if picked quantity is same as current or invalid (equal to or less than 0)
      if(currentItem && item.pickedQuantity === currentItem.quantity) return;
      if(item.pickedQuantity <= 0) return;

      try {
        const resp = await TransferOrderService.updateOrderItem({
          orderId: this.currentOrder.orderId,
          orderItemSeqId: item.orderItemSeqId,
          quantity: item.pickedQuantity,
          unitPrice: item.unitPrice || 0
        });
        if(!hasError(resp)) {
          item.quantity = item.pickedQuantity;
          await this.store.dispatch('transferorder/updateCurrentTransferOrder', this.currentOrder)
        } else {
          throw resp.data;
        }
      } catch (err) {
        logger.error(err);
        showToast(translate("Failed to update item quantity"));
      }
    },
    async removeOrderItem(item: any) {
      if(!item || !item.orderItemSeqId) return;
      try {
        const resp = await OrderService.deleteOrderItem({
          orderId: this.currentOrder.orderId,
          orderItemSeqId: item.orderItemSeqId
        });
        if(!hasError(resp)) {
          this.currentOrder.items = this.currentOrder.items?.filter((i: any) => i.orderItemSeqId !== item.orderItemSeqId);
          await this.store.dispatch('transferorder/updateCurrentTransferOrder', this.currentOrder)
          showToast(translate("Item removed from order"));
        } else {
          throw resp.data;
        }
      } catch (err) {
        logger.error(err);
        showToast(translate("Failed to remove item from order"));
      }
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
      caretDownOutline,
      checkmarkDone,
      closeCircleOutline,
      getFeatures,
      getProductIdentificationValue,
      productIdentificationPref,
      store,
      removeCircleOutline,
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
  grid: "progressbar ordered qoh"
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

.qty-qoh {
  grid-area: qoh;
  text-align: end;
  font-size: 16px;
}

.scanned-item {
  outline: 2px solid var(--ion-color-medium-tint);
}
@media (min-width: 720px) {
  .action {
    grid: "pick progressbar history ordered qoh" /  max-content 1fr max-content max-content;
    padding-left: var(--spacer-sm);
  }
}
</style>