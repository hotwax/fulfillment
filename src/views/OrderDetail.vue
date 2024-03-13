<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="`/${category}`" />
        <ion-title>{{ translate("Order details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="Object.keys(order).length">
        <div class="order-header">
          <div class="order-primary-info">
            <h3>{{ order.orderName }}</h3>
          </div>
          <div class="order-tags">
            <ion-chip outline @click="copyToClipboard(order.orderId, 'Copied to clipboard')">
              <ion-icon :icon="pricetagOutline" />
              <ion-label>{{ order.orderId }}</ion-label>
            </ion-chip>
            <ion-chip v-if="category !== 'open'" outline @click="printPicklist(order)">
              <ion-icon :icon="documentTextOutline" />
              <ion-label>{{ translate('Linked picklist') }}: {{ order.picklistBinId }}</ion-label>
            </ion-chip>
            <ion-chip outline v-if="order?.orderPaymentPreferences?.length > 0" :color="statusColor[order?.orderPaymentPreferences[0]?.statusId]">
              <ion-icon :icon="cashOutline" />
              <ion-label>{{ translate(getPaymentMethodDesc(order?.orderPaymentPreferences[0]?.paymentMethodTypeId)) }} : {{ translate(getStatusDesc(order?.orderPaymentPreferences[0]?.statusId)) }}</ion-label>
            </ion-chip>
          </div>
          <div class="order-metadata">
            <ion-badge>{{ category === 'open' ? translate('Open') : (category === 'in-progress' ? translate('In Progress') : translate('Completed')) }}</ion-badge>
          </div>
        </div>

        <ion-card>
          <div class="order-header">
            <div class="order-primary-info">
              <ion-label>
                <strong>{{ order.customerName }}</strong>
                <p>{{ translate("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
              </ion-label>
            </div>
            <div class="order-tags">
              <ion-chip outline>
                <ion-icon :icon="ribbonOutline" />
                <ion-label>{{ order.shipGroupSeqId }}</ion-label>
              </ion-chip>
            </div>

            <div class="order-metadata">
              <ion-label>
                {{ order.shipmentMethodTypeDesc }}
                <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
              </ion-label>
            </div>
          </div>

          <div v-if="category === 'in-progress'">
            <div class="box-type desktop-only" v-if="!order.shipmentPackages && !order.hasMissingInfo">
              <ion-skeleton-text animated />
              <ion-skeleton-text animated />
            </div>
            <div class="box-type desktop-only" v-else-if="order.shipmentPackages">
              <ion-button :disabled="addingBoxForOrderIds.includes(order.orderId)" @click.stop="addShipmentBox(order)" fill="outline" shape="round" size="small"><ion-icon :icon="addOutline" />
                {{ translate("Add Box") }}
              </ion-button>
              <ion-row>
                <ion-chip v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" @click.stop="updateShipmentBoxType(shipmentPackage, order, $event)">
                  {{ `Box ${shipmentPackage?.packageName}` }} {{ shipmentPackage.shipmentBoxTypes.length ? `| ${boxTypeDesc(getShipmentPackageType(shipmentPackage))}` : '' }}
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </ion-row>
            </div>  
          </div>

          <div v-for="item in order.orderItems" :key="item" class="order-item">
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

            <div v-if="category === 'in-progress'" class="desktop-only" >
              <ion-chip outline @click="openShipmentBoxPopover($event, item, order)">
                <ion-icon :icon="fileTrayOutline" />
                {{ `Box ${item.selectedBox}` }} 
                <ion-icon :icon="caretDownOutline" />
              </ion-chip>
            </div>

            <!-- TODO: add a spinner if the api takes too long to fetch the stock -->
            <div class="product-metadata">
              <ion-note v-if="getProductStock(item.productId).quantityOnHandTotal">{{ getProductStock(item.productId).quantityOnHandTotal }} {{ translate('pieces in stock') }}</ion-note>
              <ion-button color="medium" fill="clear" v-else size="small" @click="fetchProductStock(item.productId)">
                {{ translate('Check stock') }}
                <ion-icon slot="end" :icon="cubeOutline"/>
              </ion-button>
              <!-- TODO make functional -->
              <ion-button v-if="category === 'in-progress'" @click="openRejectReasonPopover($event, item, order)" class="desktop-only" color="danger" fill="clear" size="small">
                {{ translate('Report an issue') }}
                <ion-icon slot="end" :icon="trashBinOutline"/>
              </ion-button>
            </div>
          </div>

          <div v-if="order.kitProducts">
            <div v-for="(kitProducts, orderItemSeqId) in order.kitProducts" :key="orderItemSeqId">
              <ion-item-divider class="order-item" color="light">
                <div class="product-info">
                  <ion-label>
                    <p>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(kitProducts[0]?.parentProductId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(kitProducts[0]?.parentProductId)) : getProduct(kitProducts[0]?.parentProductId).productName }}</p>
                    <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(kitProducts[0]?.parentProductId)) }}</p>
                  </ion-label>
                </div>

                <div v-if="category === 'in-progress' && order.shipmentPackages && order.shipmentPackages.length">
                  <ion-chip outline @click="openShipmentBoxPopover($event, null, order, kitProducts, orderItemSeqId)">
                    <ion-icon :icon="fileTrayOutline" />
                    {{ `Box ${kitProducts[0]?.selectedBox}` }} 
                    <ion-icon :icon="caretDownOutline" />
                  </ion-chip>
                </div>
                    
                <div class="product-metadata" v-if="category === 'in-progress' && order.shipmentPackages && order.shipmentPackages.length">
                  <ion-button @click="openRejectReasonPopover($event, null, order, kitProducts)" color="danger" fill="outline">
                    {{ translate('Report an issue') }}
                  </ion-button>
                </div>
              </ion-item-divider>

              <div v-for="item in kitProducts" :key="item.orderItemSeqId" class="order-item">
                <ion-item lines="none" class="product-info">
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                    <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
                  </ion-label>
                </ion-item>

                <div class="product-metadata">
                  <ion-note v-if="getProductStock(item.productId).quantityOnHandTotal">
                    {{ getProductStock(item.productId).quantityOnHandTotal }} {{ translate('pieces in stock') }}
                  </ion-note>
                  <ion-button color="medium" fill="clear" v-else size="small" @click="fetchProductStock(item.productId)">
                    {{ translate('Check stock') }}
                    <ion-icon slot="end" :icon="cubeOutline"/>
                  </ion-button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="category === 'in-progress'" class="mobile-only">
            <ion-item>
              <ion-button fill="clear" :disabled="order.hasMissingInfo" @click="packOrder(order)">{{ translate("Pack using default packaging") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click="packagingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <div v-else-if="category === 'completed'" class="mobile-only">
            <ion-item>
              <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" fill="clear" >{{ translate("Ship Now") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click.stop="shippingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <div class="actions">
            <!-- positive -->
            <div>  
              <ion-button v-if="category === 'in-progress'" :disabled="order.hasMissingInfo" @click="packOrder(order)">
                <ion-icon slot="start" :icon="personAddOutline" />
                {{ translate("Pack order") }}
              </ion-button>
              <ion-button v-else-if="category === 'open'" @click="assignPickers">
                <ion-icon slot="start" :icon="archiveOutline" />
                {{ translate("Pick order") }}
              </ion-button>
              <div v-else-if="category === 'completed'" class="desktop-only">
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true">
                  <ion-icon slot="start" :icon="bagCheckOutline" />
                  {{ translate("Shipped") }}
                </ion-button>
                <ion-button v-else :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click.stop="shipOrder(order)">
                  <ion-icon slot="start" :icon="bagCheckOutline" />
                  {{ translate("Ship order") }}
                </ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="regenerateShippingLabel(order)">
                  {{ translate("Regenerate Shipping Label") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingShippingLabel" name="crescent" />
                </ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="printPackingSlip(order)">
                  {{ translate("Print Customer Letter") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingPackingSlip" name="crescent" />
                </ion-button>
              </div>
            </div>
            <!-- negative -->
            <div class="desktop-only" v-if="category === 'completed'">
              <ion-button :disabled="!hasPermission(Actions.APP_UNPACK_ORDER) || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" fill="outline" color="danger" @click.stop="unpackOrder(order)">{{ translate("Unpack") }}</ion-button>
            </div>
          </div>
        </ion-card>

        <ShippingDetails />
        
        <h4 v-if="order.shipGroups?.length">{{ translate('Other shipments in this order') }}</h4>
        <div class="shipgroup-details">
          <ion-card v-for="shipGroup in order.shipGroups" :key="shipGroup.shipmentId">
            <ion-card-header>
              <div>
                <ion-card-subtitle class="overline">{{ getfacilityTypeDesc(shipGroup.facilityTypeId) }}</ion-card-subtitle>
                <ion-card-title>{{ shipGroup.facilityName }}</ion-card-title>
                {{ shipGroup.shipGroupSeqId }}
              </div>
              <ion-badge :color="shipGroup.category ? 'primary' : 'medium'">{{ shipGroup.category ? shipGroup.category : translate('Pending allocation') }}</ion-badge>
            </ion-card-header>
    
            <ion-item v-if="shipGroup.carrierPartyId">
              {{ getPartyName(shipGroup.carrierPartyId) }}
              <ion-label slot="end">{{ shipGroup.trackingCode }}</ion-label>
              <ion-icon slot="end" :icon="locateOutline" />
            </ion-item>
    
            <ion-item v-if="shipGroup.shippingInstructions" color="light" lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ translate("Handling Instructions") }}</p>
                <p>{{ shipGroup.shippingInstructions }}</p>
              </ion-label>
            </ion-item>
    
            <ion-item lines="none" v-for="item in shipGroup.items" :key="item">
              <ion-thumbnail slot="start">
                <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
              </ion-thumbnail>
              <ion-label>
                <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
              </ion-label>
              <!-- TODO: add a spinner if the api takes too long to fetch the stock -->
              <ion-note slot="end" v-if="getProductStock(item.productId, item.facilityId).quantityOnHandTotal">{{ getProductStock(item.productId, item.facilityId).quantityOnHandTotal }} {{ translate('pieces in stock') }}</ion-note>
              <ion-button slot="end" fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId, item.facilityId)">
                <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
              </ion-button>
            </ion-item>
          </ion-card>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>{{ translate("Unable to fetch the order details. Either the order has been shipped or something went wrong. Please try again after some time.")}}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonBadge,
  IonBackButton,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonNote,
  IonPage,
  IonRow,
  IonSkeletonText,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonThumbnail,
  modalController,
  popoverController
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { useRouter } from 'vue-router'
import {
  addOutline,
  archiveOutline,
  bagCheckOutline,
  caretDownOutline,
  cashOutline,
  cubeOutline,
  documentTextOutline,
  ellipsisVerticalOutline,
  fileTrayOutline,
  locateOutline,
  personAddOutline,
  pricetagOutline,
  trashBinOutline,
  ribbonOutline
} from 'ionicons/icons';
import { getProductIdentificationValue, translate, DxpShopifyImg, useProductIdentificationStore } from '@hotwax/dxp-components';
import { copyToClipboard, formatUtcDate, getFeature, showToast } from '@/utils'
import { Actions, hasPermission } from '@/authorization'
import OrderActionsPopover from '@/components/OrderActionsPopover.vue'
import emitter from '@/event-bus';
import { OrderService } from "@/services/OrderService";
import { hasError } from "@/adapter";
import logger from '@/logger';
import { UtilService } from "@/services/UtilService";
import { DateTime } from 'luxon';
import { prepareOrderQuery } from '@/utils/solrHelper';
import Popover from '@/views/ShippingPopover.vue'
import PackagingPopover from "@/views/PackagingPopover.vue";
import AssignPickerModal from '@/views/AssignPickerModal.vue';
import ShipmentBoxTypePopover from '@/components/ShipmentBoxTypePopover.vue'
import ShipmentBoxPopover from '@/components/ShipmentBoxPopover.vue'
import ReportIssuePopover from '@/components/ReportIssuePopover.vue'
import ShippingDetails from '@/views/ShippingDetails.vue';

export default defineComponent({
  name: "OrderDetail",
  props: ['category', 'orderId', 'shipGroupSeqId'],
  components: {
    DxpShopifyImg,
    IonBackButton,
    IonBadge,
    IonButton,
    IonCard,
    IonChip,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonNote,
    IonPage,
    IonRow,
    IonSkeletonText,
    IonSpinner,
    IonTitle,
    IonToolbar,
    IonThumbnail,
    ShippingDetails
  },
  computed: {
    ...mapGetters({
      boxTypeDesc: 'util/getShipmentBoxDesc',
      completedOrders: 'order/getCompletedOrders',
      currentFacility: 'user/getCurrentFacility',
      currentEComStore: 'user/getCurrentEComStore',
      getProduct: 'product/getProduct',
      getProductStock: 'stock/getProductStock',
      inProgressOrders: 'order/getInProgressOrders',
      order: "order/getCurrent",
      rejectReasons: 'util/getRejectReasons',
      userPreference: 'user/getUserPreference',
      getPartyName: 'util/getPartyName',
      getfacilityTypeDesc: 'util/getFacilityTypeDesc',
      getPaymentMethodDesc: 'util/getPaymentMethodDesc',
      getStatusDesc: 'util/getStatusDesc',
      productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount'
    })
  },
  data() {
    return {
      carrierPartyIds: [] as Array<any>,
      shipmentMethods: [] as Array<any>,
      picklists: [] as any,
      addingBoxForOrderIds: [] as any,
      defaultShipmentBoxType: '',
      itemsIssueSegmentSelected: [] as any,
      statusColor: {
        'PAYMENT_AUTHORIZED': '',
        'PAYMENT_CANCELLED': 'warning',
        'PAYMENT_DECLINED': 'warning',
        'PAYMENT_NOT_AUTH': 'warning',
        'PAYMENT_NOT_RECEIVED': 'warning',
        'PAYMENT_RECEIVED': '',
        'PAYMENT_REFUNDED': 'warning',
        'PAYMENT_SETTLED': ''
      } as any
    }
  },
  async ionViewDidEnter() {
    this.store.dispatch('util/fetchRejectReasons')
    this.category === 'open'
      ? await this.store.dispatch('order/getOpenOrder', { orderId: this.orderId, shipGroupSeqId: this.shipGroupSeqId })
      : this.category === 'in-progress'
        ? await this.store.dispatch('order/getInProgressOrder', { orderId: this.orderId, shipGroupSeqId: this.shipGroupSeqId })
        : await this.store.dispatch('order/getCompletedOrder', { orderId: this.orderId, shipGroupSeqId: this.shipGroupSeqId })
  },
  methods: {
    async printPicklist (order: any) {
      await OrderService.printPicklist(order.picklistId)
    },
    async openShipmentBoxPopover(ev: Event, item: any, order: any, kitProducts?: any, orderItemSeqId?: number) {
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

      if (result.data && (kitProducts ? kitProducts[0].selectedBox !== result.data : item.selectedBox !== result.data)) {
        this.confirmUpdateBox(item, order, result.data, kitProducts, orderItemSeqId)
      }
    },
    async confirmUpdateBox(item: any, order: any, selectedBox: string, kitProducts?: any, orderItemSeqId?: number) {
      const alert = await alertController.create({
        message: translate("Are you sure you want to update box selection?"),
        header: translate("Update box selection?"),
        buttons: [
          {
            text: translate("Cancel"),
            role: 'cancel'
          },
          {
            text: translate("Confirm"),
            handler: async () => {
              // For the case of kit products updating the order.items property as all the operations are handled on items
              if(kitProducts) {
                const kitItemAssocs = kitProducts[0].toOrderItemAssocs.find((assoc: any) => assoc.split("/")[0] === 'KIT_COMPONENT')
                order.items.map((orderItem: any) => {
                  if(orderItem.toOrderItemAssocs.includes(kitItemAssocs)) {
                    orderItem.selectedBox = selectedBox
                  }
                  return orderItem
                })
              } else {
                order.items.map((orderItem: any) => {
                  if(orderItem.orderItemSeqId === item.orderItemSeqId) {
                    orderItem.selectedBox = selectedBox
                  }
                })
              }

              await this.updateOrder(order, 'box-selection').then(async () => {
                await this.store.dispatch('order/getInProgressOrder', { orderId: this.orderId, shipGroupSeqId: this.shipGroupSeqId, isModified: true })
              }).catch(err => err);
            }
          }
        ],
      });
      return alert.present();
    },
    async orderActionsPopover(order: any, ev: Event) {
      const popover = await popoverController.create({
        component: OrderActionsPopover,
        componentProps: { order },
        showBackdrop: false,
        event: ev
      });
      return popover.present();
    },
    fetchProductStock(productId: string, facilityId = '') {
      this.store.dispatch('stock/fetchStock', { productId, facilityId })
    },
    async packOrder(order: any) {
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
              const params = {
                'picklistBinId': order.picklistBinId,
                'orderId': order.orderId
              }

              emitter.emit('presentLoader');
              let toast: any;
              const shipmentIds: Array<any> = [...new Set(order.items.map((item: any) => item.shipmentId))]
              try {
                const resp = await OrderService.packOrder(params);
                if (hasError(resp)) {
                  throw resp.data
                }
                emitter.emit('dismissLoader');

                if (data.length) {
                  // additional parameters for dismiss button and manual dismiss ability
                  toast = await showToast(translate('Order packed successfully. Document generation in process'), { canDismiss: true, manualDismiss: true })
                  toast.present()

                  if (data.includes('printPackingSlip') && data.includes('printShippingLabel')) {
                    await OrderService.printShippingLabelAndPackingSlip(shipmentIds)
                  } else if (data.includes('printPackingSlip')) {
                    await OrderService.printPackingSlip(shipmentIds)
                  } else if (data.includes('printShippingLabel')) {
                    await OrderService.printShippingLabel(shipmentIds)
                  }
                  await OrderService.printCustomDocuments([order.shipmentPackages?.[0].internationalInvoiceUrl]);

                  toast.dismiss()
                } else {
                  showToast(translate('Order packed successfully'));
                }
                this.router.replace(`/completed/order-detail/${this.orderId}/${this.shipGroupSeqId}`)
              } catch (err) {
                // in case of error, if loader and toast are not dismissed above
                if (toast) toast.dismiss()
                emitter.emit('dismissLoader');
                showToast(translate('Failed to pack order'))
                logger.error('Failed to pack order', err)
              }
            }
          }]
        });
      return confirmPackOrder.present();
    },
    async fetchPickersInformation() {
      const orderQueryPayload = prepareOrderQuery({
        viewSize: '0',  // passing viewSize as 0 as we don't need any data
        groupBy: 'picklistBinId',
        filters: {
          picklistItemStatusId: { value: 'PICKITEM_PENDING' },
          '-fulfillmentStatus': { value: 'Rejected' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId }
        },
        facet: {
          picklistFacet: {
            excludeTags: 'picklistIdFilter',
            field: 'picklistId',
            mincount: 1,
            limit: -1,
            sort: 'index',
            type: 'terms',
            facet: {
              pickerFacet: {
                excludeTags: 'pickersFilter',
                field: 'pickers',
                mincount: 1,
                limit: -1,
                sort: 'index',
                type: 'terms'
              }
            }
          }
        }
      })

      let resp;

      try {
        resp = await OrderService.findInProgressOrders(orderQueryPayload);
        if (resp.status === 200 && !hasError(resp) && resp.data.facets?.count > 0) {
          const buckets = resp.data.facets.picklistFacet.buckets

          const picklistIds = buckets.map((bucket: any) => bucket.val)

          const payload = {
            inputFields: {
              picklistId: picklistIds,
              picklistId_op: "in"
            },
            entityName: 'Picklist',
            noConditionFind: 'Y',
            viewSize: picklistIds.length
          }

          const picklistResp = await UtilService.fetchPicklistInformation(payload);

          if (picklistResp.status == 200 && !hasError(picklistResp) && picklistResp.data.count > 0) {
            this.picklists = picklistResp.data.docs.reduce((picklists: any, picklist: any) => {
              const pickersInformation = buckets.find((bucket: any) => picklist.picklistId == bucket.val)

              if (pickersInformation.count == 0) {
                return picklists;
              }

              const pickerIds = [] as Array<string>
              // if firstName is not found then adding default name `System Generated`
              const pickersName = pickersInformation.pickerFacet.buckets.length ? pickersInformation.pickerFacet.buckets.reduce((pickers: Array<string>, picker: any) => {
                const val = picker.val.split('/') // having picker val in format 10001/FirstName LastName, split will change it into [pickerId, FirstName LastName]
                pickerIds.push(val[0]) // storing pickerIds for usage in edit pickers modal
                pickers.push(val[1].split(' ')[0]) // having val[0] as 'firstname lastname', we only need to display firstName
                return pickers
              }, []) : ['System Generated']

              picklists.push({
                id: picklist.picklistId,
                pickersName: pickersName.join(', '),
                pickerIds,
                date: DateTime.fromMillis(picklist.picklistDate).toLocaleString(DateTime.TIME_SIMPLE),
                isGeneratingPicklist: false  // used to display the spinner on the button when trying to generate picklist
              })

              return picklists
            }, [])
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('No picklist facets found', err)
      }
    },
    async updateOrderQuery(size?: any, queryString?: any) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))

      size && (inProgressOrdersQuery.viewSize = size)
      queryString && (inProgressOrdersQuery.queryString = '')
      inProgressOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      await this.store.dispatch('order/updateInProgressQuery', { ...inProgressOrdersQuery })
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
    async openRejectReasonPopover(ev: Event, item: any, order: any, kitProducts?: any) {
      const reportIssuePopover = await popoverController.create({
        component: ReportIssuePopover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });

      reportIssuePopover.present();

      const result = await reportIssuePopover.onDidDismiss();

      if(result.data) {
        if(kitProducts) {
          const kitItemAssocs = kitProducts[0].toOrderItemAssocs.find((assoc: any) => assoc.split("/")[0] === 'KIT_COMPONENT')
          order.items.map((orderItem: any) => {
            if(orderItem.toOrderItemAssocs.includes(kitItemAssocs)) {
              orderItem.rejectReason = result.data
            }
            return orderItem
          })
        } else {
          order.items.map((orderItem: any) => {
            if(orderItem.orderItemSeqId === item.orderItemSeqId) {
              orderItem.rejectReason = result.data
            }
          })
        }

        const itemsToReject = order.items.filter((item: any) => item.rejectReason)
        this.reportIssue(order, itemsToReject)
      }
    },
    async assignPickers() {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order: this.order }
      });

      // dismissing the popover once the picker modal is closed
      assignPickerModal.onDidDismiss().then((result: any) => {
        popoverController.dismiss();
        // redirect to in-progress page only when we have picklist created successfully for the order
        if(result?.data?.value?.picklistId) {
          this.router.replace(`/in-progress/order-detail/${this.orderId}/${this.shipGroupSeqId}`)
        }
      });

      return assignPickerModal.present();
    },
    getShipmentPackageType(shipmentPackage: any) {
      let packageType = '';
      if(shipmentPackage.shipmentBoxTypes.length){
        packageType = shipmentPackage.shipmentBoxTypes.find((boxType: string) => boxType === shipmentPackage.shipmentBoxTypeId) ? shipmentPackage.shipmentBoxTypes.find((boxType: string) => boxType === shipmentPackage.shipmentBoxTypeId) : shipmentPackage.shipmentBoxTypes[0];
      }
      return packageType;
    },
    async regenerateShippingLabel(order: any) {
      // If there are no product store shipment method configured, then not generating the label and displaying an error toast
      if(this.productStoreShipmentMethCount <= 0) {
        showToast(translate('Unable to generate shipping label due to missing product store shipping method configuration'))
        return;
      }


      // if the request to print shipping label is not yet completed, then clicking multiple times on the button
      // should not do anything
      if(order.isGeneratingShippingLabel) {
        return;
      }

      order.isGeneratingShippingLabel = true;

      if(order.missingLabelImage) {
        await this.retryShippingLabel(order)
      } else {
        await this.printShippingLabel(order)
      }

      order.isGeneratingShippingLabel = false;
    },
    async initialiseOrderQuery() {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      completedOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async retryShippingLabel(order: any) {
      // Getting all the shipmentIds from shipmentPackages, as we only need to pass those shipmentIds for which label is missing
      // In shipmentPackages only those shipmentInformation is available for which shippingLabel is missing
      const shipmentIds = order.shipmentPackages?.map((shipmentPackage: any) => shipmentPackage.shipmentId);

      if(!shipmentIds?.length) {
        showToast(translate("Failed to generate shipping label"))
        return;
      }

      // TODO Handle error case
      const resp = await OrderService.retryShippingLabel(shipmentIds)
      if (!hasError(resp)) {
        showToast(translate("Shipping Label generated successfully"))
        await this.printShippingLabel(order)
        // TODO fetch specific order
        this.initialiseOrderQuery();
      } else {
        showToast(translate("Failed to generate shipping label"))
      }
    },
    async shippingPopover(ev: Event) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
    async printShippingLabel(order: any) {
      const shipmentIds = order.shipments?.map((shipment: any) => shipment.shipmentId)

      if(!shipmentIds?.length) {
        showToast(translate('Failed to generate shipping label'))
        return;
      }

      await OrderService.printShippingLabel(shipmentIds)
      await OrderService.printCustomDocuments([order.shipmentPackages?.[0].internationalInvoiceUrl]);
    },
    async addShipmentBox(order: any) {
      this.addingBoxForOrderIds.push(order.orderId)

      const { carrierPartyId, shipmentMethodTypeId } = await this.fetchShipmentRouteSegmentInformation(order.shipmentIds)
      
      if(!this.defaultShipmentBoxType) {
        this.defaultShipmentBoxType = await this.fetchDefaultShipmentBox();
      }

      const params = {
        picklistBinId: order.groupValue,
        shipmentBoxTypeId: this.defaultShipmentBoxType
      } as any

      carrierPartyId && (params['carrierPartyId'] = carrierPartyId)
      shipmentMethodTypeId && (params['shipmentMethodTypeId'] = shipmentMethodTypeId)

      try {
        const resp = await OrderService.addShipmentBox(params)

        if(!hasError(resp)) {
          showToast(translate('Box added successfully'))
          await this.store.dispatch('order/getInProgressOrder', { orderId: this.orderId, shipGroupSeqId: this.shipGroupSeqId, isModified: true })
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Failed to add box'))
        logger.error('Failed to add box', err)
      }
      this.addingBoxForOrderIds.splice(this.addingBoxForOrderIds.indexOf(order.orderId), 1)
    },
    async fetchShipmentRouteSegmentInformation(shipmentIds: Array<string>) {
      const payload = {
        "inputFields": {
          "carrierPartyId": "_NA_",
          "carrierPartyId_op": "notEqual",
          "shipmentId": shipmentIds,
          "shipmentId_op": "in"
        },
        "entityName": "ShipmentRouteSegment",
        "fieldList": ["carrierPartyId", "shipmentMethodTypeId"]
      }

      try {
        const resp = await UtilService.fetchShipmentRouteSegmentInformation(payload)

        if(!hasError(resp) && resp.data.count) {
          return resp.data.docs[0]
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch shipment route segment information', err)
      }

      return {};
    },
    async updateShipmentBoxType(shipmentPackage: any, order: any, ev: CustomEvent) {
      // Don't open popover when not having shipmentBoxTypes available
      if (!shipmentPackage.shipmentBoxTypes.length) {
        logger.error('Failed to fetch shipment box types')
        return;
      }

      const popover = await popoverController.create({
        component: ShipmentBoxTypePopover,
        event: ev,
        showBackdrop: false,
        componentProps: { shipmentPackage }
      });

      popover.present();

      const result = await popover.onDidDismiss();

      if (result.data) {
        shipmentPackage.shipmentBoxTypeId = result.data;
        this.store.dispatch('order/updateInProgressOrder', order);
      }
    },
    async fetchDefaultShipmentBox() {
      let defaultBoxType = 'YOURPACKNG'

      try {
        const resp = await UtilService.fetchDefaultShipmentBox({
          "entityName": "SystemProperty",
          "inputFields": {
            "systemResourceId": "shipment",
            "systemPropertyId": "shipment.default.boxtype"
          },
          "fieldList": ["systemPropertyValue", "systemResourceId"]
        })

        if(!hasError(resp) && resp.data.count) {
          defaultBoxType = resp.data.docs[0].systemPropertyValue
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch default shipment box type information', err)
      }

      return defaultBoxType;
    },
    async findInProgressOrders () {
      // assigning with empty array, as when we are updating(save) an order and if for one of the items issue segment
      // was selected before update making pack button disabled, then after update pack button is still disabled for that order
      this.itemsIssueSegmentSelected = []
      await this.store.dispatch('order/findInProgressOrders')
    },
    async updateOrder(order: any, updateParameter: string) {
      const form = new FormData()

      form.append('facilityId', this.currentFacility.facilityId)
      form.append('orderId', order.orderId)

      order.shipmentIds?.map((shipmentId: string) => {
        form.append('shipmentIds', shipmentId)
      })

      const items = JSON.parse(JSON.stringify(order.items));

      // creating updated data for shipment packages
      order.shipmentPackages?.map((shipmentPackage: any, index: number) => {
        form.append(`box_shipmentId_${index}`, shipmentPackage.shipmentId)
        form.append(`${index}_box_rowSubmit_`, ''+index)
        form.append(`box_shipmentBoxTypeId_${index}`, shipmentPackage.shipmentBoxTypeId)
      })

      // creating updated data for items
      items.map((item: any, index: number) => {
        const shipmentPackage = order.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.packageName === item.selectedBox)

        let prefix = 'rtp'
        // reject the item only when item is having a rejection reason
        if(updateParameter === 'report' && item.rejectReason) {
          prefix = 'rej'
          form.append(`${prefix}_rejectionReason_${index}`, item.rejectReason)
        } else {
          form.append(`${prefix}_newShipmentId_${index}`, shipmentPackage.shipmentId)
        }

        form.append(`${prefix}_shipmentId_${index}`, item.shipmentId)
        form.append(`${prefix}_shipmentItemSeqId_${index}`, item.shipmentItemSeqId)
        form.append(`${index}_${prefix}_rowSubmit_`, ''+index)
      })

      form.append('picklistBinId', order.picklistBinId)

      try {
        const resp = await OrderService.updateOrder({
          headers: {
            'Content-Type': 'multipart/form-data;'
          },
          data: form
        })

        if(!hasError(resp)) {
            // updating the shipment information on item level
          const itemInformationByOrderResp = await UtilService.findShipmentItemInformation(order.shipmentIds);
          const itemInformation = itemInformationByOrderResp[order.orderId]

          itemInformation?.map((orderItem: any) => {
            const item = items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId)

            item.shipmentId = orderItem.shipmentId
            item.shipmentItemSeqId = orderItem.shipmentItemSeqId
          })
          order.items = items

          await this.store.dispatch('order/updateInProgressOrder', order)
          showToast(translate('Order updated successfully'))
          return Promise.resolve(order);
        } else {
          throw resp.data;
        }
      } catch (err) {
        showToast(translate('Failed to update order'))
        logger.error('Failed to update order', err)
        return Promise.reject(err);
      }
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
          message = translate('is identified as. This order item will be unassigned from the store and sent to be rebrokered.', { productName: rejectedItem.productName, rejectReason: ((this.rejectReasons.find((rejectReason: {[key: string]: any}) => rejectReason.enumId === rejectedItem.rejectReason)).description).toLowerCase() });
        } else {
          message = translate(', and other products were identified as unfulfillable. These items will be unassigned from this store and sent to be rebrokered.', { productName: rejectedItem.productName, products: itemsToReject.length - 1, space: '<br /><br />' });
        }
      } else {
        const productName = outOfStockItem.productName
        const itemsToRejectNotInStock = itemsToReject.filter((item: any) => item.rejectReason === 'NOT_IN_STOCK');
        
        // TODO: ordersCount is not correct as current we are identifying orders count by only checking items visible on UI and not other orders        
        const ordersCount = this.inProgressOrders.list.map((inProgressOrder: any) => inProgressOrder.items.filter((item: any) => itemsToRejectNotInStock.some((outOfStockItem: any) => outOfStockItem.productSku === item.productSku) && item.orderId !== order.orderId))?.filter((item: any) => item.length).length;

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
              await this.updateOrder(order, 'report').then(async () => {
                // redirect user to inProgress list page only when the order has a single item, and the user initiated report action on the same
                // update the current order only when order contains multiple items in it.
                if(order.items.length === 1) {
                  this.router.push('/in-progress')
                } else {
                  await this.store.dispatch('order/getInProgressOrder', { orderId: this.orderId, shipGroupSeqId: this.shipGroupSeqId, isModified: true })
                }
              }).catch(err => err);
            }
          }]
        });
      
      return alert.present();
    },
    hasPackedShipments(order: any) {
      // TODO check if ternary check is needed or we could handle on UI
      return order.shipments ? Object.values(order.shipments).some((shipment: any) => shipment.statusId === 'SHIPMENT_PACKED') : {}
    },
    async shipOrder(order: any) {
      const packedShipments = order.shipments.filter((shipment: any) => shipment.statusId === "SHIPMENT_PACKED");

      if (packedShipments.length === 0) {
        showToast(translate('There are no packed shipments. Failed to ship order.'))
        return;
      }
      const shipmentIds = new Set();
      let index = 0;

      const payload = packedShipments.reduce((formData: any, shipment: any) => {

        if (!shipmentIds.has(shipment.shipmentId)) {
          formData.append('shipmentId_o_' + index, shipment.shipmentId)
          formData.append('statusId_o_' + index, "SHIPMENT_SHIPPED")
          formData.append('shipmentTypeId_o_' + index, shipment.shipmentTypeId)
          formData.append('_rowSubmit_o_' + index, "Y")
          index++;
        }

        return formData;
      }, new FormData())

      try {
        const resp = await OrderService.shipOrder(payload)

        if (!hasError(resp)) {
          showToast(translate('Order shipped successfully'))

          // updating order locally after ship action is success, as solr takes some time to update
          order.shipments?.map((shipment: any) => {
            if(shipment.shipmentId === order.shipmentId) shipment.statusId = 'SHIPMENT_SHIPPED'
          })
          this.store.dispatch('order/updateCurrent', order)

        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to ship order', err)
        showToast(translate('Failed to ship order'))
      }
    },
    async fetchShipmentMethods() {
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        groupBy: 'picklistBinId',
        sort: 'orderDate asc',
        defType: "edismax",
        filters: {
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId }
        },
        facet: {
          "shipmentMethodFacet": {
            "excludeTags": "shipmentMethodTypeIdFilter",
            "field": "shipmentMethodTypeId",
            "mincount": 1,
            "limit": -1,
            "sort": "index",
            "type": "terms",
            "facet": {
              "groups": "unique(orderId)",
              "itemCount": "sum(itemQuantity)"
            }
          }
        }
      })

      try {
        const resp = await UtilService.fetchShipmentMethods(payload)

        if(resp.status == 200 && !hasError(resp)) {
          this.shipmentMethods = resp.data.facets.shipmentMethodFacet.buckets
          this.store.dispatch('util/fetchShipmentMethodTypeDesc', this.shipmentMethods.map((shipmentMethod: any) => shipmentMethod.val))
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch shipment methods', err)
      }
    },
    async fetchCarrierPartyIds() {
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        groupBy: 'picklistBinId',
        sort: 'orderDate asc',
        defType: "edismax",
        filters: {
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId },
        },
        facet: {
          manifestContentIdFacet: {
            "excludeTags": "manifestContentIdFilter",
            "field": "manifestContentId",
            "mincount": 1,
            "limit": -1,
            "sort": "index",
            "type": "terms",
            "facet": {
              "groups": "unique(picklistBinId)"
            }
          }
        }
      })

      try {
        const resp = await UtilService.fetchCarrierPartyIds(payload)

        if(resp.status == 200 && !hasError(resp)) {
          this.carrierPartyIds = resp.data.facets.manifestContentIdFacet.buckets
          this.store.dispatch('util/fetchPartyInformation', this.carrierPartyIds.map((carrierPartyId) => carrierPartyId.val.split('/')[0]))
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch carrierPartyIds', err)
      }
    },
    async printPackingSlip(order: any) {
      // if the request to print packing slip is not yet completed, then clicking multiple times on the button
      // should not do anything
      if(order.isGeneratingPackingSlip) {
        return;
      }

      const shipmentIds = order.shipments?.map((shipment: any) => shipment.shipmentId)
      order.isGeneratingPackingSlip = true;
      await OrderService.printPackingSlip(shipmentIds);
      order.isGeneratingPackingSlip = false;
    },
    async unpackOrder(order: any) {
      const unpackOrderAlert = await alertController
        .create({
           header: translate("Unpack"),
           message: translate("Unpacking this order will send it back to 'In progress' and it will have to be repacked."),
           buttons: [{
            role: "cancel",
            text: translate("Cancel"),
          }, {
            text: translate("Unpack"),
            handler: async () => {
              const payload = {
                orderId: order.orderId,
                picklistBinId: order.groupValue
              }

              try {
                const resp = await OrderService.unpackOrder(payload)

                if(resp.status == 200 && !hasError(resp)) {
                  showToast(translate('Order unpacked successfully'))
                  this.router.replace(`/in-progress/order-detail/${this.orderId}/${this.shipGroupSeqId}`)
                } else {
                  throw resp.data
                }
              } catch(err) {
                logger.error('Failed to unpack the order', err)
                showToast(translate('Failed to unpack the order'))
              }
            }
          }]
        });
      return unpackOrderAlert.present();
    },
    isTrackingRequiredForAnyShipmentPackage(order: any) {
      return order.shipmentPackages?.some((shipmentPackage: any) => shipmentPackage.isTrackingRequired === 'Y')
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      addOutline,
      archiveOutline,
      Actions,
      bagCheckOutline,
      cashOutline,
      caretDownOutline,
      copyToClipboard,
      cubeOutline,
      documentTextOutline,
      ellipsisVerticalOutline,
      fileTrayOutline,
      formatUtcDate,
      getFeature,
      getProductIdentificationValue,
      hasPermission,
      locateOutline,
      personAddOutline,
      pricetagOutline,
      productIdentificationPref,
      router,
      store,
      trashBinOutline,
      translate,
      ribbonOutline
    };
  }
});
</script>

ion-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0px;
}

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
</style>
