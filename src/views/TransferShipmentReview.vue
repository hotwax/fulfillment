<template>
    <ion-page>
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-back-button :default-href="`/transfer-order-details/${currentShipment.primaryOrderId}`" slot="start" />
          <ion-title>{{ translate("Review Shipment") }}</ion-title>
          
          <ion-buttons slot="end">
            <ion-button  fill="clear" v-if="currentShipment.trackingCode" @click="transferShipmentActionsPopover($event)">
              <ion-icon :icon="documentTextOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
  
      <ion-content>
        <main>
          <div class="scanner">
            <ion-searchbar class="better-name-here"/>
            <div>
              <ion-item>
                <ion-label>{{ currentShipment.totalQuantityPicked }} {{ translate("items picked") }}</ion-label>
                <ion-button expand="block" fill="outline" v-if="!currentShipment.trackingCode" @click="generateShippingLabel(currentShipment)">
                  <ion-icon slot="start" :icon="documentTextOutline" />{{ translate("Generate shipping label") }}
                  <ion-spinner color="primary" slot="start" v-if="currentShipment.isGeneratingShippingLabel" name="crescent" />
                </ion-button>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate('Tracking Code') }} </ion-label>
                <ion-input placeholder="add tracking code" v-if="!currentShipment.trackingCode" v-model="trackingCode"></ion-input>
                <p v-else slot="end">{{ currentShipment.trackingCode }}</p>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate('Carrier') }}</ion-label>
                <ion-label slot="end">
                  <p> {{ getPartyName(currentShipment.carrierPartyId) }} {{ getShipmentMethodDesc(currentShipment.shipmentMethodTypeId) }}</p>
                </ion-label>
              </ion-item>
            </div>
          </div>

          <TransferOrderItem v-for="item in currentShipment.items" :key="item.orderItemSeqId" :item="item" />
        </main>
  
        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || (currentShipment.isTrackingRequired &&  !trackingCode)" @click="confirmShip()">
            <ion-icon :icon="sendOutline" />
          </ion-fab-button>
        </ion-fab>
      </ion-content>
    </ion-page>
  </template>
  
  <script lang="ts">
  import {
    IonBackButton,
    IonButton,
    IonContent,
    IonHeader,
    IonFab,
    IonFabButton,
    IonButtons,
    IonIcon,
    IonItem,
    IonInput,
    IonLabel,
    IonPage,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    alertController,
    modalController,
    popoverController
  } from '@ionic/vue';
  import { computed, defineComponent } from 'vue';
  import { add, checkmarkDone, barcodeOutline, documentTextOutline, sendOutline } from 'ionicons/icons';
  import { mapGetters, useStore } from "vuex";
  import { getProductIdentificationValue, ShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';

  import { useRouter } from 'vue-router';
  import Scanner from "@/components/Scanner.vue";
  import { Actions, hasPermission } from '@/authorization'
  import { getFeature, showToast } from '@/utils';
  import { hasError } from '@/adapter'
  import { OrderService } from '@/services/OrderService'
  import TransferShipmentActionsPopover from '@/components/TransferShipmentActionsPopover.vue'
  import logger from '@/logger';
  import TransferOrderItem from '@/components/TransferOrderItem.vue'

  
  export default defineComponent({
    name: "ShipmentDetails",
    components: {
      IonBackButton,
      IonButton,
      IonButtons,
      IonContent,
      IonHeader,
      IonFab,
      IonFabButton,
      IonIcon,
      IonItem,
      IonInput,
      IonLabel,
      IonPage,
      IonSearchbar,
      IonTitle,
      IonToolbar,
      TransferOrderItem
    },
    async ionViewWillEnter() {
      await this.store.dispatch('transferorder/fetchTransferShipmentDetail', { shipmentId: this.$route.params.shipmentId })
      this.trackingCode = this.currentShipment?.trackingCode;
    },
    async beforeRouteLeave(to) {
      if (to.path !== `/transfer-order-details/${this.currentShipment.primaryOrderId}`) return;
      let canLeave = false;
      const message = translate("Are you sure that you want to discard this shipment?");
      const alert = await alertController.create({
        header: translate("Discard shipment"),
        message,
        buttons: [
          {
            text: translate("Cancel"),
            handler: () => {
              canLeave = false;
            }
          },
          {
            text: translate("Discard"),
            handler: async () => {
              const resp = await OrderService.updateShipment({"shipmentId": this.currentShipment.shipmentId, "statusId": "SHIPMENT_CANCELLED"})
              if (!hasError(resp)) {
                showToast(translate('Shipment is discarded.'));
              }
              canLeave = true;
            }
          }
        ],
      });
      if (!this.isShipped) {
        alert.present();
        await alert.onDidDismiss();
        return canLeave;
      }
      
    },
    data() {
      return {
        queryString: '',
        selectedSegment: 'open',
        isShipped: false,
        trackingCode: ''
      }
    },
    computed: {
      ...mapGetters({
        currentShipment: 'transferorder/getCurrentShipment',
        getProduct: 'product/getProduct',
        productIdentificationPref: 'user/getProductIdentificationPref',
        productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount',
        getShipmentMethodDesc: 'util/getShipmentMethodDesc',
        getPartyName: 'util/getPartyName',
      }),
    },
    methods: {
      async generateShippingLabel(currentShipment: any) {
        
        // If there are no product store shipment method configured, then not generating the label and displaying an error toast
        if (this.productStoreShipmentMethCount <= 0) {
          showToast(translate('Unable to generate shipping label due to missing product store shipping method configuration'))
          return;
        }

        // if the request to print shipping label is not yet completed, then clicking multiple times on the button
        // should not do anything
        if (currentShipment.isGeneratingShippingLabel) {
          return;
        }

        currentShipment.isGeneratingShippingLabel = true;

        if (!currentShipment.trackingCode) {
          //regenerate shipping label if missing tracking code
          //TODO: Currently doing force rate shop. Need to add support on easypost integration if we don't want it
          const resp = await OrderService.retryShippingLabel([currentShipment.shipmentId], true)
          if (!hasError(resp)) {
            showToast(translate("Shipping Label generated successfully"))
            await OrderService.printShippingLabel([currentShipment.shipmentId])
            await this.store.dispatch('transferorder/fetchTransferShipmentDetail', { shipmentId: this.$route.params.shipmentId })
          } else {
            showToast(translate("Failed to generate shipping label"))
          }
        } else {
          //print shipping label if label already exists
          await OrderService.printShippingLabel([currentShipment.shipmentId])
        }

        currentShipment.isGeneratingShippingLabel = false;
      },
      async transferShipmentActionsPopover(ev: Event) {
        const popover = await popoverController.create({
          component: TransferShipmentActionsPopover,
          componentProps: {
            shipmentId: this.currentShipment.shipmentId,
          },
          showBackdrop: false,
          event: ev
        });
        return popover.present();
      },
      async confirmShip() {
        const message = translate("Make sure all items in this shipment are ready to be shipped. Once a shipment is completed, it cannot be edited.");
        const alert = await alertController.create({
          header: translate("Complete shipment"),
          message,
          buttons: [
            {
              text: translate("Cancel"),
            },
            {
              text: translate("Ship"),
              handler: async () => {
                this.shipOutboundTransferShipment();
              }
            }
          ],
        });
        return alert.present();
      },
      async shipOutboundTransferShipment() {
        try {
          const shipmentPackagesWithMissingLabel = this.currentShipment.shipmentPackagesWithMissingLabel;
          if (shipmentPackagesWithMissingLabel.length > 0 && this.trackingCode && this.currentShipment.trackingCode !== this.trackingCode) {
            await OrderService.addTrackingCode({
              "shipmentId": this.currentShipment.shipmentId,
              "shipmentRouteSegmentId": shipmentPackagesWithMissingLabel?.[0].shipmentRouteSegmentId,
              "shipmentPackageSeqId": shipmentPackagesWithMissingLabel?.[0].shipmentPackageSeqId,
              "trackingCode": this.trackingCode
            });
          }
          
          let resp = await OrderService.updateShipment({"shipmentId": this.currentShipment.shipmentId, "statusId": "SHIPMENT_PACKED"})
          if (!hasError(resp)) {
            resp = await OrderService.updateShipment({"shipmentId": this.currentShipment.shipmentId, "statusId": "SHIPMENT_SHIPPED"})
            if (hasError(resp)) {
              throw resp.data;
            }
          } else {
            throw resp.data;
          }
          this.isShipped = true;
          showToast(translate('Shipment shipped successfully.'));
          this.router.replace({ path: `/transfer-order-details/${this.currentShipment.primaryOrderId}` })
        } catch (err) {
          logger.error('Failed to ship the shipment.', err);
          showToast(translate('Something went wrong, could not ship the shipment'))
        }
      },
      getPickedToOrderedFraction(item: any) {
        return item.shippedQuantity / item.orderedQuantity;
      },
      
      updateProductCount(payload: any){
        if(this.queryString) payload = this.queryString
        this.store.dispatch('transferorder/updateOrderProductCount', payload)
      },
      async scanCode () {
        const modal = await modalController
          .create({
            component: Scanner,
          });
          modal.onDidDismiss()
          .then((result) => {
            this.updateProductCount(result.role);
        });
        return modal.present();
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
        documentTextOutline,
        sendOutline,
        getFeature,
        getProductIdentificationValue,
        hasPermission,
        productIdentificationPref,
        store,
        router,
        translate
      };
    },
  });
  </script>
  
  <style scoped>
  ion-content > main {
    max-width: 1110px;
    margin-right: auto;
    margin-left: auto;
  }
  </style>
  