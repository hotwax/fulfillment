<template>
  <ion-page>
    <ViewSizeSelector menu-id="view-size-selector-inprogress" content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-menu-button menu="start" slot="start" />
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!inProgressOrders.total">{{ inProgressOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ inProgressOrders.query.viewSize }} {{ translate('of') }} {{ inProgressOrders.total }} {{ translate('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button :disabled="!hasPermission(Actions.APP_RECYCLE_ORDER) || !inProgressOrders.total || isRejecting" fill="clear" color="danger" @click="recycleInProgressOrders()">
            {{ translate("Reject all") }}
          </ion-button>
          <ion-menu-button menu="view-size-selector-inprogress" :disabled="!inProgressOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="view-size-selector">
      <ion-searchbar class="searchbar" :placeholder="translate('Search orders')" v-model="inProgressOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)"/>
      <div v-if="inProgressOrders.total">
        <ion-radio-group v-model="selectedPicklistId" @ionChange="updateSelectedPicklist($event.detail.value)">
          <ion-row class="filters">
            <ion-item lines="none">
              <!-- empty value '' for 'All orders' radio -->
              <ion-radio label-placement="end" value="">
                <ion-label class="ion-text-wrap">
                  {{ translate('All') }}
                  <p>{{ translate('picklists', { count: picklists.length }) }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
            <ion-item lines="none" v-for="picklist in picklists" :key="picklist.id">
              <ion-radio label-placement="end" :value="picklist.id">
                <ion-label class="ion-text-wrap">
                  {{ picklist.pickersName }}
                  <p>{{ picklist.date }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </ion-row>
        </ion-radio-group>

        <div class="results">
          <ion-button expand="block" class="bulk-action desktop-only" fill="outline" size="large" v-if="!isForceScanEnabled" @click="packOrders()">{{ translate("Pack orders") }}</ion-button>
          <ion-card class="order" v-for="(order, index) in getInProgressOrders()" :key="index" :class="isForceScanEnabled ? 'ion-margin-top' : ''">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ order.customerName }}</strong>
                  <p>{{ translate("Ordered") }} {{ getTime(order.orderDate) }}</p>
                </ion-label>
              </div>

              <div class="order-tags">
                <ion-chip @click.stop="orderActionsPopover(order, $event)" outline>
                  <ion-icon :icon="pricetagOutline" />
                  <ion-label>{{ order.orderName }}</ion-label>
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </div>

              <div class="order-metadata">
                <ion-label>
                  {{ getShipmentMethodDesc(order.shipmentMethodTypeId) }}
                  <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ getTime(order.reservedDatetime) }}</p>
                </ion-label>
              </div>
            </div>

            <div class="box-type desktop-only" v-if="!order.shipmentPackages">
              <ion-skeleton-text animated />
              <ion-skeleton-text animated />
            </div>
            <div class="box-type desktop-only"  v-else-if="order.shipmentPackages">
              <ion-button :disabled="addingBoxForShipmentIds.includes(order.shipmentId)" @click.stop="addShipmentBox(order)" fill="outline" shape="round" size="small"><ion-icon :icon="addOutline" />{{ translate("Add Box") }}</ion-button>
              <ion-row>
                <ion-chip v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" @click.stop="updateShipmentBoxType(shipmentPackage, order, $event)">
                  {{ `Box ${shipmentPackage?.packageName}` }} {{ `| ${boxTypeDesc(getShipmentPackageType(order, shipmentPackage))}`}}
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </ion-row>
            </div>

            <div v-for="item in order.items" :key="item.shipmentItemSeqId" class="order-line-item">
              <div class="order-item">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                      <div>
                        {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
                        <ion-badge color="dark" class="kit-badge" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                      </div>
                      <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
                    </ion-label>
                    
                  </ion-item>
                </div>

                <div class="desktop-only" v-if="!order.shipmentPackages">
                  <ion-item lines="none">
                    <ion-skeleton-text animated />
                  </ion-item>
                </div>

                <div class="desktop-only ion-text-center" v-else>
                  <!-- Check to not call the segment change method autocatically as initially the data is not available and thus ionChange event is called when data is populated -->
                  <div>
                    <template v-if="item.rejectReason">
                      <ion-chip outline color="danger" @click.stop="removeRejectionReason($event, item, order)">
                        <ion-label> {{ getRejectionReasonDescription(item.rejectReason) }}</ion-label>
                        <ion-icon :icon="closeCircleOutline" />
                      </ion-chip>
                    </template>
                    <template v-else-if="isEntierOrderRejectionEnabled(order)">
                      <ion-chip outline color="danger">
                        <ion-label> {{ getRejectionReasonDescription(rejectEntireOrderReasonId) ? getRejectionReasonDescription(rejectEntireOrderReasonId) : translate('Reject to avoid order split (no variance)')}}</ion-label>
                      </ion-chip>
                    </template>
                    <template v-else>
                      <ion-chip :disabled="!order.shipmentPackages || order.shipmentPackages.length === 0" outline @click="openShipmentBoxPopover($event, item, item.orderItemSeqId, order)">
                        {{ `Box ${item.selectedBox}` }}
                        <ion-icon :icon="caretDownOutline" />
                      </ion-chip>
                    </template>
                  </div>
                </div>

                <!--Adding checks to avoid any operations if order has missing info, mostly when after packing Solr is not updaing immediately-->
                <div class="product-metadata">
                  <ion-button v-if="isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item)">
                    <ion-icon v-if="item.showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline"/>
                    <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline"/>
                  </ion-button>
                  <ion-button color="medium" fill="clear" size="small" v-if="item.productTypeId === 'GIFT_CARD'" @click="openGiftCardActivationModal(item)">
                    <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline"/>
                  </ion-button>
                  <ion-button color="danger" fill="clear" size="small" @click.stop="openRejectReasonPopover($event, item, order)">
                    <ion-icon slot="icon-only" :icon="trashBinOutline"/>
                  </ion-button>
                  <ion-note v-if="getProductStock(item.productId).qoh">{{ getProductStock(item.productId).qoh }} {{ translate('pieces in stock') }}</ion-note>
                  <ion-button color="medium" fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                    <ion-icon slot="icon-only" :icon="cubeOutline"/>
                  </ion-button>
                </div>
              </div>

              <div v-if="item.showKitComponents && !getProduct(item.productId)?.productComponents" class="kit-components">
                <ion-item lines="none">
                  <ion-skeleton-text animated style="height: 80%;"/>
                </ion-item>
                <ion-item lines="none">
                  <ion-skeleton-text animated style="height: 80%;"/>
                </ion-item>
              </div>
              <div v-else-if="item.showKitComponents && getProduct(item.productId)?.productComponents" class="kit-components">
                <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" size="small"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                      {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                      <p>{{ getFeature(getProduct(productComponent.productIdTo).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(productComponent.productIdTo).featureHierarchy, '1/SIZE/')}}</p>
                    </ion-label>
                    <ion-checkbox v-if="item.rejectReason || isEntierOrderRejectionEnabled(order)" :checked="item.rejectedComponents?.includes(productComponent.productIdTo)" @ionChange="rejectKitComponent(order, item, productComponent.productIdTo)" />
                  </ion-item>
                </ion-card>
              </div>
            </div>

            <div class="mobile-only">
              <ion-item>
                <ion-button fill="clear" @click.stop="order.missingLabelImage ? generateTrackingCodeForPacking(order) : isForceScanEnabled ? scanOrder(order) : packOrder(order)">{{ translate("Pack using default packaging") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click.stop="packagingPopover">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <div class="actions">
              <div>
                <ion-button  @click.stop="order.missingLabelImage ? generateTrackingCodeForPacking(order) : isForceScanEnabled ? scanOrder(order) : packOrder(order)">{{ translate("Pack") }}</ion-button>
              </div>

              <div class="desktop-only">
                <ion-button v-if="order.missingLabelImage" fill="outline" @click.stop="showShippingLabelErrorModal(order)">{{ translate("Shipping label error") }}</ion-button>
              </div>
            </div>
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreInProgressOrders($event)" threshold="100px"  v-show="isInProgressOrderScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </div>
      </div>
      <template v-if="inProgressOrders.total">
        <ion-fab v-if="!isForceScanEnabled" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="packOrders()">
            <ion-icon :icon="checkmarkDoneOutline" />
          </ion-fab-button>
        </ion-fab>
      </template>
      <div class="empty-state" v-else>
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>
    <!-- only show footer buttons if 'All orders' is not selected -->
    <ion-footer v-if="selectedPicklistId">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" color="primary" @click="openQRCodeModal(selectedPicklistId)">
            <ion-icon slot="start" :icon="qrCodeOutline" />
            {{ translate("Generate QR code") }}
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button fill="outline" color="primary" @click="editPickers(getPicklist(selectedPicklistId))">
            <ion-icon slot="start" :icon="pencilOutline" />
            {{ translate("Edit Pickers") }}
          </ion-button>
          <ion-button fill="solid" color="primary" @click="printPicklist(getPicklist(selectedPicklistId))">
            <ion-spinner v-if="getPicklist(selectedPicklistId).isGeneratingPicklist" slot="start" name="crescent" />
            <ion-icon v-else slot="start" :icon="printOutline" />
            {{ translate("Print Picklist") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCheckbox,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonHeader,
  IonItem,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonMenuButton,
  IonNote,
  IonPage,
  IonRow,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSkeletonText,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  popoverController,
  modalController,
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import {
  addOutline,
  caretDownOutline,
  chevronUpOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  cubeOutline,
  ellipsisVerticalOutline,
  fileTrayOutline,
  gift,
  giftOutline,
  listOutline,
  pencilOutline,
  optionsOutline,
  pricetagOutline,
  printOutline,
  qrCodeOutline,
  trashBinOutline
} from 'ionicons/icons'
import PackagingPopover from "@/views/PackagingPopover.vue";
import { mapGetters, useStore } from 'vuex';
import { copyToClipboard, getFeature, jsonToCsv, showToast } from '@/utils';
import { isKit } from '@/utils/order'
import { hasError } from '@/adapter';
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import ViewSizeSelector from '@/components/ViewSizeSelector.vue';
import emitter from '@/event-bus';
import { UtilService } from '@/services/UtilService';
import { DateTime } from 'luxon';
import logger from '@/logger';
import { Actions, hasPermission } from '@/authorization'
import EditPickersModal from '@/components/EditPickersModal.vue';
import ShipmentBoxTypePopover from '@/components/ShipmentBoxTypePopover.vue'
import OrderActionsPopover from '@/components/OrderActionsPopover.vue'
import ShippingLabelErrorModal from '@/components/ShippingLabelErrorModal.vue'
import ReportIssuePopover from '@/components/ReportIssuePopover.vue'
import ShipmentBoxPopover from '@/components/ShipmentBoxPopover.vue'
import QRCodeModal from '@/components/QRCodeModal.vue'
import { useAuthStore } from '@hotwax/dxp-components'
import ScanOrderItemModal from "@/components/ScanOrderItemModal.vue";
import GenerateTrackingCodeModal from '@/components/GenerateTrackingCodeModal.vue';
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { MaargOrderService } from '@/services/MaargOrderService';


export default defineComponent({
  name: 'InProgress',
  components: {
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCheckbox,
    IonChip,
    IonContent,
    IonFab,
    IonFabButton,
    IonFooter,
    IonHeader,
    IonItem,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonRow,
    IonRadio,
    IonRadioGroup,
    IonSearchbar,
    IonSkeletonText,
    IonSpinner,
    IonThumbnail,   
    IonTitle,
    IonToolbar,
    DxpShopifyImg,
    ViewSizeSelector
  },
  computed: {
    ...mapGetters({
      inProgressOrders: 'maargorder/getInProgressOrders',
      getProduct: 'product/getProduct',
      rejectReasonOptions: 'util/getRejectReasonOptions',
      userPreference: 'user/getUserPreference',
      boxTypeDesc: 'util/getShipmentBoxDesc',
      getProductStock: 'stock/getProductStock',
      isForceScanEnabled: 'util/isForceScanEnabled',
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      collateralRejectionConfig: 'user/getCollateralRejectionConfig',
      affectQohConfig: 'user/getAffectQohConfig',
      carrierShipmentBoxTypes: 'util/getCarrierShipmentBoxTypes',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
    }),
  },
  data() {
    return {
      picklists: [] as any,
      defaultShipmentBoxType: {} as any,
      orderBoxes: [] as any,
      searchedQuery: '',
      addingBoxForShipmentIds: [] as any,
      selectedPicklistId: '',
      isScrollingEnabled: false,
      isRejecting: false,
      rejectEntireOrderReasonId: "REJ_AVOID_ORD_SPLIT",
    }
  },
  async ionViewWillEnter() {
    this.isScrollingEnabled = false;
    await Promise.all([this.store.dispatch('util/fetchCarrierShipmentBoxTypes'), this.store.dispatch('carrier/fetchFacilityCarriers'), this.store.dispatch('carrier/fetchProductStoreShipmentMeths')]);
  },
  methods: {
    getTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    getRejectionReasonDescription (rejectionReasonId: string) {
      const reason = this.rejectReasonOptions?.find((reason: any) => reason.enumId === rejectionReasonId)
      return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    async openRejectReasonPopover(ev: Event, item: any, order: any) {
      const reportIssuePopover = await popoverController.create({
        component: ReportIssuePopover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });

      reportIssuePopover.present();

      const result = await reportIssuePopover.onDidDismiss();

      if (result.data) {
        this.updateRejectReason(result.data, item, order)
      }
    },
    async fetchKitComponents(orderItem: any) {
      this.store.dispatch('product/fetchProductComponents', { productId: orderItem.productId })
      
      //update the order in order to toggle kit components section
      const updatedOrder = this.inProgressOrders.list.find((order: any) => order.orderId === orderItem.orderId && order.picklistBinId === orderItem.picklistBinId);
      const updatedItem = updatedOrder.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId)
      updatedItem.showKitComponents = orderItem.showKitComponents ? false : true
      this.store.dispatch('maargorder/updateInProgressOrder', updatedOrder)
    },
    async removeRejectionReason(ev: Event, item: any, order: any) {
      delete item["rejectReason"];
      delete item["rejectedComponents"];
      item.rejectReason = "";
        order.items.map((orderItem: any) => {
          if(orderItem.orderItemSeqId === item.orderItemSeqId) {
            delete orderItem["rejectReason"];
            delete orderItem["rejectedComponents"];
          }
        })
        order.hasRejectedItem = order.items.some((item:any) => item.rejectReason);
      this.store.dispatch('maargorder/updateInProgressOrder', order)
    },

    async openShipmentBoxPopover(ev: Event, item: any, orderItemSeqId: number, order: any) {
      const popover = await popoverController.create({
        component: ShipmentBoxPopover,
        componentProps: { 
          shipmentPackages: order.shipmentPackages
        },
        showBackdrop: false,
        event: ev
      });

      popover.present();

      const result = await popover.onDidDismiss();

      if (result.data && item.selectedBox !== result.data) {
        this.updateBox(result.data, item, order)
      }
    },
    getErrorMessage() {
      return this.searchedQuery === '' ? translate("doesn't have any orders in progress right now.", { facilityName: this.currentFacility?.facilityName }) : translate( "No results found for . Try searching Open or Completed tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: this.searchedQuery, lineBreak: '<br />' })
    },
    getInProgressOrders() {
      return JSON.parse(JSON.stringify(this.inProgressOrders.list)).splice(0, (this.inProgressOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
    },
    async packagingPopover(ev: Event) {
      const popover = await popoverController.create({
        component: PackagingPopover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
    async packOrder(order: any) {
      if (order.hasRejectedItem) {
        const itemsToReject = order.items.filter((item: any) => item.rejectReason)
        this.reportIssue(order, itemsToReject);
        return;
      }
      this.confirmPackOrder(order);
    },
    async confirmPackOrder(order: any, updateParameter?: string) {
      const confirmPackOrder = await alertController
        .create({
          header: translate("Pack order"),
          message: translate("You are packing an order. Select additional documents that you would like to print.", {space: '<br /><br />'}),
          inputs: [{
            name: 'printShippingLabel',
            type: 'checkbox',
            label: translate('Shipping labels'),
            value: 'printShippingLabel',
            checked: this.userPreference.printShippingLabel,
          }, {
            name: 'printPackingSlip',
            type: 'checkbox',
            label: translate('Packing slip'),
            value: 'printPackingSlip',
            checked: this.userPreference.printPackingSlip
          }],
          buttons: [{
            text: translate("Cancel"),
            role: 'cancel'
          }, {
            text: translate("Pack"),
            role: 'confirm',
            handler: async (data) => {

              emitter.emit('presentLoader');
              let toast: any;
              const shipmentIds = [order.shipmentId]
              try {
                const updatedOrderDetail = await this.getUpdatedOrderDetail(order, updateParameter) as any
                const params = {
                  shipmentId: order.shipmentId,
                  orderId: order.orderId,
                  facilityId: order.originFacilityId,
                  rejectedOrderItems: updatedOrderDetail.rejectedOrderItems,
                  shipmentPackageContents: updatedOrderDetail.shipmentPackageContents
                }
                const resp = await MaargOrderService.packOrder(params);
                if (hasError(resp)) {
                  throw resp.data
                }
                emitter.emit('dismissLoader');

                if (data.length) {
                  // additional parameters for dismiss button and manual dismiss ability
                  toast = await showToast(translate('Order packed successfully. Document generation in process'), { canDismiss: true, manualDismiss: true })
                  toast.present()

                  const shippingLabelPdfUrls: string[] = Array.from(
                    new Set(
                      (order.shipmentPackageRouteSegDetails ?? [])
                        .filter((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
                        .map((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl)
                    )
                  );

                  if (data.includes('printPackingSlip') && data.includes('printShippingLabel')) {
                    if (shippingLabelPdfUrls && shippingLabelPdfUrls.length > 0) {
                      await MaargOrderService.printPackingSlip(shipmentIds)
                      await MaargOrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
                    } else {
                    await MaargOrderService.printShippingLabelAndPackingSlip(shipmentIds)
                    }
                  } else if (data.includes('printPackingSlip')) {
                    await MaargOrderService.printPackingSlip(shipmentIds)
                  } else if (data.includes('printShippingLabel')) {
                    await MaargOrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
                  }

                  const internationalInvoiceUrls: string[] = Array.from(
                    new Set(
                      order.shipmentPackageRouteSegDetails
                        ?.filter((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.internationalInvoiceUrl)
                        .map((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.internationalInvoiceUrl) || []
                    )
                  );

                  if (internationalInvoiceUrls.length > 0) {
                    await MaargOrderService.printCustomDocuments(internationalInvoiceUrls);
                  }

                  toast.dismiss()
                } else {
                  showToast(translate('Order packed successfully'));
                }
                // TODO: handle the case of fetching in progress orders after packing an order
                // when packing an order the API runs too fast and the solr index does not update resulting in having the current packed order in the inProgress section
                await Promise.all([this.fetchPickersInformation(), this.updateOrderQuery()]);
              } catch (err) {
                // in case of error, if loader and toast are not dismissed above
                if (toast) toast.dismiss()
                showToast(translate('Failed to pack order'))
                logger.error('Failed to pack order', err)
              } finally {
                emitter.emit("dismissLoader");
              }
            }
          }]
        });
      return confirmPackOrder.present();
    },
    async packOrders() {
      const alert = await alertController
        .create({
          header: translate("Pack orders"),
          message: translate("You are packing orders. Select additional documents that you would like to print.", {count: this.inProgressOrders.list.length, space: '<br /><br />'}),
          inputs: [{
            name: 'printShippingLabel',
            type: 'checkbox',
            label: translate('Shipping labels'),
            value: 'printShippingLabel',
            checked: this.userPreference.printShippingLabel,
          }, {
            name: 'printPackingSlip',
            type: 'checkbox',
            label: translate('Packing slip'),
            value: 'printPackingSlip',
            checked: this.userPreference.printPackingSlip
          }],
          buttons: [{
            text: translate("Cancel"),
            role: 'cancel'
          }, {
            text: translate("Pack"),
            role: 'confirm',
            handler: async (data) => {
              emitter.emit('presentLoader');
              let orderList = JSON.parse(JSON.stringify(this.inProgressOrders.list))

              let toast: any;
              // Considering only unique shipment IDs
              // TODO check reason for redundant shipment IDs
              const shipments = [] as any
              for (const order of orderList) {
                const updatedOrderDetail = await this.getUpdatedOrderDetail(order) as any
                shipments.push({
                  shipmentId: order.shipmentId,
                  orderId: order.orderId,
                  facilityId: order.orgiginFacilityId,
                  rejectedOrderItems: updatedOrderDetail.rejectedOrderItems,
                  shipmentPackageContents: updatedOrderDetail.shipmentPackageContents,
                })
              }
              const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId)

              const internationalInvoiceUrls: string[] = Array.from(
                new Set(
                  orderList
                    .flatMap((order: any) => order.shipmentPackageRouteSegDetails ?? []) // Flatten all shipments
                    .filter((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.internationalInvoiceUrl) // Filter shipments with invoice URL
                    .map((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.internationalInvoiceUrl) // Extract URLs
                )
              );

              const shippingLabelPdfUrls: string[] = Array.from(
                new Set(
                  orderList
                    .flatMap((order: any) => order.shipmentPackageRouteSegDetails ?? []) // Flatten all shipments
                    .filter((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl) // Filter shipments with label image URL
                    .map((shipmentPackageRouteSeg: any) => shipmentPackageRouteSeg.labelImageUrl) // Extract URLs
                )
              );

              try {
                const resp = await MaargOrderService.packOrders({
                  shipments
                });
                if (hasError(resp)) {
                  throw resp.data
                }
                emitter.emit('dismissLoader');

                // TODO: need to check that do we need to pass all the shipmentIds for an order or just need to pass
                // the associated ids, currently passing the associated shipmentId
                if (data.length) {
                  // additional parameters for dismiss button and manual dismiss ability
                  toast = await showToast(translate('Order packed successfully. Document generation in process'), { canDismiss: true, manualDismiss: true })
                  toast.present()
                  if (data.includes('printPackingSlip') && data.includes('printShippingLabel')) {
                    if (shippingLabelPdfUrls && shippingLabelPdfUrls.length > 0) {
                      await MaargOrderService.printPackingSlip(shipmentIds)
                      await MaargOrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
                    } else {
                      await MaargOrderService.printShippingLabelAndPackingSlip(shipmentIds)
                    }
                  } else if (data.includes('printPackingSlip')) {
                    await MaargOrderService.printPackingSlip(shipmentIds)
                  } else if (data.includes('printShippingLabel')) {
                    await MaargOrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls)
                  }
                  //print custom documents like international invoice 
                  await MaargOrderService.printCustomDocuments(internationalInvoiceUrls);

                  toast.dismiss()
                } else {
                  showToast(translate('Order packed successfully'));
                }
                  // TODO: handle the case of fetching in progress orders after packing multiple orders
                  // when packing multiple orders the API runs too fast and the solr index does not update resulting in having the packed orders in the inProgress section
                await Promise.all([this.fetchPickersInformation(), this.updateOrderQuery()])
              } catch (err) {
                // in case of error, if loader and toast are not dismissed above
                if (toast) toast.dismiss()
                emitter.emit('dismissLoader');
                showToast(translate('Failed to pack orders'))
                logger.error('Failed to pack orders', err)
              }
            }
          }]
        });
      return alert.present();
    },
    
    async reportIssue(order: any, itemsToReject: any) {
      // finding is there any item that is `out of stock` as we need to display the message accordingly
      const outOfStockItem = itemsToReject.find((item: any) => item.rejectReason === 'NOT_IN_STOCK')

      // TODO: update alert message when itemsToReject contains a single item and also in some specific conditions
      let message;
      if (!outOfStockItem) {

        // This variable is used in messages to display name of first rejected item from the itemsToReject array
        const rejectedItem = itemsToReject[0];
        if (itemsToReject.length === 1) {
          const rejectionReason = this.getRejectionReasonDescription(rejectedItem.rejectReason)
          message = translate('is identified as. This order item will be unassigned from the store and sent to be rebrokered.', { productName: rejectedItem.productName, rejectReason: rejectionReason?.toLowerCase() });
        } else {
          message = translate(', and other products were identified as unfulfillable. These items will be unassigned from this store and sent to be rebrokered.', { productName: rejectedItem.productName, products: itemsToReject.length - 1, space: '<br /><br />' });
        }
      } else {
        const productName = outOfStockItem.productName
        const itemsToRejectNotInStock = itemsToReject.filter((item: any) => item.rejectReason === 'NOT_IN_STOCK');
        
        // TODO: ordersCount is not correct as current we are identifying orders count by only checking items visible on UI and not other orders        
        const ordersCount = this.inProgressOrders.list.map((inProgressOrder: any) => inProgressOrder.items.filter((item: any) => itemsToRejectNotInStock.some((outOfStockItem: any) => outOfStockItem.productSku === item.productSku) && item.shipmentId !== order.shipmentId))?.filter((item: any) => item.length).length;

        if (itemsToReject.length === 1 && ordersCount) {
          message = translate("is identified as unfulfillable. other containing this product will be unassigned from this store and sent to be rebrokered.", { productName, space: '<br /><br />', orders: ordersCount, orderText: ordersCount > 1 ? 'orders' : 'order' })
        } else if (itemsToReject.length === 1 && !ordersCount) {
          message = translate("is identified as unfulfillable. This order item will be unassigned from this store and sent to be rebrokered.", { productName, space: '<br /><br />' })
        } else if (itemsToReject.length > 1 && ordersCount) {
          message = translate(", and other products are identified as unfulfillable. other containing these products will be unassigned from this store and sent to be rebrokered.", { productName, products: itemsToReject.length - 1, space: '<br /><br />', orders: ordersCount, orderText: ordersCount > 1 ? 'orders' : 'order' })
        } else {
          message = translate(", and other products are identified as unfulfillable. These order items will be unassigned from this store and sent to be rebrokered.", { productName, products: itemsToReject.length - 1, space: '<br /><br />' })
        }
      }
      const alert = await alertController
        .create({
          header: translate("Report an issue"),
          message,
          buttons: [{
            text: translate("Cancel"),
            role: 'cancel'
          }, {
            text: translate("Report"),
            role: 'confirm',
            handler: async() => {
              await this.confirmPackOrder(order, "report");
            }
          }]
        });
      
      return alert.present();
    },
    async findInProgressOrders () {
      await this.store.dispatch('maargorder/findInProgressOrders')
    },
    getUpdatedOrderDetail(order: any, updateParameter?: string) {
      const items = JSON.parse(JSON.stringify(order.items));
      
      // creating updated data for items
      const rejectedOrderItems = [] as any;
      const shipmentPackageContents = [] as any;
      items.map((item: any, index: number) => {
        const shipmentPackage = order.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.packageName === item.selectedBox)
        if (updateParameter === 'report' && item.rejectReason) {
          rejectedOrderItems.push({
            "orderId": item.orderId,
            "orderItemSeqId": item.orderItemSeqId,
            "shipmentId": item.shipmentId,
            "shipmentItemSeqId": item.shipmentItemSeqId,
            "facilityId": this.currentFacility?.facilityId,
            "rejectToFacilityId": "_NA_",
            "updateQOH": this.affectQohConfig && this.affectQohConfig?.settingValue ? this.affectQohConfig?.settingValue : false,
            "maySplit": this.isEntierOrderRejectionEnabled(order) ? "N" : "Y",
            "cascadeRejectByProduct": this.collateralRejectionConfig?.settingValue === 'true' ? "Y" : "N",
            "rejectionReasonId": item.rejectReason,
            "rejectedComponents": item.rejectedComponents,
          })
        } else if (item.selectedBox !== item.currentBox) {
          shipmentPackageContents.push({
            shipmentId: item.shipmentId,
            shipmentItemSeqId: item.shipmentItemSeqId,
            shipmentPackageSeqId: shipmentPackage.shipmentPackageSeqId,
            quantity: item.quantity
          })
        }
      })
      return { rejectedOrderItems, shipmentPackageContents }
    },
    updateRejectReason(updatedReason: string, item: any, order: any) {
      item.rejectReason = updatedReason;
      order.items.map((orderItem: any) => {
        if(orderItem.orderItemSeqId === item.orderItemSeqId) {
          orderItem.rejectReason = updatedReason;
        }
      })
      order.hasRejectedItem = true
      this.store.dispatch('maargorder/updateInProgressOrder', order)
    },
    rejectKitComponent(order: any, item: any, componentProductId: string) {
      let rejectedComponents = item.rejectedComponents ? item.rejectedComponents : []
      if (rejectedComponents.includes(componentProductId)) {
        rejectedComponents = rejectedComponents.filter((rejectedComponent: any) => rejectedComponent !== componentProductId)
      } else {
        rejectedComponents.push(componentProductId);
      }
      item.rejectedComponents = rejectedComponents;
      order.items.map((orderItem: any) => {
        if (orderItem.orderItemSeqId === item.orderItemSeqId) {
          orderItem.rejectedComponents = rejectedComponents;
        }
      })
      this.store.dispatch('maargorder/updateInProgressOrder', order)
    },
    isEntierOrderRejectionEnabled(order: any) {
      return (!this.partialOrderRejectionConfig || !this.partialOrderRejectionConfig.settingValue || !JSON.parse(this.partialOrderRejectionConfig.settingValue)) && order.hasRejectedItem
    },
    
    updateBox(updatedBox: string, item: any, order: any) {
      item.selectedBox = updatedBox;
      order.items.map((orderItem: any) => {
        if(orderItem.orderItemSeqId === item.orderItemSeqId) {
          orderItem.selectedBox = updatedBox;
        }
      })
      order.isModified = true;
      this.store.dispatch('maargorder/updateInProgressOrder', order)
    },
    async fetchPickersInformation() {
      const payload = {
          shipmentMethodTypeId: 'STOREPICKUP',
          shipmentMethodTypeId_not: 'Y',
          shipmentMethodTypeId_op: 'equals',
          facilityId: this.currentFacility?.facilityId,
          statusId: 'PICKLIST_ASSIGNED',
          pageIndex: 0,
          pageSize: 50
      }
      try {
        const resp = await MaargOrderService.fetchPicklists(payload);
        if(!hasError(resp)) {

          this.picklists = resp.data.map((picklist: any) => {
            picklist.roles = picklist.roles.filter((role: any) => !role.thruDate)

            let pickersName = (picklist?.roles ?? [])
              .map((role:any) => {
                if (role?.person) {
                  return `${role.person.firstName} ${role.person.lastName}`;
                } else if (role?.partyGroup) {
                  return role.partyGroup.groupName;
                }
                return null;
              })
              .filter(Boolean)
              .join(", ") ?? ""; 

            let pickerIds = (picklist?.roles ?? []).map((role:any) => role?.partyId) ?? [];

            return {
              ...picklist,
              id: picklist.picklistId,
              pickersName,
              pickerIds,
              date: picklist.picklistDate ? DateTime.fromMillis(picklist?.picklistDate).toLocaleString(DateTime.TIME_SIMPLE) : null,
            };
          });
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch picklists', err)
      }
    },
    getPicklist(id: string) {
      return this.picklists.find((picklist: any) => picklist.id === id)
    },
    enableScrolling() {
      const parentElement = (this as any).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this as any).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
    async loadMoreInProgressOrders(event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if (!(this.isScrollingEnabled && this.isInProgressOrderScrollable())) {
        await event.target.complete();
      }
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))
      inProgressOrdersQuery.viewIndex++;
      await this.store.dispatch('maargorder/updateInProgressIndex', { ...inProgressOrdersQuery })
      event.target.complete();
    },
    isInProgressOrderScrollable() {
      return ((this.inProgressOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) <  this.inProgressOrders.query.viewSize;
    },
    async updateSelectedPicklist(id: string) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))

      // making view size default when changing the shipment method to correctly fetch orders
      inProgressOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      inProgressOrdersQuery.selectedPicklist = id
      inProgressOrdersQuery.viewIndex = 0

      this.store.dispatch('maargorder/updateInProgressQuery', { ...inProgressOrdersQuery })
    },
    async fetchDefaultShipmentBox() {
      let defaultBoxTypeId = 'YOURPACKNG'
      let defaultBoxType = {}

      try {
        let resp = await UtilService.fetchDefaultShipmentBox({
          systemResourceId: "shipment",
          systemPropertyId: "shipment.default.boxtype",
          fieldsToSelect: ["systemPropertyValue", "systemResourceId"],
          pageSize: 1
        })

        if(!hasError(resp)) {
          defaultBoxTypeId = resp.data?.[0].systemPropertyValue
        } else {
          throw resp.data
        }
        
        const payload = {
          "shipmentBoxTypeId": defaultBoxTypeId,
          "pageSize": 1
        }
        resp = await UtilService.fetchShipmentBoxType(payload);
        if (!hasError(resp)) {
          defaultBoxType = resp.data[0];
        }
      } catch (err) {
        logger.error('Failed to fetch default shipment box type information', err)
      }

      return defaultBoxType;
    },
    async addShipmentBox(order: any) {
      this.addingBoxForShipmentIds.push(order.shipmentId)

      const { carrierPartyId, shipmentMethodTypeId } = order
      
      if(!Object.keys(this.defaultShipmentBoxType).length) {
        this.defaultShipmentBoxType = await this.fetchDefaultShipmentBox() as any;
      }

      let packageName = "A";
      const packageNames = order?.shipmentPackages.
          filter((shipmentPackage:any) => shipmentPackage.packageName).
          map((shipmentPackage:any) => shipmentPackage.packageName);
      if (packageNames && packageNames.length) {
          packageNames.sort((a:any, b:any) => b.localeCompare(a));
          packageName = String.fromCharCode(packageNames[0].charCodeAt(0) + 1);
      }

      const params = {
        shipmentId: order.shipmentId,
        shipmentBoxTypeId: this.defaultShipmentBoxType?.shipmentBoxTypeId,
        boxLength	: this.defaultShipmentBoxType?.boxLength,
        boxHeight	: this.defaultShipmentBoxType?.boxHeight,
        boxWidth	: this.defaultShipmentBoxType?.boxWidth,
        weightUomId :	this.defaultShipmentBoxType?.weightUomId,
        packageName
      } as any

      carrierPartyId && (params['carrierPartyId'] = carrierPartyId)
      shipmentMethodTypeId && (params['shipmentMethodTypeId'] = shipmentMethodTypeId)

      try {
        const resp = await MaargOrderService.addShipmentBox(params)

        if(!hasError(resp)) {
          showToast(translate('Box added successfully'))
          // TODO: only update the order in which the box is added instead of fetching all the inProgress orders
          await Promise.all([this.fetchPickersInformation(), this.findInProgressOrders()])
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Failed to add box'))
        logger.error('Failed to add box', err)
      }
      this.addingBoxForShipmentIds.splice(this.addingBoxForShipmentIds.indexOf(order.shipmentId), 1)
    },
    getShipmentPackageType(order: any, shipmentPackage: any) {
      let packageType = shipmentPackage.shipmentBoxTypeId;
      if (!packageType) {
        const shipmentBoxTypes = this.getShipmentBoxTypes(order.carrierPartyId);
        packageType = shipmentBoxTypes[0];
      }
      return packageType;
    },
    getShipmentBoxTypes(carrierPartyId: string) {
      return this.carrierShipmentBoxTypes[carrierPartyId] ? this.carrierShipmentBoxTypes[carrierPartyId] : [];
    },
    async updateQueryString(queryString: string) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))

      inProgressOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      inProgressOrdersQuery.queryString = queryString
      await this.store.dispatch('maargorder/updateInProgressQuery', { ...inProgressOrdersQuery })
      this.searchedQuery = queryString;
    },
    async updateOrderQuery(size?: any, queryString?: any) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))

      size && (inProgressOrdersQuery.viewSize = size)
      queryString && (inProgressOrdersQuery.queryString = '')
      inProgressOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      await this.store.dispatch('maargorder/updateInProgressQuery', { ...inProgressOrdersQuery })
    },
    async initialiseOrderQuery() {
      await this.updateOrderQuery(process.env.VUE_APP_VIEW_SIZE, '')
    },
    async printPicklist(picklist: any) {
      picklist.isGeneratingPicklist = true;
      await MaargOrderService.printPicklist(picklist.id)
      picklist.isGeneratingPicklist = false;
    },
    async updateShipmentBoxType(shipmentPackage: any, order: any, ev: CustomEvent) {

      // Don't open popover when not having shipmentBoxTypes available
      const shipmentBoxTypes = this.getShipmentBoxTypes(order.carrierPartyId)
      if (!shipmentBoxTypes.length) {
        logger.error('Failed to fetch shipment box types')
        return;
      }

      const popover = await popoverController.create({
        component: ShipmentBoxTypePopover,
        event: ev,
        showBackdrop: false,
        componentProps: { shipmentBoxTypes }
      });

      popover.present();

      const result = await popover.onDidDismiss();

      if(result.data && shipmentPackage.shipmentBoxTypeId !== result.data) {
        shipmentPackage.shipmentBoxTypeId = result.data;
        order.isModified = true;
        this.store.dispatch('maargorder/updateInProgressOrder', order);
      }
    },
    async recycleInProgressOrders() {
      const alert = await alertController.create({
        header: translate('Reject all in progress orders'),
        message: translate('Reject in progress orders.', { ordersCount: this.inProgressOrders.total }),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        }, {
          text: translate('Reject'),
          handler: async () => {
            this.isRejecting = true;
            emitter.emit("presentLoader")  
            await alert.dismiss()  

            let resp;

            try {
              resp = await MaargOrderService.recycleInProgressOrders({
                "facilityId": this.currentFacility?.facilityId,
                "productStoreId": this.currentEComStore.productStoreId,
                "reasonId": "INACTIVE_STORE"
              })

              if(!hasError(resp)) {
                showToast(translate('Rejecting has been started. All in progress orders will be rejected shortly.'))
              } else {
                throw resp.data
              }
            } catch(err) {
              showToast(translate('Failed to reject in progress orders'))
              logger.error('Failed to reject in progress orders', err)
            }
            emitter.emit("dismissLoader")
          }
        }]
      });

      await alert.present();
    },
    async editPickers(selectedPicklist: any) {
      const editPickersModal = await modalController.create({
        component: EditPickersModal,
        componentProps: {
          selectedPicklist
        }
      });

      editPickersModal.onDidDismiss().then((result) => {
        // manually updating the picklist data as UI is not updated because same data
        // is returned from solr on fetchPickersInformation API call
        if (result.data?.editedPicklist && Object.keys(result.data?.editedPicklist).length) {
          const editedPicklist = result.data.editedPicklist
          this.picklists = JSON.parse(JSON.stringify(this.picklists.map((picklist: any) => picklist.id === editedPicklist.id ? picklist = editedPicklist : picklist)))
        }
      })

      return editPickersModal.present();
    },
    fetchProductStock(productId: string) {
      this.store.dispatch('stock/fetchStock', { productId })
    },
    async orderActionsPopover(order: any, ev: Event) {
      const popover = await popoverController.create({
        component: OrderActionsPopover,
        componentProps: {
          order,
          category: 'in-progress'
        },
        showBackdrop: false,
        event: ev
      });
      return popover.present();
    },
    async showShippingLabelErrorModal(order: any) {
      // Getting all the shipment ids
      const shippingLabelErrorModal = await modalController.create({
        component: ShippingLabelErrorModal,
        componentProps: {
          shipmentId : order.shipmentId
        }
      });
      return shippingLabelErrorModal.present();
    },
    async openQRCodeModal(picklistId: string) {
      const link = `${process.env.VUE_APP_PICKING_LOGIN_URL}?oms=${this.authStore.oms}&token=${this.authStore.token.value}&expirationTime=${this.authStore.token.expiration}&picklistId=${picklistId}`
      const qrCodeModal = await modalController.create({
        component: QRCodeModal,
        componentProps: { picklistId, link }
      });
      return qrCodeModal.present();
    },
    async scanOrder(order: any) {
      const modal = await modalController.create({
        component: ScanOrderItemModal,
        componentProps: { order }
      })

      modal.onDidDismiss().then((result: any) => {
        if(result.data?.packOrder) {
          this.packOrder(order);
        }
      })

      modal.present();
    },
    async generateTrackingCodeForPacking(order: any) {
      const modal = await modalController.create({
        component: GenerateTrackingCodeModal,
        componentProps: { order }
      })

      modal.onDidDismiss().then((result: any) => {
        if(result.data?.moveToNext) {
          const inProgressOrders = this.getInProgressOrders()
          const updatedOrder = inProgressOrders.find((currentOrder: any) => currentOrder.shipmentId === order.shipmentId);
          if(this.isForceScanEnabled) this.scanOrder(updatedOrder);
          else this.packOrder(updatedOrder);
        }
      })

      modal.present();
    },
 
    async openGiftCardActivationModal(item: any) {
      const modal = await modalController.create({
        component: GiftCardActivationModal,
        componentProps: { item }
      })

      modal.onDidDismiss().then((result: any) => {
        if(result.data?.isGCActivated) {
          this.store.dispatch("order/updateCurrentItemGCActivationDetails", { item, category: "in-progress", isDetailsPage: false })
        }
      })

      modal.present();
    }
  },
  async mounted () {
    this.store.dispatch('util/fetchRejectReasonOptions')
    await Promise.all([this.fetchPickersInformation(), this.initialiseOrderQuery()])
    emitter.on('updateOrderQuery', this.updateOrderQuery)
  },
  unmounted() {
    this.store.dispatch('maargorder/clearInProgressOrders')
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  setup() {
    const authStore = useAuthStore()
    const store = useStore();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentEComStore: any = computed(() => userStore.getCurrentEComStore)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      Actions,
      addOutline,
      authStore,
      caretDownOutline,
      chevronUpOutline,
      copyToClipboard,
      checkmarkDoneOutline,
      closeCircleOutline,
      cubeOutline,
      currentEComStore,
      currentFacility,
      ellipsisVerticalOutline,
      fileTrayOutline,
      getFeature,
      getProductIdentificationValue,
      gift,
      giftOutline,
      hasPermission,
      isKit,
      listOutline,
      optionsOutline,
      pencilOutline,
      pricetagOutline,
      printOutline,
      productIdentificationPref,
      qrCodeOutline,
      trashBinOutline,
      store,
      translate
    }
  }
});
</script>

<style scoped>
.box-type {
  display: flex;
  gap: var(--spacer-sm);
  border-bottom: var(--border-medium);
  padding: var(--ion-item-like-padding);
  align-items: center;
}

.box-type > ion-skeleton-text {
  width: 10%;
  height: 30px;
}

ion-segment > ion-segment-button > ion-skeleton-text, ion-item > ion-skeleton-text {
  width: 100%;
  height: 30px;
}

.order-item {
  grid-template-columns: repeat(3, 1fr);
}
</style>

