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
            <ion-button fill="outline" slot="end" @click="printPicklist(picklist.id)"><ion-icon :icon="printOutline" /></ion-button>
          </ion-item>
        </div>

        <div class="results">
          <ion-button expand="block" class="bulk-action desktop-only" fill="outline" size="large" @click="packOrders()">{{ $t("Pack orders") }}</ion-button>

          <ion-card class="order" v-for="(order, index) in inProgressOrders.list" :key="index">
            <div class="order-header">
              <div class="order-primary-info">
                <ion-label>
                  {{ order.customerName }}
                  <p>{{ $t("Ordered") }} {{ formatUtcDate(order.orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
                </ion-label>
              </div>

              <div class="order-tags">
                <ion-chip outline>
                  <ion-icon :icon="pricetagOutline" />
                  <ion-label>{{ order.orderId }}</ion-label>
                </ion-chip>
              </div>

              <div class="order-metadata">
                <!-- TODO: add brokered date-->
                <ion-label>
                  {{ order.shipmentMethodTypeDesc }}
                  <!-- <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p> -->
                </ion-label>
              </div>
            </div>

            <!-- TODO: implement functionality to change the type of box -->
            <div class="box-type desktop-only">
              <ion-button @click="addShipmentBox(order)" fill="outline"><ion-icon :icon="addOutline" />{{ $t("Add Box") }}</ion-button>
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

              <div class="desktop-only">
                <ion-segment @ionChange="changeSegment($event, item, order)" :value="isIssueSegmentSelectedForItem(item) ? 'issue' : 'pack'">
                  <ion-segment-button value="pack">
                    <ion-label>{{ $t("Ready to pack") }}</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="issue">
                    <ion-label>{{ $t("Report an issue") }}</ion-label>
                  </ion-segment-button>
                </ion-segment>
                <div class="segments">
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
                        <ion-select-option v-for="reason in rejectReasons" :key="reason.enumCode" :value="reason.enumCode">{{ $t(reason.description) }}</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </div>
                </div>
              </div>

              <div class="product-metadata">
                <ion-note>{{ getProductStock(item.productId) }} {{ $t("pieces in stock") }}</ion-note>
              </div>
            </div>

            <div class="mobile-only">
              <ion-item>
                <ion-button fill="clear" @click="packOrder(order)">{{ $t("Pack using default packaging") }}</ion-button>
                <ion-button slot="end" fill="clear" color="medium" @click="packagingPopover">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </ion-item>
            </div>

            <div class="actions">
              <div>
                <ion-button :disabled="order.isModified" @click="packOrder(order)">{{ $t("Pack") }}</ion-button>
                <ion-button fill="outline" @click="save(order)">{{ $t("Save") }}</ion-button>
              </div>
            </div>
          </ion-card>
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
import { IonButton, IonButtons, IonCard, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonItem, IonIcon, IonLabel, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToolbar, alertController, popoverController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { printOutline, addOutline, ellipsisVerticalOutline, checkmarkDoneOutline, pricetagOutline, optionsOutline } from 'ionicons/icons'
import Popover from "@/views/PackagingPopover.vue";
import { mapGetters, useStore } from 'vuex';
import { formatUtcDate, getFeature, hasError, showToast } from '@/utils';
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
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
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
      getProductStock: 'stock/getProductStock',
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
    isIssueSegmentSelectedForItem(item: any) {
      return this.itemsIssueSegmentSelected.includes(`${item.orderId}-${item.orderItemSeqId}`)
    },
    changeSegment(ev: CustomEvent, item: any, order: any) {
      // when selecting the report segment for the first time defining the value for rejectReason,
      // as in current flow once moving to reject segment we can't pack an order
      if(ev.detail.value === 'issue' && !item.rejectReason) {
        item.rejectReason = this.rejectReasons[0].enumCode // setting the first reason as default
        order.isModified = true
      }

      const itemIndex = this.itemsIssueSegmentSelected.indexOf(`${item.orderId}-${item.orderItemSeqId}`)
      ev.detail.value === 'issue' ? this.itemsIssueSegmentSelected.push(`${item.orderId}-${item.orderItemSeqId}`) : this.itemsIssueSegmentSelected.splice(itemIndex, 1)
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

              if(data.includes('printPackingSlip')) {
                OrderService.printPackingSlip(order.shipmentIds)
              }

              if(data.includes('printShippingLabel')) {
                OrderService.printShippingLabel(order.shipmentIds)
              }

              try {
                const resp = await OrderService.packOrder(params);
                if (resp.status === 200 && !hasError(resp)) {
                  showToast(translate('Order packed successfully'));
                  // TODO: handle the case of fetching in progress orders after packing an order
                  // when packing an order the API runs too fast and the solr index does not update resulting in having the current packed order in the inProgress section
                  await Promise.all([this.fetchPickersInformation(), this.findInProgressOrders()])
                } else {
                  throw resp.data
                }
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

              const shipmentIds = this.inProgressOrders.list.map((order: any) => order.shipmentId)

              // TODO: need to check that do we need to pass all the shipmentIds for an order or just need to pass
              // the associated ids, currently passing the associated shipmentId
              if(data.includes('printPackingSlip')) {
                OrderService.printPackingSlip(shipmentIds)
              }

              if(data.includes('printShippingLabel')) {
                OrderService.printShippingLabel(shipmentIds)
              }

              try {
                const resp = await OrderService.packOrders({
                  shipmentIds
                });
                if (resp.status === 200 && !hasError(resp)) {
                  showToast(translate('Orders packed successfully'));
                  // TODO: handle the case of fetching in progress orders after packing multiple orders
                  // when packing multiple orders the API runs too fast and the solr index does not update resulting in having the packed orders in the inProgress section
                  await Promise.all([this.fetchPickersInformation(), this.findInProgressOrders()])
                } else {
                  throw resp.data
                }
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
        if(item.rejectReason) {
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
      const itemsToReject = order.items.filter((item: any) => item.rejectReason)

      if(itemsToReject.length) {
        this.reportIssue(order, itemsToReject);
        return;
      }

      this.updateOrder(order)
    },
    updateRejectReason(ev: CustomEvent, item: any, order: any) {
      item.rejectReason = ev.detail.value;
      order.isModified = true;
    },
    updateBox(ev: CustomEvent, item: any, order: any) {
      item.selectedBox = ev.detail.value;
      order.isModified = true;
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
                date: DateTime.fromMillis(picklist.picklistDate).toLocaleString(DateTime.TIME_SIMPLE)
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

      this.store.dispatch('order/updateInProgressQuery', { ...inProgressOrdersQuery })
    },
    async fetchShipmentRouteSegmentInformation(shipmentIds: Array<string>) {
      const payload = {
        "inpurFields": {
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
    async updateOrderQuery(size: any) {
      const inProgressOrdersQuery = JSON.parse(JSON.stringify(this.inProgressOrders.query))

      inProgressOrdersQuery.viewSize = size
      await this.store.dispatch('order/updateInProgressQuery', { ...inProgressOrdersQuery })
    },
    async printPicklist(picklistId: string) {
      await OrderService.printPicklist(picklistId)
    }
  },
  async mounted () {
    this.store.dispatch('util/fetchRejectReasons')
    await Promise.all([this.fetchPickersInformation(), this.findInProgressOrders()])
    emitter.on('updateOrderQuery', this.updateOrderQuery)
  },
  unmounted() {
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  setup() {
    const store = useStore();

    return {
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
</style>
