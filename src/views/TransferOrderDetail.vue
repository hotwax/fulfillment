<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/transfer-orders" slot="start" />
        <ion-title>{{ translate("Transfer Order Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main v-if="currentOrder.orderId">
        <ion-item lines="none">
          <ion-label>
            <p class="overline">{{ currentOrder.orderId }}</p>
            <h1>{{ currentOrder.orderName }}</h1>
            <p>{{ currentOrder.externalId }}</p>
            <sub>{{ translate('Item count') }}: {{ getItemCount()}}</sub>
          </ion-label>
          <ion-badge slot="end">{{ currentOrder.orderStatusDesc ? currentOrder.orderStatusDesc : getStatusDesc(currentOrder.statusId) }}</ion-badge>
        </ion-item>

        <ion-segment scrollable v-model="selectedSegment" v-if="maySplit">
          <ion-segment-button value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="partial">
            <ion-label>{{ translate("Partially Fulfilled") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div class="scanner" v-if="selectedSegment !== 'completed'">
          <ion-item>
            <ion-input :label="translate('Scan items')" autofocus :placeholder="translate('Scan barcodes to pick them')" v-model="queryString" @keyup.enter="updateProductCount()" />
         </ion-item>

          <ion-button expand="block" fill="outline" @click="scanCode()">
            <ion-icon slot="start" :icon="barcodeOutline" />{{ translate("Scan") }}
          </ion-button>
        </div>

        <div class="segments" v-if="currentOrder">
          <template v-if="selectedSegment === 'open'">
            <template v-if="getTOItems('open')?.length > 0">
              <TransferOrderItem v-for="item in getTOItems('open')" :key="item.orderItemSeqId" :itemDetail="item" :class="item.internalName === lastScannedId ? 'scanned-item' : '' " :id="item.internalName" isRejectionSupported="true"/>
            </template>
            <template v-else>
              <div class="empty-state">
                <p>{{ translate('No data available') }}</p>
              </div>
            </template>
          </template>

          <template v-else-if="selectedSegment === 'partial'">
            <template v-if="getTOItems('partial')?.length > 0">
              <TransferOrderItem v-for="item in getTOItems('partial')" :key="item.orderItemSeqId" :itemDetail="item" :class="item.internalName === lastScannedId ? 'scanned-item' : '' " :id="item.internalName" isRejectionSupported="true"/>
            </template>
            <template v-else>
              <div class="empty-state">
                <p>{{ translate('No data available') }}</p>
              </div>
            </template>
          </template>

          <template v-else>
            <template v-if="currentOrder?.shipments?.length > 0">
              <ion-card class="order" v-for="(shipment, index) in currentOrder.shipments" :key="index">
                <div class="order-header">
                  <div class="order-primary-info">
                    <ion-label>
                      <p>{{ translate("Shipped") }} {{ getTime(shipment.statusDate) }}</p>
                    </ion-label>
                  </div>
                <div class="order-tags">
                  <ion-chip>
                    <ion-icon :icon="pricetagOutline" />
                    <ion-label>{{ shipment.shipmentId }}</ion-label>
                  </ion-chip>
                </div>
                <div class="order-metadata">
                  <ion-label>
                    {{ getShipmentMethodDesc(shipment.shipmentMethodTypeId) }}
                    <p v-if="shipment.trackingIdNumber">{{ translate("Tracking Code") }} {{ shipment.trackingIdNumber }}</p>
                  </ion-label>
                </div>
              </div>
                <div v-for="item in shipment.items" :key="item.shipmentItemSeqId" class="order-item order-line-item">
                  <div class="product-info">
                    <ion-item lines="none">
                      <ion-thumbnail slot="start">
                        <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                      </ion-thumbnail>
                      <ion-label>
                        <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                        {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                        <p>{{ getFeatures(getProduct(item.productId).productFeatures)}}</p>
                      </ion-label>
                    </ion-item>
                  </div>
                  <div class="product-metadata">
                    <ion-item lines="none">
                      <ion-badge color="medium" slot="end">{{ item.orderedQuantity }} {{ translate("ordered") }}</ion-badge>
                      <ion-badge color="success" class="ion-margin-start" slot="end">{{ item.quantity }} {{ translate("shipped") }}</ion-badge>
                    </ion-item>
                  </div>
                </div>
                
                <div class="actions">
                  <div class="desktop-only">
                    <ion-button fill="outline" @click.stop="regenerateShippingLabel(shipment)">
                      {{ translate("Regenerate Shipping Label") }}
                      <ion-spinner color="primary" slot="start" v-if="shipment.isGeneratingShippingLabel" name="crescent" />
                    </ion-button>
                    <ion-button v-if="!shipment.trackingIdNumber" fill="outline" @click.stop="showShippingLabelErrorModal(shipment)">{{ translate("Shipping label error") }}</ion-button>
                  </div>
                </div>
              </ion-card>
            </template>
            <template v-else>
              <div class="empty-state">
                <p>{{ translate('No data available') }}</p>
              </div>
            </template>
          </template>
        </div>
      </main>
      <div class="empty-state" v-else>
        <p>{{ translate('No data available') }}</p>
      </div>
    </ion-content>
    <ion-footer v-if="currentOrder.statusId === 'ORDER_APPROVED' && selectedSegment !== 'completed' ">
      <ion-toolbar>
        <ion-buttons slot="end">
            <ion-button v-show="areItemsEligibleForRejection" color="danger" fill="outline" :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE)" @click="rejectItems()">
              <ion-icon slot="start" :icon="trashOutline" />
              {{ translate("Reject Items") }}
            </ion-button>
            <ion-button color="primary" fill="outline" :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE)" @click="printTransferOrderPicklist()">
            <ion-icon slot="start" :icon="printOutline" />
            {{ translate('Picklist') }}   
          </ion-button>
          <ion-button  color="primary" fill="solid" :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || !isEligibleForCreatingShipment()" @click="confirmCreateShipment">
            <ion-spinner v-if="isCreatingShipment" slot="start" name="crescent" />
            {{ maySplit ? translate('Create shipment') : translate('Ship order') }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>
  
<script lang="ts">
import {
  IonBadge,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonInput,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  modalController,
  toastController
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { barcodeOutline, pricetagOutline, printOutline, trashOutline, warningOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue";
import { Actions, hasPermission } from '@/authorization'
import { DateTime } from 'luxon';
import { getFeatures, showToast, hasWebcamAccess } from '@/utils';
import { TransferOrderService } from '@/services/TransferOrderService'
import TransferOrderItem from '@/components/TransferOrderItem.vue'
import ShippingLabelErrorModal from '@/components/ShippingLabelErrorModal.vue';
import emitter from "@/event-bus";

export default defineComponent({
  name: "TransferOrderDetail",
  components: {
    IonBadge,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonChip,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonInput,
    IonLabel,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    DxpShopifyImg,
    TransferOrderItem,
  },
  data() {
    return {
      queryString: '',
      selectedSegment: 'open',
      isCreatingShipment: false,
      lastScannedId: '',
      defaultRejectReasonId: "NO_VARIANCE_LOG"  // default variance reason, to be used when any other item is selected for rejection
    }
  },
  async ionViewWillEnter() {
    emitter.emit('presentLoader');
    await this.store.dispatch("transferorder/fetchRejectReasons");
    await this.store.dispatch('transferorder/fetchTransferOrderDetail', { orderId: this.$route.params.orderId });
    emitter.emit('dismissLoader');
    if (!this.maySplit) {
      this.presentToast();
    }
  },
  computed: {
    ...mapGetters({
      currentOrder: 'transferorder/getCurrent',
      getStatusDesc: 'util/getStatusDesc',
      getProduct: 'product/getProduct',
      productIdentificationPref: 'user/getProductIdentificationPref',
      productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
    }),
    areItemsEligibleForRejection() {
      return this.currentOrder.items?.some((item: any) => item.rejectReasonId);
    },
    maySplit(){
      return !this.currentOrder.maySplit || this.currentOrder.maySplit === 'Y';
    }
  },
  methods: {
    async printTransferOrderPicklist() {
      await TransferOrderService.printTransferOrderPicklist(this.currentOrder.orderId)
    },
    getItemCount() {
      return this.currentOrder?.items?.reduce((totalItems: any, item: any) => totalItems + (item.quantity || 0), 0);
    },
    getTime(time: any) {
      return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t a")
    },
    getTOItems(orderType: string) {
      if (orderType === 'open') {
        return this.currentOrder?.items?.filter((item: any) => item.statusId === 'ITEM_PENDING_FULFILL')
      } else if (orderType === 'partial') {
        return this.currentOrder?.items?.filter((item: any) => item.totalIssuedQuantity > 0 && item.statusId === 'ITEM_PENDING_FULFILL') 
      }
    },
    async createShipment() {
      this.isCreatingShipment = true;
      const shipmentId = await this.store.dispatch('transferorder/createOutboundTransferShipment', this.currentOrder)
      this.isCreatingShipment = false;
      if (shipmentId) {
        await this.store.dispatch('transferorder/clearCurrentTransferShipment');
        this.router.push({ path: `/transfer-shipment-review/${shipmentId}` })
      }
    },
    async confirmCreateShipment() {
      const message = translate("Make sure you have entered the correct item quantities to create the shipment.");
      const alert = await alertController.create({
        header: translate("Create shipment"),
        message,
        buttons: [
          {
            text: translate("Cancel"),
          },
          {
            text: translate("Create"),
            handler: async () => {
              this.createShipment();
            }
          }
        ],
      });
      return alert.present();
    },
    isEligibleForCreatingShipment() {
      if (this.maySplit) {  // Partial shipment allowed: at least one item should be picked
        let isEligible = this.currentOrder && this.currentOrder.items?.some((item: any) => item.pickedQuantity > 0);
        if (isEligible) {
          isEligible = !this.currentOrder.items?.some((item: any) =>  item.pickedQuantity > 0 && (this.getShippedQuantity(item) + item.pickedQuantity) > item.orderedQuantity);
        }
        return isEligible;
      } else {  // No partial shipment: all items must be fully picked
        return (
          this.currentOrder &&
          this.currentOrder.items?.length > 0 &&
          this.currentOrder.items.every(
            (item: any) =>
              Number(item.pickedQuantity) === Number(item.orderedQuantity)
          )
        );
      }
    },
    getShippedQuantity(item: any) {
      return this.currentOrder?.shippedQuantityInfo?.[item.orderItemSeqId] ? this.currentOrder?.shippedQuantityInfo?.[item.orderItemSeqId] : 0;
    },
    async updateProductCount(payload: any) {
      if (this.queryString) {
        payload = this.queryString;
      }
      
      const result = await this.store.dispatch('transferorder/updateOrderProductCount', payload);
      if (result.isCompleted) {
        showToast(translate("Scanned item is already completed:", { itemName: payload }))
      }
      else if (result.isProductFound) {
        const item = result.orderItem
        const shippedQuantity = this.getShippedQuantity(item)
        if(item.pickedQuantity > item.orderedQuantity - shippedQuantity) {
          showToast(translate('The picked quantity cannot exceed the ordered quantity.') + " " + translate("already shipped.", {shippedQuantity: shippedQuantity}))
        } else {
          showToast(translate("Scanned successfully.", { itemName: payload }))
          this.lastScannedId = payload
          // Highlight specific element
          const scannedElement = document.getElementById(payload);
          scannedElement && (scannedElement.scrollIntoView());
          // Scanned product should get un-highlighted after 3s for better experience hence adding setTimeOut
          setTimeout(() => {
            this.lastScannedId = ''
          }, 3000)
        }
      } else {
        showToast(translate("Scanned item is not present within the order:", { itemName: payload }));
      }
      this.queryString = ''
    },
    
    async scanCode () {
      if (!(await hasWebcamAccess())) {
        showToast(translate("Camera access not allowed, please check permissons."));
        return;
      } 
      const modal = await modalController
        .create({
          component: Scanner,
        });
        modal.onDidDismiss()
        .then((result) => {
          this.updateProductCount(result.role);
      });
      return modal.present();
    },
    async showShippingLabelErrorModal(shipment: any){
      const shippingLabelErrorModal = await modalController.create({
        component: ShippingLabelErrorModal,
        componentProps: {
          shipmentIds: [shipment.shipmentId]
        }
      });
      return shippingLabelErrorModal.present();
    },
      async regenerateShippingLabel(currentShipment: any) {
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
        let shippingLabelPdfUrls = currentShipment.shipmentPackages
          ?.filter((shipmentPackage: any) => shipmentPackage.labelPdfUrl)
          .map((shipmentPackage: any) => shipmentPackage.labelPdfUrl);


        if (!currentShipment.trackingIdNumber) {
          //regenerate shipping label if missing tracking code
          await TransferOrderService.retryShippingLabel(currentShipment.shipmentId)
          // retry shipping label will generate a new label and the label pdf url may get change/set in this process, hence fetching the shipment packages again.
          // Refetching the order tracking detail irrespective of api response since currently in SHIPHAWK api returns error whether label is generated
          // Temporarily handling this in app but should be handled in backend        
          await this.store.dispatch('transferorder/fetchOrderShipments', { orderId: this.currentOrder.orderId })
          currentShipment = this.currentOrder?.shipments?.find((shipment:any) => shipment.shipmentId === currentShipment.shipmentId);
          shippingLabelPdfUrls = currentShipment?.shipmentPackages
              ?.filter((shipmentPackage: any) => shipmentPackage.labelPdfUrl)
              .map((shipmentPackage: any) => shipmentPackage.labelPdfUrl);


          if(currentShipment.trackingIdNumber) {
            showToast(translate("Shipping Label generated successfully"))
            await TransferOrderService.printShippingLabel([currentShipment.shipmentId], shippingLabelPdfUrls, currentShipment?.shipmentPackages);
          } else {
            showToast(translate("Failed to generate shipping label"))
          }
        } else {
          //print shipping label if label already exists
          await TransferOrderService.printShippingLabel([currentShipment.shipmentId], shippingLabelPdfUrls, currentShipment?.shipmentPackages);
        }

        currentShipment.isGeneratingShippingLabel = false;
      },
      async rejectItems() {
        const alert = await alertController.create({
          header: translate("Reject transfer order"),
          message: translate("Rejecting a transfer order will remove it from your facility. Your inventory levels will not be affected from this rejection.", { space: "<br/><br/>" }),
          buttons: [{
            text: translate("Cancel"),
            role: 'cancel',
          }, {
            text: translate("Reject"),
            handler: async() => {
              emitter.emit("presentLoader")
              const payload = {
                orderId: this.currentOrder.orderId,
                items: this.currentOrder.items.map((item: any) => ({
                  orderItemSeqId: item.orderItemSeqId,
                  rejectionReasonId: item.rejectReasonId || this.defaultRejectReasonId
                }))
              };
              try {
                await TransferOrderService.rejectOrderItems(payload);
                showToast(translate("All order items are rejected"))
                this.$router.replace("/transfer-orders")
              } catch(err) {
                console.error(err);
                showToast(translate("Failed to reject order"))
                // If there is any error in rejecting the order, fetch the updated order information
                await this.store.dispatch("transferorder/fetchTransferOrderDetail", { orderId: this.$route.params.orderId })
              }
              emitter.emit("dismissLoader")
            }
          }]
        });
        return alert.present();
      },
      async presentToast() {
        showToast(translate("This transfer order must be fulfilled in a single shipment."),  // overriding show toast to show custom styled message and cancel button.
        {
          duration: 0,
          position: 'top',
          icon: warningOutline,
          color: 'danger',
          buttons: [
            {
              text: 'Dismiss',
              role: 'cancel',
            },
          ],
        });
      }
}, 
ionViewDidLeave() {
  const routeTo = this.router.currentRoute;
  if (routeTo.value.name !== 'Transfer Orders') {
    this.store.dispatch('transferorder/clearTransferOrderFilters');
  }
},
setup() {
  const store = useStore(); 
  const router = useRouter();
  const productIdentificationStore = useProductIdentificationStore();
  let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
  return {
    Actions,
    barcodeOutline,
    getFeatures,
    getProductIdentificationValue,
    hasPermission,
    pricetagOutline,
    printOutline,
    productIdentificationPref,
    showToast,
    store,
    router,
    translate,
    trashOutline,
    warningOutline
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
.scanned-item {
  /*
    Todo: used outline for highliting items for now, need to use border
    Done this because currently ion-item inside ion-card is not inheriting highlighted background property.
  */
  outline: 2px solid var( --ion-color-medium-tint);
}
.scanner{
  margin-top: var(--spacer-lg);
}
</style>