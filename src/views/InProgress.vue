<template>
  <ion-page>
    <ViewSizeSelector content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-menu-button menu="start" slot="start" />
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ viewSize }} {{("of")}} {{ inProgressOrders.total }} {{ $t("orders") }}</ion-title>

        <ion-buttons slot="end">
          <ion-menu-button menu="end">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="view-size-selector">
      <div v-if="inProgressOrders.total">
        <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; fetchInProgressOrders()"/>

        <!-- TODO: make pickers information dynamic -->
        <div class="filters">
          <ion-item lines="none">
            <ion-checkbox slot="start"/>
            <ion-label>
              John
              <p>2:30 PM</p>
            </ion-label>
            <ion-icon :icon="printOutline" />
          </ion-item>
          <ion-item lines="none">
            <ion-checkbox slot="start"/>
            <ion-label>
              Aaron
              <p>2:04 PM</p>
            </ion-label>
            <ion-icon :icon="printOutline" />
          </ion-item>
        </div>

        <ion-button expand="block" class="desktop-only" fill="outline" @click="packOrders()">{{ $t("Pack orders") }}</ion-button>

        <ion-card v-for="(order, index) in inProgressOrders.list" :key="index">
          <div class="card-header">
            <div class="order-primary-info">
              <ion-label>
                {{ order.doclist.docs[0].customerName }}
                <p>{{ $t("Ordered") }} {{ formatUtcDate(order.doclist.docs[0].orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
              </ion-label>
            </div>

            <div class="order-tags">
              <ion-chip outline>
                <ion-icon :icon="pricetagOutline" />
                <ion-label>{{ order.doclist.docs[0].orderId }}</ion-label>
              </ion-chip>
            </div>

            <div class="order-metadata">
              <!-- TODO: add brokered date-->
              <ion-label>
                {{ order.doclist.docs[0].shipmentMethodTypeDesc }}
                <!-- <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p> -->
              </ion-label>
            </div>
          </div>

          <!-- TODO: implement functionality to add new boxes and change its type -->
          <div class="box-type desktop-only">
            <ion-button fill="outline"><ion-icon :icon="addOutline" />{{ $t("Add Box") }}</ion-button>
            <ion-chip> Box A | Type 3</ion-chip>
          </div>

          <div v-for="(item, index) in order.doclist.docs" :key="index" class="order-item">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail>
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
              <ion-segment @ionChange="segmentChanged($event, item)" :value="item.segmentSelected">
                <ion-segment-button value="pack">
                  <ion-label>{{ $t("Ready to pack") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="issue">
                  <ion-label>{{ $t("Report an issue") }}</ion-label>
                </ion-segment-button>
              </ion-segment>
              <div class="segments">
                <!-- TODO: add functionality to update box type -->
                <div v-if="item.segmentSelected === 'pack'">
                  <ion-item lines="none">
                    <ion-label>{{ $t("Select box") }}</ion-label>
                    <ion-select value="box1">
                      <ion-select-option value="box1">Box A Type 3</ion-select-option>
                      <ion-select-option value="box2">Box B Type 2</ion-select-option>
                    </ion-select>
                  </ion-item>
                </div>
                <div v-if="item.segmentSelected === 'issue'">
                  <ion-item lines="none">
                    <ion-label>{{ $t("Select issue") }}</ion-label>
                    <ion-select @ionChange="updateRejectReason($event, item)" :value="item.rejectReason" >
                      <ion-select-option v-for="reason in unfillableReason" :key="reason.id" :value="reason.id">{{ $t(reason.label) }}</ion-select-option>
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
              <ion-button @click="packOrder(order)">{{ $t("Pack") }}</ion-button>
              <ion-button fill="outline" @click="save(order)">{{ $t("Save") }}</ion-button>
            </div>
          </div>
        </ion-card>

        <ion-fab class="mobile-only" vertical="bottom" horizontal="end">
          <ion-fab-button @click="packOrders()">
            <ion-icon :icon="checkmarkDoneOutline" />
          </ion-fab-button>
        </ion-fab>
      </div>
      <div v-else>{{ currentFacility.name }} {{ $t(" doesn't have any orders in progress right now.") }} </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonCard, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonItem, IonIcon, IonLabel, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToolbar, alertController, popoverController } from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { printOutline, addOutline, ellipsisVerticalOutline, checkmarkDoneOutline, pricetagOutline, optionsOutline } from 'ionicons/icons'
import Popover from "@/views/PackagingPopover.vue";
import { mapGetters, useStore } from 'vuex';
import { formatUtcDate, getFeature, hasError, showToast } from '@/utils';
import Image from '@/components/Image.vue'
import ViewSizeSelector from '@/components/ViewSizeSelector.vue';
import { OrderService } from '@/services/OrderService';
import emitter from '@/event-bus';
import { translate } from '@/i18n';

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
      viewSize: 'util/getViewSize'
    })
  },
  data() {
    return {
      queryString: '',
      unfillableReason: JSON.parse(process.env.VUE_APP_UNFILLABLE_REASONS)
    }
  },
  methods: {
    segmentChanged(ev: CustomEvent, item: any) {
      // when selecting the report segment for the first time defining the value for rejectReason,
      // as in current flow once moving to reject segment we can't pack an order
      if(ev.detail.value === 'issue' && !item.rejectReason) {
        item.rejectReason = ''
      }

      item.segmentSelected = ev.detail.value;
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
      // TODO: implement support to print shipping labels and packing slip
      const params = {
        'picklistBinId': order.doclist.docs[0].picklistBinId,
        'orderId': order.doclist.docs[0].orderId
      }

      emitter.emit('presentLoader');

      try {
        const resp = await OrderService.packOrder(params);
        if (resp.status === 200 && !hasError(resp)) {
          showToast(translate('Order packed successfully'));
          // TODO: handle the case of fetching in progress orders after packing an order
          // when packing an order the API runs too fast and the solr index does not update resulting in having the current packed order in the inProgress section
          this.fetchInProgressOrders();
        } else {
          showToast(translate('Failed to pack order'))
          console.error('error', resp)
        }
      } catch (err) {
        showToast(translate('Failed to pack order'))
        console.error(err)
      }
      emitter.emit('dismissLoader');
    },
    async packOrders() {
      const alert = await alertController
        .create({
          header: this.$t("Pack orders"),
          message: this.$t("You are packing orders. Select additional documents that you would like to print.", {count: this.inProgressOrders.list.length, space: '<br /><br />'}),
          buttons: [{
            text: this.$t("Cancel"),
            role: 'cancel'
          }, {
            text: this.$t("Pack"),
            role: 'confirm',
            handler: async () => {
              emitter.emit('presentLoader');

              const shipmentIds = this.inProgressOrders.list.map((order: any) => order.doclist.docs[0].shipmentId)

              try {
                const resp = await OrderService.packOrders({
                  shipmentIds
                });
                if (resp.status === 200 && !hasError(resp)) {
                  showToast(translate('Orders packed successfully'));
                  // TODO: handle the case of fetching in progress orders after packing multiple orders
                  // when packing multiple orders the API runs too fast and the solr index does not update resulting in having the packed orders in the inProgress section
                  this.fetchInProgressOrders();
                } else {
                  showToast(translate('Failed to pack orders'))
                  console.error('error', resp)
                }
              } catch (err) {
                showToast(translate('Failed to pack orders'))
                console.error(err)
              }
              emitter.emit('dismissLoader');
            }
          }]
        });
      return alert.present();
    },
    async reportIssue(itemsToReject: any, outOfStockItem?: any) {
      // TODO: update alert message when itemsToReject contains a single item and also in some specific conditions
      let message;
      if(!outOfStockItem) {
        message = this.$t('Are you sure you want to perform this action?')
      } else {
        const productName = outOfStockItem.productName

        // TODO: ordersCount is not correct as current we are identifying orders count by only checking items visible on UI and not other orders
        const ordersCount = this.inProgressOrders.list.map((order: any) => order.doclist.docs.filter((item: any) => item.productSku === outOfStockItem.productSku))?.filter((item: any) => item.length).length

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
            handler: async () => {
              const payload = {
                'orderId': itemsToReject[0].orderId
              }
              const responses = [];

              // https://blog.devgenius.io/using-async-await-in-a-foreach-loop-you-cant-c174b31999bd
              // The forEach, map, reduce loops are not built to work with asynchronous callback functions.
              // It doesn't wait for the promise of an iteration to be resolved before it goes on to the next iteration.
              // We could use either the for…of the loop or the for(let i = 0;….)
              for (const item of itemsToReject) {
                const params = {
                  ...payload,
                  'rejectReason': item.rejectReason,
                  'facilityId': item.facilityId,
                  'orderItemSeqId': item.orderItemSeqId,
                  'shipmentMethodTypeId': item.shipmentMethodTypeId,
                  'quantity': parseInt(item.itemQuantity)
                }
                const resp = await OrderService.rejectOrderItem({'payload': params});
                responses.push(resp);

                // TODO: add toast messages for success and failure case
              }
              return responses;
            },
          }],
        });
      return alert.present();
    },
    async fetchInProgressOrders () {
      const payload = {
        queryString: this.queryString
      } as any
      await this.store.dispatch('order/fetchInProgressOrders', payload)
    },
    save(order: any) {
      // added empty check as for 'No Reason' the value for issue will be empty string
      const itemsToReject = order.doclist.docs.filter((item: any) => item.rejectReason || item.rejectReason === '')

      // finding is there any item that is `out of stock` as we need to display the message conditionaly
      const outOfStockItem = itemsToReject.find((item: any) => item.rejectReason === 'NOT_IN_STOCK')

      if(itemsToReject.length) {
        this.reportIssue(itemsToReject, outOfStockItem);
      }      
    },
    updateRejectReason(ev: CustomEvent, item: any) {
      item.rejectReason = ev.detail.value;
    }
  },
  async mounted () {
    await this.fetchInProgressOrders();
  },
  setup() {
    const store = useStore();
    const segment = ref("pack");

    return {
      addOutline,
      printOutline,
      ellipsisVerticalOutline,
      optionsOutline,
      formatUtcDate,
      getFeature,
      checkmarkDoneOutline,
      pricetagOutline,
      segment,
      store
    }
  }
});
</script>

<style scoped>
.box-type {
  border-bottom: var(--border-medium);
}
</style>