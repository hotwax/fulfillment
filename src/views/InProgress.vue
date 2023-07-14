<template>
  <ion-page>
    <ViewSizeSelector content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-menu-button menu="start" slot="start" />
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!inProgressOrders.total">{{ inProgressOrders.total }} {{ $t('orders') }}</ion-title>
        <ion-title v-else>{{ inProgressOrders.query.viewSize }} {{ $t('of') }} {{ inProgressOrders.total }} {{ $t('orders') }}</ion-title>

        <ion-buttons slot="end">
          <ion-menu-button menu="end" :disabled="!inProgressOrders.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="view-size-selector">
      <ion-searchbar v-model="inProgressOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)"/>
      <div v-if="inProgressOrders.total">
        <div class="filters">
          <ion-item v-for="picklist in picklists" :key="picklist.id" lines="none">
            <ion-checkbox :checked="inProgressOrders.query.selectedPicklists.includes(picklist.id)" slot="start" @ion-change="updateSelectedPicklists(picklist.id)"/>
            <ion-label class="ion-text-wrap">
              {{ picklist.pickersName }}
              <p>{{ picklist.date }}</p>
            </ion-label>
            <ion-spinner color="primary" slot="end" v-if="picklist.isGeneratingPicklist" name="crescent" />
            <ion-button v-else fill="outline" slot="end" @click="printPicklist(picklist)">
              <ion-icon :icon="printOutline" />
            </ion-button>
          </ion-item>
        </div>

        <div class="results">
          <ion-button expand="block" class="bulk-action desktop-only" fill="outline" size="large" @click="packOrders()">{{ $t("Pack orders") }}</ion-button>

          <ion-card class="order" v-for="(order, index) in getInProgressOrders()" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  {{ order.customerName }}
                  <p>{{ $t("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>

              <div class="order-tags">
                <ion-chip @click="copyToClipboard(order.orderName, 'Copied to clipboard')" outline>
                  <ion-icon :icon="pricetagOutline" />
                  <ion-label>{{ order.orderName }}</ion-label>
                </ion-chip>
              </div>

              <div class="order-metadata">
                <ion-label>
                  {{ order.shipmentMethodTypeDesc }}
                  <p v-if="order.reservedDatetime">{{ $t("Last brokered") }} {{ formatUtcDate(order.reservedDatetime, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>
            </div>

            <div class="box-type desktop-only" v-if="!order.shipmentPackages && !order.hasMissingInfo">
              <ion-skeleton-text animated />
              <ion-skeleton-text animated />
            </div>
            <!-- TODO: implement functionality to change the type of box -->
            <div class="box-type desktop-only"  v-else-if="order.shipmentPackages">
              <ion-button @click="addShipmentBox(order)" fill="outline" shape="round" size="small"><ion-icon :icon="addOutline" />{{ $t("Add Box") }}</ion-button>
              <ion-chip v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId">{{ getShipmentPackageNameAndType(shipmentPackage, order) }}</ion-chip>
            </div>

            <div v-for="(item, index) in order.items" :key="index" class="order-item">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <Image :src="getProduct(item.productId).mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ item.productSku }}</p>
                    {{ item.productName }}
                    <p>{{ getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')}}</p>
                  </ion-label>
                </ion-item>
              </div>

              <div class="desktop-only" v-if="!order.shipmentPackages && !order.hasMissingInfo">
                <ion-segment>
                  <ion-segment-button><ion-skeleton-text animated /></ion-segment-button>
                  <ion-segment-button><ion-skeleton-text animated /></ion-segment-button>
                </ion-segment>
                <div class="segments">
                  <ion-item lines="none">
                    <ion-skeleton-text animated />
                  </ion-item>
                </div>
              </div>
              <div class="desktop-only" v-else-if="order.shipmentPackages">
                <ion-segment @ionChange="changeSegment($event, item, order)" :value="isIssueSegmentSelectedForItem(item) ? 'issue' : 'pack'">
                  <ion-segment-button value="pack">
                    <ion-label>{{ $t("Ready to pack") }}</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="issue">
                    <ion-label>{{ $t("Report an issue") }}</ion-label>
                  </ion-segment-button>
                </ion-segment>
                <!-- Check to not call the segment change method autocatically as initially the data is not available and thus ionChange event is called when data is populated -->
                <div class="segments" v-if="order.shipmentPackages && order.shipmentPackages.length">
                  <!-- TODO: add functionality to update box type -->
                  <div v-if="!isIssueSegmentSelectedForItem(item)">
                    <ion-item lines="none">
                      <ion-label>{{ $t("Select box") }}</ion-label>
                      <ion-select interface="popover" @ionChange="updateBox($event, item, order)" :value="item.selectedBox">
                        <ion-select-option v-for="shipmentPackage in order.shipmentPackages" :key="shipmentPackage.shipmentId" :value="shipmentPackage.packageName">{{ shipmentPackage.packageName }}</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </div>
                  <div v-else>
                    <ion-item lines="none">
                      <ion-label>{{ $t("Select issue") }}</ion-label>
                      <ion-select interface="popover" @ionChange="updateRejectReason($event, item, order)" :value="item.rejectReason" >
                        <ion-select-option v-for="reason in rejectReasons" :key="reason.enumId" :value="reason.enumId">{{ reason.description ? $t(reason.description) : reason.enumId }}</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </div>
                </div>
              </div>

            </div>

            <div class="mobile-only">
              <ion-item>
                <ion-button fill="clear"  :disabled="order.isModified || order.hasMissingInfo" @click="packOrder(order)">{{ $t("Pack using default packaging") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click="packagingPopover">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <div class="actions">
              <div>
                <ion-button :disabled="order.hasRejectedItem || order.isModified || order.hasMissingInfo" @click="packOrder(order)">{{ $t("Pack") }}</ion-button>
                <ion-button :disabled="order.hasMissingInfo" fill="outline" @click="save(order)">{{ $t("Save") }}</ion-button>
              </div>
            </div>
          </ion-card>
          <ion-infinite-scroll @ionInfinite="loadMoreInProgressOrders($event)" threshold="100px" :disabled="!isInProgressOrderScrollable()">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
          </ion-infinite-scroll>
        </div>
      </div>
      <ion-fab v-if="inProgressOrders.total" class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="packOrders()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
      <div class="empty-state" v-else>{{ currentFacility.name }} {{ $t(" doesn't have any orders in progress right now.") }} </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCheckbox,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonItem,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  popoverController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { printOutline, addOutline, ellipsisVerticalOutline, checkmarkDoneOutline, pricetagOutline, optionsOutline } from 'ionicons/icons'
import Popover from "@/views/PackagingPopover.vue";
import { mapGetters, useStore } from 'vuex';
import { copyToClipboard, formatUtcDate, getFeature, showToast } from '@/utils';
import { hasError } from '@/adapter';
import Image from '@/components/Image.vue'
import ViewSizeSelector from '@/components/ViewSizeSelector.vue';
import { OrderService } from '@/services/OrderService';
import emitter from '@/event-bus';
import { translate } from '@/i18n';
import { prepareOrderQuery } from '@/utils/solrHelper';
import { UtilService } from '@/services/UtilService';
import { DateTime } from 'luxon';
import logger from '@/logger';

export default defineComponent({
  name: 'InProgress',
  components: {
    Image,
    IonButton,
    IonButtons,
    IonCard,
    IonCheckbox,
    IonChip,  
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonItem,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
    IonSpinner,
    IonThumbnail,   
    IonTitle,
    IonToolbar,
    ViewSizeSelector
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      inProgressOrders: 'order/getInProgressOrders',
      getProduct: 'product/getProduct',
      rejectReasons: 'util/getRejectReasons',
      currentEComStore: 'user/getCurrentEComStore',
      userPreference: 'user/getUserPreference'
    })
  },
  data() {
    return {
      picklists: [] as any,
      defaultShipmentBoxType: '',
      itemsIssueSegmentSelected: [] as any,
    }
  },
  methods: {
    getInProgressOrders() {
      return JSON.parse(JSON.stringify(this.inProgressOrders.list)).splice(0, (this.inProgressOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any) );
    },
    isIssueSegmentSelectedForItem(item: any) {
      return this.itemsIssueSegmentSelected.includes(`${item.orderId}-${item.orderItemSeqId}`)
    },
    async changeSegment(ev: CustomEvent, item: any, order: any) {
      // when selecting the report segment for the first time defining the value for rejectReason,
      // as in current flow once moving to reject segment we can't pack an order
      if(ev.detail.value === 'issue') {
        item.rejectReason = this.rejectReasons[0].enumId // setting the first reason as default
        order.hasRejectedItem = true
        this.itemsIssueSegmentSelected.push(`${item.orderId}-${item.orderItemSeqId}`)
      } else {
        delete item.rejectReason
        order.hasRejectedItem = order.items.some((item: any) => item.rejectReason)
        const itemIndex = this.itemsIssueSegmentSelected.indexOf(`${item.orderId}-${item.orderItemSeqId}`)
        this.itemsIssueSegmentSelected.splice(itemIndex, 1)
      }
      await this.store.dispatch('order/updateInProgressOrder', order)
    },
    async packagingPopover(ev: Event) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
    async packOrder(order: any) {
      const confirmPackOrder = await alertController
        .create({
          header: this.$t("Pack order"),
          message: this.$t("You are packing an order. Select additional documents that you would like to print.", {space: '<br /><br />'}),
          inputs: [{
            name: 'printShippingLabel',
            type: 'checkbox',
            label: this.$t('Shipping labels'),
            value: 'printShippingLabel',
            checked: this.userPreference.printShippingLabel,
          }, {
            name: 'printPackingSlip',
            type: 'checkbox',
            label: this.$t('Packing slip'),
            value: 'printPackingSlip',
            checked: this.userPreference.printPackingSlip
          }],
          buttons: [{
            text: this.$t("Cancel"),
            role: 'cancel'
          }, {
            text: this.$t("Pack"),
            role: 'confirm',
            handler: async (data) => {
              const params = {
                'picklistBinId': order.picklistBinId,
                'orderId': order.orderId
              }

              emitter.emit('presentLoader');
              try {
                const resp = await OrderService.packOrder(params);
                if (resp.status === 200 && !hasError(resp)) {
                  showToast(translate('Order packed successfully'));
                } else {
                  throw resp.data
                }
                if (data.includes('printPackingSlip') && data.includes('printShippingLabel')) {
                  await OrderService.printShippingLabelAndPackingSlip(order.shipmentIds)
                } else if(data.includes('printPackingSlip')) {
                  await OrderService.printPackingSlip(order.shipmentIds)
                } else if(data.includes('printShippingLabel')) {
                  await OrderService.printShippingLabel(order.shipmentIds)
                }
                // TODO: handle the case of fetching in progress orders after packing an order
                // when packing an order the API runs too fast and the solr index does not update resulting in having the current packed order in the inProgress section
                await Promise.all([this.fetchPickersInformation(), this.updateOrderQuery()]);
              } catch (err) {
                showToast(translate('Failed to pack order'))
                logger.error('Failed to pack order', err)
              }

              emitter.emit('dismissLoader');
            }
          }]
        });
      return confirmPackOrder.present();
    },
    async packOrders() {
      const alert = await alertController
        .create({
          header: this.$t("Pack orders"),
          message: this.$t("You are packing orders. Select additional documents that you would like to print.", {count: this.inProgressOrders.list.length, space: '<br /><br />'}),
          inputs: [{
            name: 'printShippingLabel',
            type: 'checkbox',
            label: this.$t('Shipping labels'),
            value: 'printShippingLabel',
            checked: this.userPreference.printShippingLabel,
          }, {
            name: 'printPackingSlip',
            type: 'checkbox',
            label: this.$t('Packing slip'),
            value: 'printPackingSlip',
            checked: this.userPreference.printPackingSlip
          }],
          buttons: [{
            text: this.$t("Cancel"),
            role: 'cancel'
          }, {
            text: this.$t("Pack"),
            role: 'confirm',
            handler: async (data) => {
              emitter.emit('presentLoader');
              let orderList = JSON.parse(JSON.stringify(this.inProgressOrders.list))
              // fetch related shipmentIds when missing
              if (this.isInProgressOrderScrollable()) {
                const remainingOrderIndex = (this.inProgressOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any);
                const shipmentIdsForOrders = await this.fetchOrderShipmentIds(orderList.slice(remainingOrderIndex));
                orderList = orderList.map((order: any) => {
                  // if for an order shipment information is not available then returning the same order information again
                  if(shipmentIdsForOrders[order.orderId]) {
                    order.shipmentIds = shipmentIdsForOrders[order.orderId];
                  }
                  return order;
                });
              }

              // Considering only unique shipment IDs
              // TODO check reason for redundant shipment IDs
              const shipmentIds = [...new Set(orderList.map((order: any) => order.shipmentIds).flat())] as Array<string>

              try {
                const resp = await OrderService.packOrders({
                  shipmentIds
                });
                if (resp.status === 200 && !hasError(resp)) {
                  showToast(translate('Orders packed successfully'));
                } else {
                  throw resp.data
                }
                // TODO: need to check that do we need to pass all the shipmentIds for an order or just need to pass
                // the associated ids, currently passing the associated shipmentId
                if (data.includes('printPackingSlip') && data.includes('printShippingLabel')) {
                  await OrderService.printShippingLabelAndPackingSlip(shipmentIds)
                } else if(data.includes('printPackingSlip')) {
                  await OrderService.printPackingSlip(shipmentIds)
                } else if(data.includes('printShippingLabel')) {
                  await OrderService.printShippingLabel(shipmentIds)
                }
                  // TODO: handle the case of fetching in progress orders after packing multiple orders
                  // when packing multiple orders the API runs too fast and the solr index does not update resulting in having the packed orders in the inProgress section
                await Promise.all([this.fetchPickersInformation(), this.updateOrderQuery()])
              } catch (err) {
                showToast(translate('Failed to pack orders'))
                logger.error('Failed to pack orders', err)
              }
              emitter.emit('dismissLoader');
            }
          }]
        });
      return alert.present();
    },
    async fetchOrderShipmentIds(orderList: any) {
      // Implemented logic to fetch in batches
      const batchSize = 50;
      const clonedOrderList = JSON.parse(JSON.stringify(orderList));
      const requestParams = [];
      while(clonedOrderList.length) {
        const picklistBinIds: Array<string> = [];
        const orderIds: Array<string> = [];
        // splitting the orders in batches to fetch the additional orders information
        const orders = clonedOrderList.splice(0, batchSize);

        orders.map((order: any) => {
          picklistBinIds.push(order.picklistBinId)
          orderIds.push(order.orderId)
        })
        requestParams.push({ picklistBinIds, orderIds })
      }
      // TODO Handle error case
      const shipmentIdResps = await Promise.all(requestParams.map((params) => UtilService.findShipmentIdsForOrders(params.picklistBinIds, params.orderIds)))
      return Object.assign({}, ...shipmentIdResps)
    },
    async reportIssue(order: any, itemsToReject: any) {
      // finding is there any item that is `out of stock` as we need to display the message accordingly
      const outOfStockItem = itemsToReject.find((item: any) => item.rejectReason === 'NOT_IN_STOCK')

      // TODO: update alert message when itemsToReject contains a single item and also in some specific conditions
      let message;
      if(!outOfStockItem) {
        message = this.$t('Are you sure you want to perform this action?')
      } else {
        const productName = outOfStockItem.productName

        // TODO: ordersCount is not correct as current we are identifying orders count by only checking items visible on UI and not other orders
        const ordersCount = this.inProgressOrders.list.map((order: any) => order.items.filter((item: any) => item.productSku === outOfStockItem.productSku))?.filter((item: any) => item.length).length

        // displaying product count decrement by 1 as we are displaying one product sku directly.
        message = this.$t(", and other products are identified as unfulfillable. other orders containing these products will be unassigned from this store and sent to be rebrokered.", {productName, products: itemsToReject.length - 1, space: '<br /><br />', orders: ordersCount})
      }
      const alert = await alertController
        .create({
          header: this.$t("Report an issue"),
          message,
          buttons: [{
            text: this.$t("Cancel"),
            role: 'cancel'
          }, {
            text: this.$t("Report"),
            role: 'confirm',
            handler: async() => {
              await this.updateOrder(order);
            }
          }]
        });
      
      return alert.present();
    },
    async findInProgressOrders () {
      // assigning with empty array, as when we are updating(save) an order and if for one of the items issue segment
      // was selected before update making pack button disabled, then after update pack button is still disabled for that order
      this.itemsIssueSegmentSelected = []
      await this.store.dispatch('order/findInProgressOrders')
    },
    async updateOrder(order: any) {
      const form = new FormData()

      form.append('facilityId', this.currentFacility.facilityId)

      order.items.map((item: any, index: number) => {
        const shipmentPackage = order.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.packageName === item.selectedBox)

        let prefix = 'rtp'
        if(this.isIssueSegmentSelectedForItem(item)) {
          prefix = 'rej'
          form.append(`${prefix}_rejectionReason_${index}`, item.rejectReason)
        } else {
          form.append(`${prefix}_newShipmentId_${index}`, shipmentPackage.shipmentId)
        }

        form.append(`box_shipmentId_${index}`, item.shipmentId)
        form.append(`${index}_box_rowSubmit`, ''+index)
        form.append(`box_shipmentBoxTypeId_${index}`, order.shipmentBoxTypeByCarrierParty[shipmentPackage.carrierPartyId][0])
        form.append(`${prefix}_shipmentId_${index}`, item.shipmentId)
        form.append(`${prefix}_shipmentItemSeqId_${index}`, item.shipmentItemSeqId)
        form.append(`${index}_${prefix}_rowSubmit_`, ''+index)
      })

      try {
        const resp = await OrderService.updateOrder({
          headers: {
            'Content-Type': 'multipart/form-data;'
          },
          data: form
        })

        if(!hasError(resp)) {
          if (order.hasRejectedItem) {
            this.updateOrderQuery()
          } else {
            order.isModified = false;
            await this.store.dispatch('order/updateInProgressOrder', order)
          }
          showToast(translate('Order updated successfully'))
        } else {
          throw resp.data;
        }
      } catch (err) {
        showToast(translate('Failed to update order'))
        logger.error('Failed to update order', err)
      }
    },
    save(order: any) {
      if(order.hasRejectedItem) {
      const itemsToReject = order.items.filter((item: any) => item.rejectReason)
        this.reportIssue(order, itemsToReject);
        return;
      }
      this.updateOrder(order);
    },
    updateRejectReason(ev: CustomEvent, item: any, order: any) {
      item.rejectReason = ev.detail.value;
      this.store.dispatch('order/updateInProgressOrder', order)
    },
    updateBox(ev: CustomEvent, item: any, order: any) {
      item.selectedBox = ev.detail.value;
      order.isModified = true;
      this.store.dispatch('order/updateInProgressOrder', order)
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

          if(picklistResp.status == 200 && !hasError(picklistResp) && picklistResp.data.count > 0) {
            this.picklists = picklistResp.data.docs.reduce((picklists: any, picklist: any) => {
              const pickersInformation = buckets.find((bucket: any) => picklist.picklistId == bucket.val)

              if(pickersInformation.count == 0) {
                return picklists;
              }

              // if firstName is not found then adding default name `System Generated`
              const pickersName = pickersInformation.pickerFacet.buckets.length ? pickersInformation.pickerFacet.buckets.reduce((pickers: Array<string>, picker: any) => {
                pickers.push(picker.val.split('/')[1].split(' ')[0]) // having picker val in format 10001/FirstName LastName, we only need to display firstName
                return pickers
              }, []) : ['System Generated']

              picklists.push({
                id: picklist.picklistId,
                pickersName: pickersName.join(', '),
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
    async loadMoreInProgressOrders(event: any) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))
      inProgressOrdersQuery.viewIndex++;
      await this.store.dispatch('order/updateInProgressIndex', { ...inProgressOrdersQuery })
      event.target.complete();
    },
    isInProgressOrderScrollable() {
      return ((this.inProgressOrders.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) <  this.inProgressOrders.query.viewSize;
    },
    async updateSelectedPicklists(id: string) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))
      const selectedPicklists = inProgressOrdersQuery.selectedPicklists

      if(selectedPicklists.includes(id)) {
        selectedPicklists.splice(selectedPicklists.indexOf(id), 1)
      } else {
        selectedPicklists.push(id)
      }

      // making view size default when changing the shipment method to correctly fetch orders
      inProgressOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      inProgressOrdersQuery.selectedPicklists = selectedPicklists
      inProgressOrdersQuery.viewIndex = 0

      this.store.dispatch('order/updateInProgressQuery', { ...inProgressOrdersQuery })
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
    async addShipmentBox(order: any) {
      if(order.isAddingBox) {
        return;
      }

      // changing the flag to know that process to add the box is in process
      order.isAddingBox = true;

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
          // TODO: only update the order in which the box is added instead of fetching all the inProgress orders
          await Promise.all([this.fetchPickersInformation(), this.findInProgressOrders()])
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Failed to add box'))
        logger.error('Failed to add box', err)
      }

      order.isAddingBox = false;  // setting the value again to default once the box adding process is completed
    },
    getShipmentPackageNameAndType(shipmentPackage: any, order: any) {
      // TODO
      return order.shipmentBoxTypeByCarrierParty[shipmentPackage.carrierPartyId] ? `Box ${shipmentPackage.packageName} | ${order.shipmentBoxTypeByCarrierParty[shipmentPackage.carrierPartyId][0]}` : ''
    },
    async updateQueryString(queryString: string) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))

      inProgressOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      inProgressOrdersQuery.queryString = queryString
      await this.store.dispatch('order/updateInProgressQuery', { ...inProgressOrdersQuery })
    },
    async updateOrderQuery(size?: any, queryString?: any) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))

      size && (inProgressOrdersQuery.viewSize = size)
      queryString && (inProgressOrdersQuery.queryString = '')
      inProgressOrdersQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      await this.store.dispatch('order/updateInProgressQuery', { ...inProgressOrdersQuery })
    },
    async initialiseOrderQuery() {
      await this.updateOrderQuery(process.env.VUE_APP_VIEW_SIZE, '')
    },
    async printPicklist(picklist: any) {
      picklist.isGeneratingPicklist = true;
      await OrderService.printPicklist(picklist.id)
      picklist.isGeneratingPicklist = false;
    }
  },
  async mounted () {
    this.store.dispatch('util/fetchRejectReasons')
    await Promise.all([this.fetchPickersInformation(), this.initialiseOrderQuery()])
    emitter.on('updateOrderQuery', this.updateOrderQuery)
  },
  unmounted() {
    this.store.dispatch('order/clearInProgressOrders')
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  setup() {
    const store = useStore();

    return {
      copyToClipboard,
      addOutline,
      printOutline,
      ellipsisVerticalOutline,
      optionsOutline,
      formatUtcDate,
      getFeature,
      checkmarkDoneOutline,
      pricetagOutline,
      store
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
</style>
