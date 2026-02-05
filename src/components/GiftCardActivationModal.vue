<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="gift-card-activation-modal-close-button" @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Gift card activation") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="isLoading" class="empty-state">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Fetching gift card info.") }}</ion-label>
    </div>
    <ion-list v-else>
      <ion-item lines="none" v-if="!item.isGCActivated">
        <ion-input data-testid="gift-card-activation-modal-code-input" :label="translate('Activation code')" :placeholder="translate('serial number')" :helper-text="translate('Scan or enter the unique code on the gift card')" v-model="activationCode" />
      </ion-item>

      <ion-item data-testid="gift-card-activation-modal-activated-item" v-else>
        <ion-icon :icon="cardOutline" slot="start" />
        <ion-label>{{ item.gcInfo.cardNumber }}</ion-label>
        <ion-note slot="end">{{ getCreatedDateTime() }}</ion-note>
      </ion-item>

      <ion-item data-testid="gift-card-activation-modal-product-item" lines="none">
        <ion-icon :icon="giftOutline" slot="start" />
        <ion-label>
          {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
        </ion-label>
        <ion-label slot="end">{{ formatCurrency(itemPriceInfo.unitPrice, itemPriceInfo.currencyUom) }}</ion-label>
      </ion-item>

      <div class="ion-margin" v-if="!item.isGCActivated">
        <ion-button data-testid="gift-card-activation-modal-scan-button" expand="block" fill="outline" @click="isCameraEnabled ? stopScan() : scan()">
          <ion-icon slot="start" :icon="isCameraEnabled ? stopOutline : cameraOutline" />
          {{ translate(isCameraEnabled ? "Stop" : "Scan") }}
        </ion-button>
        <StreamBarcodeReader class="scanning-preview"
          v-if="isCameraEnabled"
          @decode="onDecode"
        />
      </div>
    </ion-list>
  </ion-content>

  <ion-fab v-if="!item.isGCActivated" vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="gift-card-activation-modal-save-button" @click="confirmSave()">
      <ion-icon :icon="cardOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  alertController,
  modalController
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { cameraOutline, cardOutline, closeOutline, giftOutline, saveOutline, stopOutline } from "ionicons/icons";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components'
import { OrderService } from "@/services/OrderService";
import { formatCurrency, formatUtcDate, hasError, showToast, hasWebcamAccess } from '@/utils';
import logger from "@/logger";
import { DateTime } from 'luxon';
import { StreamBarcodeReader } from "vue-barcode-reader";

export default defineComponent({
  name: "GiftCardActivationModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
    StreamBarcodeReader
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
    }),
  },
  data() {
    return {
      isLoading: false,
      itemPriceInfo: {} as any,
      activationCode: "",
      isCameraEnabled: false
    }
  },
  props: ["item"],
  async mounted() {
    this.isLoading = true;
    this.itemPriceInfo = await OrderService.fetchGiftCardItemPriceInfo({ orderId: this.item.orderId, orderItemSeqId: this.item.orderItemSeqId })
    this.isLoading = false;
  },
  methods: {
    closeModal(payload = {}) {
      modalController.dismiss({ dismissed: true, ...payload })
    },
    async confirmSave() {
      if(!this.activationCode.trim()) {
        showToast(translate("Please enter a activation code."))
        return;
      }

      const alert = await alertController.create({
        header: translate("Activate gift card"),
        message: translate("This gift card code will be activated. The customer may also receive a notification about this activation. Please verify all information is entered correctly. This cannot be edited after activation.", { space: "<br /><br />" }),
        htmlAttributes: {
          'data-testid': 'gift-card-activation-alert'
        },
        buttons: [
          {
            text: translate("Cancel"),
            htmlAttributes: {
              'data-testid': 'gift-card-activation-alert-cancel-button'
            }
          },
          {
            text: translate("Activate"),
            htmlAttributes: {
              'data-testid': 'gift-card-activation-alert-activate-button'
            },
            handler: async () => {
              await this.activateGitCard()
            }
          }
        ],
      });
      return alert.present();
    },
    async activateGitCard() {
      try {
        const resp = await OrderService.activateGiftCard({
          orderId: this.item.orderId,
          orderItemSeqId: this.item.orderItemSeqId,
          amount: this.itemPriceInfo.unitPrice,
          typeEnumId: "GC_ACTIVATE",
          cardNumber: this.activationCode.trim(),
          partyId: this.item.customerId
        })

        if(!hasError(resp)) {
          showToast(translate("Gift card activated successfully."))
          this.closeModal({ isGCActivated: true, item: this.item })
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        showToast(translate("Failed to activate gift card."))
        logger.error(error);
      }
    },
    getCreatedDateTime() {
      return DateTime.fromMillis(this.item.gcInfo.fulfillmentDate).toFormat("dd MMMM yyyy hh:mm a ZZZZ");
    },
    async scan() {
      if (!(await hasWebcamAccess())) {
        showToast(translate("Camera access not allowed, please check permissons."));
        return;
      } 

      this.isCameraEnabled = true;
    },
    stopScan() {
      this.isCameraEnabled = false
    },
    onDecode(result: any) {
      if(result) this.activationCode = result
      this.isCameraEnabled = false;
    }
  },
  setup() {
    const store = useStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      cameraOutline,
      cardOutline,
      closeOutline,
      formatCurrency,
      formatUtcDate,
      getProductIdentificationValue,
      giftOutline,
      productIdentificationPref,
      saveOutline,
      stopOutline,
      store,
      translate
    };
  },
});
</script>

<style scoped>
.scanning-preview {
  justify-self: center;
  max-width: 360px;
}


</style>