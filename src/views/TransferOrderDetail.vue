<template>
    <ion-page>
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-back-button default-href="/transfer-orders" slot="start" />
          <ion-title>{{ translate("Transfer Order Details") }}</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content>
        <main>
          <ion-item lines="none">
            <ion-label>
              <p class="overline">{{ currentOrder.orderId }}</p>
              {{ currentOrder.orderName }}
              <p>{{ currentOrder.externalId }}</p>
              <p>{{ translate('Item count') }}: {{ getItemCount()}}</p>
            </ion-label>
            <ion-badge slot="end">{{ currentOrder.orderStatusDesc ? currentOrder.orderStatusDesc : getStatusDesc(currentOrder.statusId) }}</ion-badge>
          </ion-item>
  
          <div class="scanner">
            <ion-item>
              <ion-input :label="translate('Scan items')" autofocus :placeholder="translate('Scan barcodes to pick them')" v-model="queryString" @keyup.enter="updateProductCount()" />
            </ion-item>
  
            <ion-button expand="block" fill="outline" @click="scanCode()">
              <ion-icon slot="start" :icon="barcodeOutline" />{{ translate("Scan") }}
            </ion-button>
          </div>

          <ion-segment scrollable v-model="selectedSegment">
            <ion-segment-button value="open">
              <ion-label>{{ translate("Open") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="completed">
              <ion-label>{{ translate("Completed") }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <div class="segments" v-if="currentOrder">
            <template v-if="selectedSegment === 'open'">
              <template v-if="getTOItems('open')?.length > 0">
                <TransferOrderItem v-for="item in getTOItems('open')" :key="item.orderItemSeqId" :itemDetail="item" :class="item.internalName === lastScannedId ? 'scanned-item' : '' " :id="item.internalName"/>
              </template>
              <template v-else>
                <div class="empty-state">
                  <p>{{ translate('No data available') }}</p>
                </div>
              </template>
            </template>
            <template v-else>
              <template v-if="getShipments('shipped')?.length > 0">
                <ion-card class="order" v-for="(shipment, index) in getShipments('shipped')" :key="index">
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

                  <div v-for="item in shipment.items" :key="item.shipmentItemSeqId" class="order-item">
                    <div class="product-info">
                      <ion-item lines="none">
                        <ion-thumbnail slot="start">
                          <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                        </ion-thumbnail>
                        <ion-label>
                          <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                          {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                          <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
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
      </ion-content>
      <ion-footer v-if="currentOrder.statusId === 'ORDER_APPROVED'">
        <ion-toolbar>
          <ion-buttons slot="end">
            <ion-button  color="primary" fill="solid" :disabled="!hasPermission(Actions.APP_TRANSFER_ORDER_UPDATE) || !isEligibleForCreatingShipment()" @click="confirmCreateShipment">
              <ion-spinner v-if="isCreatingShipment" slot="start" name="crescent" />
              {{ translate('Create shipment') }}   
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
  } from '@ionic/vue';
  import { computed, defineComponent } from 'vue';
  import { add, checkmarkDone, barcodeOutline, pricetagOutline } from 'ionicons/icons';
  import { mapGetters, useStore } from "vuex";
  import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components';

  import { useRouter } from 'vue-router';
  import Scanner from "@/components/Scanner.vue";
  import { Actions, hasPermission } from '@/authorization'
  import { DateTime } from 'luxon';
  import { getFeature, showToast } from '@/utils';
  import { hasError } from '@/adapter';
  import { OrderService } from '@/services/OrderService'
  import TransferOrderItem from '@/components/TransferOrderItem.vue'
  import ShippingLabelErrorModal from '@/components/ShippingLabelErrorModal.vue';
  import emitter from "@/event-bus";

  
  export default defineComponent({
    name: "ShipmentDetails",
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
        lastScannedId: ''
      }
    },
    async ionViewWillEnter() {
      emitter.emit('presentLoader');
      await this.store.dispatch('transferorder/fetchTransferOrderDetail', { orderId: this.$route.params.orderId });
      await this.store.dispatch('transferorder/fetchOrderShipments', { orderId: this.$route.params.orderId });
      emitter.emit('dismissLoader');
    },
    computed: {
      ...mapGetters({
        currentOrder: 'transferorder/getCurrent',
        getStatusDesc: 'util/getStatusDesc',
        user: 'user/getCurrentFacility',
        getProduct: 'product/getProduct',
        currentFacility: 'user/getCurrentFacility',
        productIdentificationPref: 'user/getProductIdentificationPref',
        productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount',
        getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      }),
    },
    methods: {
      getItemCount() {
        return this.currentOrder?.items?.reduce((totalItems:any, item:any) => totalItems + (item.orderedQuantity || 0), 0);

      },
      getTime(time: any) {
        return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t a")
      },
      getTOItems(orderType: string) {
        if (orderType === 'completed') {
          return this.currentOrder?.items?.filter((item: any) => item.statusId === 'ITEM_COMPLETED')
        } else {
          return this.currentOrder?.items?.filter((item: any) => item.statusId !== 'ITEM_COMPLETED' && item.statusId !== 'ITEM_REJECTED')
        }
      },
      getShipments(shipmentType: string) {
        if (shipmentType === 'shipped') {
          return this.currentOrder?.shipments?.filter((shipment: any) => shipment.statusId === 'SHIPMENT_SHIPPED')
        } else {
          return this.currentOrder?.shipments?.filter((shipment: any) => shipment.statusId !== 'SHIPMENT_SHIPPED' && shipment.statusId !== 'SHIPMENT_CANCELLED')
        }
      },
      getPickedToOrderedFraction(item: any) {
        return item.pickedQuantity / item.orderedQuantity;
      },
      async createShipment() {
        this.isCreatingShipment = true;
        const shipmentId = await this.store.dispatch('transferorder/createOutboundTransferShipment', this.currentOrder)
        this.isCreatingShipment = false;
        if (shipmentId) {
          await this.store.dispatch('transferorder/clearCurrentTransferShipment');
          await OrderService.updateShipment({"shipmentId": shipmentId, "statusId": "SHIPMENT_APPROVED"})
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
        let isEligible = this.currentOrder && this.currentOrder.items?.some((item: any) => item.pickedQuantity > 0);
        if (isEligible) {
          isEligible = !this.currentOrder.items?.some((item: any) =>  item.pickedQuantity > 0 && (this.getShippedQuantity(item) + item.pickedQuantity) > item.orderedQuantity);
        }
        return isEligible;
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
          const resp = await OrderService.retryShippingLabel([currentShipment.shipmentId])
          if (!hasError(resp)) {
            showToast(translate("Shipping Label generated successfully"))
            
            //retry shipping label will generate a new label and the label pdf url may get change/set in this process, hence fetching the shipment packages again.
            await this.store.dispatch('transferorder/fetchOrderShipments', { orderId: this.currentOrder.orderId })
            currentShipment = this.currentOrder?.shipments?.find((shipment:any) => shipment.shipmentId === currentShipment.shipmentId);
            shippingLabelPdfUrls = currentShipment?.shipmentPackages
                ?.filter((shipmentPackage: any) => shipmentPackage.labelPdfUrl)
                .map((shipmentPackage: any) => shipmentPackage.labelPdfUrl);


            await OrderService.printShippingLabel([currentShipment.shipmentId], shippingLabelPdfUrls)
          } else {
            showToast(translate("Failed to generate shipping label"))
          }
        } else {
          //print shipping label if label already exists
          await OrderService.printShippingLabel([currentShipment.shipmentId], shippingLabelPdfUrls)
        }

        currentShipment.isGeneratingShippingLabel = false;
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
        hasPermission,
        pricetagOutline,
        productIdentificationPref,
        showToast,
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
  .scanned-item {
    /*
      Todo: used outline for highliting items for now, need to use border
      Done this because currently ion-item inside ion-card is not inheriting highlighted background property.
    */
    outline: 2px solid var( --ion-color-medium-tint);
  }
  </style>
  