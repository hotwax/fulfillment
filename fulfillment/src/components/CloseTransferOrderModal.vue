<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Close transfer order items") }}</ion-title>
      <ion-buttons slot="end" @click="selectAllItems">
        <ion-button color="primary">{{ translate("Select all") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("To close this transfer order, select all items.") }}</ion-list-header>
      <ion-item button v-for="(item, index) in order.items.filter((item: any) => item.statusId === 'ITEM_PENDING_FULFILL')" :key="index" @click="item.isChecked = !item.isChecked">
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
          <p>
            <ion-text> {{ translate('Fulfilled qty') }}: {{ Number(item.totalIssuedQuantity) }} </ion-text> | <ion-text color="danger"> {{ translate('Cancel qty') }}: {{ Number(item.orderedQuantity) - Number(item.totalIssuedQuantity) }} </ion-text>
          </p>
        </ion-label>
        <ion-checkbox aria-label="itemStatus" slot="end" :modelValue="item.isChecked" />
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || !isEligibleToCloseTOItems()" @click="confirmSave">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
  IonThumbnail,
  alertController,
  modalController
} from '@ionic/vue';
import { Actions, hasPermission } from '@/authorization'
import { arrowBackOutline, saveOutline } from 'ionicons/icons';
import { defineComponent, computed } from 'vue';
import { mapGetters, useStore } from 'vuex'
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';
import { TransferOrderService } from '@/services/TransferOrderService';
import { getFeatures, showToast } from '@/utils';

export default defineComponent({
  name: "CloseTransferOrderModal",
  components: {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonTitle,
    IonThumbnail,
    IonToolbar,
    DxpShopifyImg
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      order: 'transferorder/getCurrent'
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async confirmSave() {
      const alert = await alertController.create({
        header: translate('Close transfer order items'),
        message: translate("The selected items won't be available for receiving later."),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        },
        {
          text: translate('Proceed'),
          role: 'proceed',
          handler: async () => {
            const success = await this.closeOrderItems();
            if (success) {
              modalController.dismiss();
              this.router.push('/transfer-orders');
            }
          }
        }]
      });
      return alert.present();
    },
    async closeOrderItems() {
      // Get only checked and pending items
      const eligibleItems = this.order.items.filter((item: any) => item.isChecked);
      if (!eligibleItems.length) return false;

      // Prepare payload for API, always sending quantityAccepted (default 0)&& this.isTOItemStatusPending(item)
      const payload = {
        orderId: this.order.orderId,
        items: eligibleItems.map((item: any) => ({
          orderItemSeqId: item.orderItemSeqId,
        }))
      };
      try {
        await TransferOrderService.closeOrderItems(payload);
        return true;
      } catch (error) {
        showToast(translate("Failed to update the status of transfer order items."));
        return false;
      }
    },
    isEligibleToCloseTOItems() {
      return this.order.items.some((item: any) => item.isChecked)
    },
    selectAllItems() {
      this.order.items.map((item:any) => {
          item.isChecked = true;
    })
    }
  },
  setup() {
    const router = useRouter()
    const store = useStore()
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      arrowBackOutline,
      Actions,
      getFeatures,
      hasPermission,
      router,
      saveOutline,
      store,
      translate,
      getProductIdentificationValue,
      productIdentificationPref
    };
  }
});
</script>