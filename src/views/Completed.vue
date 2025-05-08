<template>
  <ion-page :key="router.currentRoute.value.path">
    <ViewSizeSelector menu-id="view-size-selector-completed" content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!completedOrders.total">{{ completedOrders.total }} {{ translate('orders') }}</ion-title>
        <ion-title v-else>{{ completedOrders.query.viewSize }} {{ translate('of') }} {{ completedOrders.total }} {{ completedOrders.total ? translate('order') : translate('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-menu-button menu="view-size-selector-completed" :disabled="!completedOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="view-size-selector">
      <ion-searchbar class="searchbar" :value="completedOrders.query.queryString" :placeholder="translate('Search orders')" @keyup.enter="updateQueryString($event.target.value)" />
      <ion-radio-group v-if="carrierPartyIds?.length" v-model="selectedCarrierPartyId" @ionChange="updateSelectedCarrierPartyIds($event.detail.value)">
        <ion-row class="filters">
          <ion-item lines="none">
              <!-- empty value '' for 'All orders' radio -->
            <ion-radio label-placement="end" value="">
              <ion-label class="ion-text-wrap">
                {{ translate("All") }}
                <p>{{ getTotalPackages }} {{ translate("packages") }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
          <ion-item lines="none" v-for="carrierPartyId in carrierPartyIds" :key="carrierPartyId.val">
            <ion-radio label-placement="end" :value="carrierPartyId.id">
              <ion-label>
                {{ getPartyName(carrierPartyId.id) }}
                <p>{{ carrierPartyId.groups }} {{ carrierPartyId.groups === 1 ? translate('package') : translate("packages") }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-row>
      </ion-radio-group>

      <div v-if="shipmentMethods?.length" class="filters">
        <ion-item lines="none" v-for="shipmentMethod in shipmentMethods" :key="shipmentMethod.val">
          <ion-checkbox label-placement="end" :checked="completedOrders.query.selectedShipmentMethods.includes(shipmentMethod.val)" @ionChange="updateSelectedShipmentMethods(shipmentMethod.val)">
            <ion-label>
              {{ getShipmentMethodDesc(shipmentMethod.val) }}
              <p>{{ shipmentMethod.groups }} {{ shipmentMethod.groups > 1 ? translate('orders') : translate('order') }}, {{ shipmentMethod.itemCount }} {{ shipmentMethod.itemCount > 1 ? translate('items') : translate('item') }}</p>
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>

      <div v-if="completedOrders.total">
        <div class="results">
          <ion-button :disabled="isShipNowDisabled || !hasAnyPackedShipment() || hasAnyMissingInfo() || (hasAnyShipmentTrackingInfoMissing() && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" expand="block" class="bulk-action desktop-only" fill="outline" size="large" @click="bulkShipOrders()">{{ translate("Ship") }}</ion-button>
          <ion-card class="order" v-for="(order, index) in completedOrdersList" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  <strong>{{ order.customerName }}</strong>
                  <p>{{ translate("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
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
                  {{ order.shipmentMethodTypeDesc }}
                  <p v-if="order.reservedDatetime">{{ translate("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy hh:mm a ZZZZ') }}</p>
                  <p v-if="order.trackingCode">{{ translate("Tracking Code") }} {{ order.trackingCode }}</p>
                </ion-label>
              </div>
            </div>

            <div v-for="item in order.items" :key="item.orderItemSeqId" class="order-line-item">
              <div class="order-item">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" :key="getProduct(item.productId).mainImageUrl" size="small"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                      <div>
                        {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
                        <ion-badge class="kit-badge" color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                      </div>
                      <p>{{ getFeatures(getProduct(item.productId).productFeatures)}}</p>
                    </ion-label>
                  </ion-item>
                </div>
                <div class="product-metadata">
                  <ion-button v-if="isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item)">
                    <ion-icon v-if="item.showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline"/>
                    <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline"/>
                  </ion-button>
                  <ion-button color="medium" fill="clear" size="small" v-if="item.productTypeId === 'GIFT_CARD'" @click="openGiftCardActivationModal(item)">
                    <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline"/>
                  </ion-button>
                  <ion-note v-if="getProductStock(item.productId).quantityOnHandTotal">{{ getProductStock(item.productId).quantityOnHandTotal }} {{ translate('pieces in stock') }}</ion-note>
                  <ion-button fill="clear" v-else size="small" @click.stop="fetchProductStock(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
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
                      <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" :key="getProduct(productComponent.productIdTo).mainImageUrl" size="small"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                      {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                      <p>{{ getFeatures(getProduct(productComponent.productIdTo).productFeatures)}}</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </div>
            </div>

            <!-- TODO: implement functionality to mobile view -->
            <div class="mobile-only">
              <ion-item>
                <ion-button :disabled="isShipNowDisabled || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" fill="clear" >{{ translate("Ship Now") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click.stop="shippingPopover">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <!-- TODO: make the buttons functional -->
            <div class="actions">
              <div class="desktop-only">
                <ion-button v-if="!hasPackedShipments(order)" :disabled="true">{{ translate("Shipped") }}</ion-button>
                <ion-button v-else :disabled="isShipNowDisabled || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || ((isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode) && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click.stop="shipOrder(order)">{{ translate("Ship Now") }}</ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="regenerateShippingLabel(order)">
                  {{ translate(order.missingLabelImage ? "Regenerate Shipping Label" : "Print Shipping Label") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingShippingLabel" name="crescent" />
                </ion-button>
                <ion-button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" fill="outline" @click.stop="printPackingSlip(order)">
                  {{ translate("Print Customer Letter") }}
                  <ion-spinner color="primary" slot="end" v-if="order.isGeneratingPackingSlip" name="crescent" />
                </ion-button>
              </div>
              <div class="desktop-only">
                <ion-button v-if="order.missingLabelImage" fill="outline" @click.stop="showShippingLabelErrorModal(order)">{{ translate("Shipping label error") }}</ion-button>
                <ion-button :disabled="isUnpackDisabled || !hasPermission(Actions.APP_UNPACK_ORDER) || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" fill="outline" color="danger" @click.stop="unpackOrder(order)">{{ translate("Unpack") }}</ion-button>
              </div>
            </div>
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreCompletedOrders($event)" threshold="100px" v-show="isCompletedOrderScrollable()" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </div>
      </div>
      <ion-fab v-if="completedOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :disabled="!hasAnyPackedShipment() || hasAnyMissingInfo() || (hasAnyShipmentTrackingInfoMissing() && !hasPermission(Actions.APP_FORCE_SHIP_ORDER))" @click="bulkShipOrders()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
      <div class="empty-state" v-else>
        <p v-html="getErrorMessage()"></p>
      </div>
    </ion-content>

    <ion-footer v-if="selectedCarrierPartyId">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="outline" color="primary" @click="openHistoricalManifestModal">
            <ion-icon slot="start" :icon="timeOutline" />
            {{ translate("View historical manifests") }}
          </ion-button>
          <ion-button fill="solid" color="primary" :disabled="!carrierConfiguration[selectedCarrierPartyId]?.['MANIFEST_GEN_REQUEST']" @click="generateCarrierManifest">
            <ion-icon slot="start" :icon="printOutline" />
            {{ translate("Generate Manifest") }}
            <ion-spinner name="crescent" slot="end" v-if="isGeneratingManifest" />
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
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonNote,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonRow,
  IonSearchbar,
  IonSkeletonText,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  popoverController,
  modalController
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { caretDownOutline, chevronUpOutline, cubeOutline, printOutline, downloadOutline, gift, giftOutline, listOutline, pricetagOutline, ellipsisVerticalOutline, checkmarkDoneOutline, optionsOutline, timeOutline, analytics } from 'ionicons/icons'
import Popover from '@/views/ShippingPopover.vue'
import { useRouter } from 'vue-router';
import { mapGetters, useStore } from 'vuex'
import { copyToClipboard, formatUtcDate, getFeatures, getFacilityFilter, hasActiveFilters, showToast } from '@/utils'
import { hasError } from '@/adapter'
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { UtilService } from '@/services/UtilService';
import { prepareOrderQuery } from '@/utils/solrHelper';
import emitter from '@/event-bus';
import ViewSizeSelector from '@/components/ViewSizeSelector.vue'
import { OrderService } from '@/services/OrderService';
import logger from '@/logger';
import ShippingLabelErrorModal from '@/components/ShippingLabelErrorModal.vue';
import { Actions, hasPermission } from '@/authorization'
import OrderActionsPopover from '@/components/OrderActionsPopover.vue'
import { isKit, retryShippingLabel } from '@/utils/order'
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { DateTime } from 'luxon';
import HistoricalManifestModal from '@/components/HistoricalManifestModal.vue';

export default defineComponent({
  name: 'Completed',
  components: {
    DxpShopifyImg,
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
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonRadio,
    IonRadioGroup,
    IonRow,
    IonSearchbar,
    IonSkeletonText,
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ViewSizeSelector
  },
  data() {
    return {
      shipmentMethods: [] as Array<any>,
      carrierPartyIds: [] as Array<any>,
      searchedQuery: '',
      isScrollingEnabled: false,
      completedOrdersList: [] as any,
      selectedCarrierPartyId: "",
      carrierConfiguration: {} as any,
      isGeneratingManifest: false,
      selectedShipmentMethods: [] as any
    }
  },
  computed: {
    ...mapGetters({
      completedOrders: 'order/getCompletedOrders',
      getProduct: 'product/getProduct',
      getPartyName: 'util/getPartyName',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      getProductStock: 'stock/getProductStock',
      productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount',
      isShipNowDisabled: 'user/isShipNowDisabled',
      isUnpackDisabled: 'user/isUnpackDisabled'
    }),
    getTotalPackages() {
      return this.carrierPartyIds.reduce((total: number, carrier: any) => total + Number(carrier.groups), 0);
    }
  },
  async ionViewWillEnter() {
    this.isScrollingEnabled = false;
    await Promise.all([this.initialiseOrderQuery(), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
    emitter.on('updateOrderQuery', this.updateOrderQuery)
    this.completedOrdersList = JSON.parse(JSON.stringify(this?.completedOrders.list)).slice(0, (this.completedOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
  },
  ionViewWillLeave() {
    this.store.dispatch('order/clearCompletedOrders')
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  watch: {
    'completedOrders.list': {
      handler() {
        this.completedOrdersList = JSON.parse(JSON.stringify(this?.completedOrders.list)).slice(0, (this.completedOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
      },
    }
  },
  methods: {
    getErrorMessage() {
      return this.searchedQuery ? (hasActiveFilters(this.completedOrders.query) ? translate("No results found for . Try using different filters.", { searchedQuery: this.searchedQuery }) : translate( "No results found for . Try searching In Progress or Open tab instead. If you still can't find what you're looking for, try switching stores.", { searchedQuery: this.searchedQuery, lineBreak: '<br />' })) : translate("doesn't have any completed orders right now.", { facilityName: this.currentFacility?.facilityName });
    },
    hasAnyPackedShipment(): boolean {
      return this.completedOrders.list.some((order: any) => {
        return order.shipments && order.shipments.some((shipment: any) => shipment.statusId === "SHIPMENT_PACKED");
      })
    },
    hasAnyMissingInfo(): boolean {
      return this.completedOrders.list.some((order: any) => {
        return order.hasMissingShipmentInfo || order.hasMissingPackageInfo;
      })
    },
    async fetchKitComponents(orderItem: any) {
      this.store.dispatch('product/fetchProductComponents', { productId: orderItem.productId })
      
      //update the order in order to toggle kit components section
      const updatedOrder = this.completedOrders.list.find((order: any) =>  order.orderId === orderItem.orderId && order.picklistBinId === orderItem.picklistBinId);
      const updatedItem = updatedOrder.items.find((item: any) => item.orderItemSeqId === orderItem.orderItemSeqId)
      updatedItem.showKitComponents = orderItem.showKitComponents ? false : true
      this.completedOrdersList = JSON.parse(JSON.stringify(this?.completedOrders.list)).slice(0, (this.completedOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
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
    async loadMoreCompletedOrders(event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if (!(this.isScrollingEnabled && this.isCompletedOrderScrollable())) {
        await event.target.complete();
      }
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      completedOrdersQuery.viewIndex++;
      await this.store.dispatch('order/updateCompletedOrderIndex', { ...completedOrdersQuery })
      this.completedOrdersList = JSON.parse(JSON.stringify(this?.completedOrders.list)).slice(0, (this.completedOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any));
      event.target.complete();
    },
    isCompletedOrderScrollable() {
      return ((this.completedOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) <  this.completedOrders.query.viewSize;
    },
    async initialiseOrderQuery() {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
      completedOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      if(this.selectedCarrierPartyId) completedOrdersQuery.selectedCarrierPartyId = this.selectedCarrierPartyId
      if(this.selectedShipmentMethods?.length) completedOrdersQuery.selectedShipmentMethods = this.selectedShipmentMethods
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async updateOrderQuery(size: any) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      completedOrdersQuery.viewSize = size
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
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

        if(!hasError(resp)) {
          showToast(translate('Order shipped successfully'))
          // TODO: handle the case of data not updated correctly
          const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
          await Promise.all([this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery }), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to ship order', err)
        showToast(translate('Failed to ship order'))
      }
    },
    async bulkShipOrders() {
      const packedOrdersCount = this.completedOrders.list.filter((order: any) => {
        return this.hasPackedShipments(order);
      }).length;
      const shipOrderAlert = await alertController
        .create({
           header: translate("Ship orders"),
           message: translate("You are shipping orders. You cannot unpack and edit orders after they have been shipped. Are you sure you are ready to ship this orders?", {count: packedOrdersCount, space: '<br /><br />'}),
           buttons: [{
            role: "cancel",
            text: translate("Cancel"),
          }, {
            text: translate("Ship"),
            handler: async () => {
              let orderList = JSON.parse(JSON.stringify(this.completedOrders.list))
              // orders with tracking required and missing label must be excluded
              const trackingRequiredOrders = orderList.filter((order: any) => this.isTrackingRequiredForAnyShipmentPackage(order))
              let trackingRequiredAndMissingCodeOrders: any
              if (trackingRequiredOrders.length) {
                // filtering and excluding orders having missing label image with tracking required
                trackingRequiredAndMissingCodeOrders = trackingRequiredOrders.filter((order: any) => !order.trackingCode).map((order: any) => order.orderId)
                if (trackingRequiredAndMissingCodeOrders.length) {
                  orderList = orderList.filter((order: any) => !trackingRequiredAndMissingCodeOrders.includes(order.orderId))
                }
              }

              if (!orderList.length) {
                showToast(translate("No orders are currently able to be shipped due to missing tracking codes."))
                return;
              }

              let shipmentIds = orderList.reduce((shipmentIds: any, order: any) => {
                if (order.shipments) {
                  order.shipments.reduce((shipmentIds: any, shipment: any) => {
                    if (shipment.statusId === "SHIPMENT_PACKED") {
                      shipmentIds.push(shipment.shipmentId)
                    }
                    return shipmentIds;
                  }, shipmentIds) 
                }
                return shipmentIds;
              }, []);

              // Considering only unique shipment IDs
              // TODO check reason for redundant shipment IDs
              shipmentIds = [...new Set(shipmentIds)] as Array<string>;

              if (shipmentIds.length === 0) {
                showToast(translate("No packed shipments to ship for these orders"))
                return;
              }
              const payload = {
                shipmentId: shipmentIds
              }

              try {
                const resp = await OrderService.bulkShipOrders(payload)

                if (resp.status == 200 && !hasError(resp)) {
                  !trackingRequiredAndMissingCodeOrders.length
                    ? showToast(translate('Orders shipped successfully'))
                    : showToast(translate('out of cannot be shipped due to missing tracking codes.', { remainingOrders: trackingRequiredAndMissingCodeOrders.length, totalOrders: packedOrdersCount }))
                  // TODO: handle the case of data not updated correctly
                  const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))
                  await Promise.all([this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery }), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
                } else {
                  throw resp.data
                }
              } catch(err) {
                logger.error('Failed to ship orders', err)
                showToast(translate('Failed to ship orders'))
              }
            }
          }]
        });
      return shipOrderAlert.present();
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

    async fetchShipmentMethods() {
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        groupBy: 'picklistBinId',
        sort: 'orderDate asc',
        defType: "edismax",
        filters: {
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          productStoreId: { value: this.currentEComStore.productStoreId },
          ...getFacilityFilter(this.currentFacility?.facilityId)
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
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY-7DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          productStoreId: { value: this.currentEComStore.productStoreId },
          ...getFacilityFilter(this.currentFacility?.facilityId)
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
          this.carrierPartyIds = resp.data.facets.manifestContentIdFacet.buckets.map((bucket: any) => {
            bucket["id"] = bucket.val.split('/')[0]
            return bucket
          })
          const partyIds = this.carrierPartyIds.map((carrierPartyId) => carrierPartyId.val.split('/')[0])
          this.store.dispatch('util/fetchPartyInformation', partyIds)
          await this.fetchConfiguredCarrierService(partyIds);
          await this.fetchCarrierManifestInformation(partyIds);
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch carrierPartyIds', err)
      }
    },
    async updateQueryString(queryString: string) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      completedOrdersQuery.queryString = queryString
      await this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
      this.searchedQuery = queryString;
    },
    async updateSelectedShipmentMethods (method: string) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      const selectedShipmentMethods = completedOrdersQuery.selectedShipmentMethods
      const index = selectedShipmentMethods.indexOf(method)
      if (index < 0) {
        selectedShipmentMethods.push(method)
      } else {
        selectedShipmentMethods.splice(index, 1)
      }

      // making view size default when changing the shipment method to correctly fetch orders
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      completedOrdersQuery.selectedShipmentMethods = selectedShipmentMethods
      this.selectedShipmentMethods = selectedShipmentMethods

      this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
    },
    async updateSelectedCarrierPartyIds (carrierPartyId: string) {
      const completedOrdersQuery = JSON.parse(JSON.stringify(this.completedOrders.query))

      // making view size default when changing the shipment method to correctly fetch orders
      completedOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      completedOrdersQuery.selectedCarrierPartyId = carrierPartyId

      this.store.dispatch('order/updateCompletedQuery', { ...completedOrdersQuery })
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
                  // TODO: handle the case of data not updated correctly
                  await Promise.all([this.store.dispatch('order/findCompletedOrders'), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
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
    hasPackedShipments(order: any) {
      // TODO check if ternary check is needed or we could handle on UI
      return order.shipments ? Object.values(order.shipments).some((shipment: any) => shipment.statusId === 'SHIPMENT_PACKED') : {}
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
    async printShippingLabel(order: any) {
      const shipmentIds = order.shipments?.map((shipment: any) => shipment.shipmentId)
      const shippingLabelPdfUrls = order.shipmentPackages
          ?.filter((shipmentPackage: any) => shipmentPackage.labelPdfUrl)
          .map((shipmentPackage: any) => shipmentPackage.labelPdfUrl);
      if(!shipmentIds?.length) {
        showToast(translate('Failed to generate shipping label'))
        return
      }

      await OrderService.printShippingLabel(shipmentIds, shippingLabelPdfUrls, order.shipmentPackages);
      if (order.shipmentPackages?.[0].internationalInvoiceUrl) {
        await OrderService.printCustomDocuments([order.shipmentPackages?.[0].internationalInvoiceUrl]);
      }
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
        const response = await this.retryShippingLabel(order)
        if(response?.isGenerated) {
          await this.printShippingLabel(response.order)
        }
      } else {
        await this.printShippingLabel(order)
      }

      order.isGeneratingShippingLabel = false;
    },
    async showShippingLabelErrorModal(order: any){
      // Getting all the shipment ids
      const shipmentIds = order.shipments?.map((shipment: any) => shipment.shipmentId);
      const shippingLabelErrorModal = await modalController.create({
        component: ShippingLabelErrorModal,
        componentProps: {
          shipmentIds
        }
      });
      return shippingLabelErrorModal.present();
    },
    fetchProductStock(productId: string) {
      this.store.dispatch('stock/fetchStock', { productId })
    },
    isTrackingRequiredForAnyShipmentPackage(order: any) {
      return order.shipmentPackages?.some((shipmentPackage: any) => shipmentPackage.isTrackingRequired === 'Y')
    },
    hasAnyShipmentTrackingInfoMissing() {
      return this.completedOrders.list.some((order: any) => (order.shipmentPackages && (this.isTrackingRequiredForAnyShipmentPackage(order) && !order.trackingCode)))
    },
    async orderActionsPopover(order: any, ev: Event) {
      const popover = await popoverController.create({
        component: OrderActionsPopover,
        componentProps: {
          order,
          category: 'completed'
        },
        showBackdrop: false,
        event: ev
      });
      return popover.present();
    },
    async openGiftCardActivationModal(item: any) {
      const modal = await modalController.create({
        component: GiftCardActivationModal,
        componentProps: { item }
      })

      modal.onDidDismiss().then((result: any) => {
        if(result.data?.isGCActivated) {
          this.store.dispatch("order/updateCurrentItemGCActivationDetails", { item, category: "completed", isDetailsPage: false })
        }
      })

      modal.present();
    },
    async fetchConfiguredCarrierService(carrierPartyIds: Array<string>) {
      const payload = {
        inputFields: {
          carrierPartyId: carrierPartyIds,
          carrierPartyId_op: "in",
          shipmentMethodTypeId: "_NA_",
          requestType: ["MANIFEST_GEN_REQUEST", "MANIFEST_PRINT"],
          requestType_op: "in"
        },
        entityName: "ShipmentRequest",
        viewSize: carrierPartyIds.length * 2
      }
      try {
        const resp = await UtilService.fetchConfiguredCarrierService(payload)

        if(!hasError(resp) && resp.data?.docs?.length) {
          this.carrierConfiguration = resp.data.docs.reduce((carriers: any, carrier: any) => {
            if(!carriers[carrier.carrierPartyId]) {
              carriers[carrier.carrierPartyId] = {
                [carrier.requestType]: carrier.serviceName
              }
            } else {
              carriers[carrier.carrierPartyId][carrier.requestType] = carrier.serviceName
            }

            return carriers
          }, {})
        }
      } catch(err) {
        logger.error("Failed to fetch carrier configuration information", err)
      }
    },
    async fetchCarrierManifestInformation(carrierPartyIds: Array<string>) {
      // Using loop to fetch records as we only need a single record for each party
      // If used with in operator on partyId field then we need to check if the records exceed 250
      // and thus needs to handle that case as well.
      for(let partyId of carrierPartyIds) {
        const payload = {
          inputFields: {
            partyId,
            facilityContentTypeEnumId: "FAC_DELVER_MANIFEST",
            dataResourceTypeId: "URL_RESOURCE",
            roleTypeId: "CARRIER",
            fromDate: DateTime.now().startOf("day").minus({ days: 7 }).toMillis(),
            fromDate_op: "greaterThanEqualTo",
            facilityId: this.currentFacility.facilityId
          },
          entityName: "FacilityContentAndDataResource",
          viewSize: 250,  // Assuming that there will not be more than 250 manifest in last 7 days for a carrier
          filterByDate: "Y",
          orderBy: "contentId DESC"
        }
        try {
          const resp = await UtilService.fetchConfiguredCarrierService(payload)
  
          if(!hasError(resp) && resp.data?.docs?.length) {
            if(this.carrierConfiguration[partyId]) {
              this.carrierConfiguration[partyId]["manifests"] = resp.data.docs
            } else {
              this.carrierConfiguration[partyId] = {
                ["manifests"]: resp.data.docs
              }
            }
          }
        } catch(err) {
          logger.error("Failed to fetch carrier manifest information", err)
        }
      }
    },
    async openHistoricalManifestModal() {
      const modal = await modalController.create({
        component: HistoricalManifestModal,
        componentProps: {
          selectedCarrierPartyId: this.selectedCarrierPartyId,
          carrierConfiguration: this.carrierConfiguration
        }
      })

      modal.present();
    },
    async generateCarrierManifest() {
      this.isGeneratingManifest = true;
      const payload = {
        facilityId: this.currentFacility?.facilityId,
        carrierPartyId: this.selectedCarrierPartyId,
        manifestGenerateServiceName: this.carrierConfiguration[this.selectedCarrierPartyId]?.["MANIFEST_GEN_REQUEST"]
      }

      try {
        await UtilService.generateManifest(payload);
        showToast(translate("Manifest has been generated successfully"))
        // Fetch the latest manifest information once the manifest is generated successfully
        await this.fetchCarrierManifestInformation([this.selectedCarrierPartyId])
      } catch(err) {
        logger.error("Failed to generate manifest", err)
        showToast(translate("Failed to generate manifest"))
      }
      this.isGeneratingManifest = false;
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentEComStore: any = computed(() => userStore.getCurrentEComStore)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      Actions,
      caretDownOutline,
      chevronUpOutline,
      copyToClipboard,
      checkmarkDoneOutline,
      cubeOutline,
      currentEComStore,
      currentFacility,
      downloadOutline,
      ellipsisVerticalOutline,
      formatUtcDate,
      getFeatures,
      getFacilityFilter,
      getProductIdentificationValue,
      gift,
      giftOutline,
      hasActiveFilters,
      hasPermission,
      isKit,
      listOutline,
      optionsOutline,
      pricetagOutline,
      productIdentificationPref,
      printOutline,
      retryShippingLabel,
      router,
      store,
      timeOutline,
      translate
    }
  }
});
</script>