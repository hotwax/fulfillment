<template>
  <ion-page>
    <ViewSizeSelector content-id="view-size-selector" />
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title v-if="!openOrders.total">{{ openOrders.total }} {{ $t('orders') }}</ion-title>
        <ion-title v-else>{{ openOrders.query.viewSize }} {{ $t('of') }} {{ openOrders.total }} {{ $t('orders') }}</ion-title>
     
        <ion-buttons slot="end">
          <ion-menu-button menu="end">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="view-size-selector">
      <ion-searchbar :value="openOrders.query.queryString" @keyup.enter="updateQueryString($event.target.value)"/>
      <div v-if="openOrders.total">
        <div class="filters">
          <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
            <ion-checkbox slot="start" @ionChange="updateSelectedShipmentMethods(method.val)"/>
            <ion-label>
              {{ method.val }}
              <p>{{ method.ordersCount }} {{ $t("orders") }}, {{ method.count }} {{ $t("items") }}</p>
            </ion-label>
          </ion-item>
        </div>

        <ion-button class="bulk-action desktop-only" fill="outline" size="large" @click="assignPickers">{{ $t("Print Picksheet") }}</ion-button>

        <ion-card class="order" v-for="(orders, index) in openOrders.list" :key="index">
          <div class="order-header">
            <div class="order-primary-info">
              <ion-label>
                {{ orders.doclist.docs[0].customerName }}
                <p>{{ $t("Ordered") }} {{ formatUtcDate(orders.doclist.docs[0].orderDate, 'dd MMMM yyyy t a ZZZZ') }}</p>
              </ion-label>
            </div>

            <div class="order-tags">
              <ion-chip outline>
                <ion-icon :icon="pricetagOutline" />
                <ion-label>{{ orders.doclist.docs[0].orderId }}</ion-label>
              </ion-chip>
              <ion-button fill="clear" class="mobile-only" color="danger">
                <ion-icon slot="icon-only" :icon="refreshCircleOutline" />
              </ion-button>
            </div>

            <div class="order-metadata">
              <ion-label>
                {{ orders.doclist.docs[0].shipmentMethodTypeDesc }}
                <!-- TODO: add support to display the last brokered date, currently not getting
                the date in API response -->
                <!-- <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p> -->
              </ion-label>
            </div>
          </div>

          <div v-for="order in orders.doclist.docs" :key="order">
            <div class="order-item">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <Image :src="getProduct(order.productId).mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ order.productSku }}</p>
                    {{ order.virtualProductName }}
                    <p>{{ getFeature(getProduct(order.productId).featureHierarchy, '1/COLOR/')}} {{ getFeature(getProduct(order.productId).featureHierarchy, '1/SIZE/')}}</p>
                  </ion-label>
                </ion-item>
              </div>
              <div class="product-metadata">
                <!-- TODO: display QOH in place of ATP -->
                <ion-note>{{ getProductStock(order.productId) }} {{ $t('pieces in stock') }}</ion-note>
              </div>
            </div>
          </div>

          <!-- TODO: add functionality to the buttons-->
          <!-- <div class="actions">
            <div class="positive-action"></div>
            <div class="negative-action">
              <ion-button fill="outline" color="danger">{{ $t("Recycle") }}</ion-button>
            </div>
          </div> -->
        </ion-card>

        <ion-fab class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="assignPickers">
            <ion-icon :icon="printOutline" />
          </ion-fab-button>
        </ion-fab>
      </div>
      <div class="empty-state" v-else>
        {{ currentFacility.name }}{{ $t(" doesn't have any outstanding orders right now.") }}
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonButton, 
  IonButtons, 
  IonCard, 
  IonChip, 
  IonCheckbox, 
  IonContent, 
  IonFab, 
  IonFabButton, 
  IonHeader, 
  IonLabel, 
  IonIcon, 
  IonItem, 
  IonMenuButton, 
  IonNote, 
  IonPage, 
  IonSearchbar, 
  IonThumbnail, 
  IonTitle, 
  IonToolbar, 
  modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { optionsOutline, pricetagOutline, printOutline, refreshCircleOutline } from 'ionicons/icons';
import AssignPickerModal from '@/views/AssignPickerModal.vue';
import { mapGetters, useStore } from 'vuex';
import Image from '@/components/Image.vue'
import { formatUtcDate, getFeature, hasError } from '@/utils'
import { UtilService } from '@/services/UtilService';
import { prepareOrderQuery } from '@/utils/solrHelper';
import ViewSizeSelector from '@/components/ViewSizeSelector.vue'
import emitter from '@/event-bus';

export default defineComponent({
  name: 'OpenOrders',
  components: {
    Image,
    IonButton,
    IonButtons,  
    IonCard,
    IonChip,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonLabel,
    IonIcon,
    IonItem,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSearchbar,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ViewSizeSelector
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      openOrders: 'order/getOpenOrders',
      getProduct: 'product/getProduct',
      getProductStock: 'stock/getProductStock',
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  data () {
    return {
      shipmentMethods: [] as Array<any>
    }
  },
  methods: {
    async updateSelectedShipmentMethods (method: string) {
      const openOrdersQuery = JSON.parse(JSON.stringify(this.openOrders.query))

      const selectedShipmentMethods = openOrdersQuery.selectedShipmentMethods
      const index = selectedShipmentMethods.indexOf(method)
      if (index < 0) {
        selectedShipmentMethods.push(method)
      } else {
        selectedShipmentMethods.splice(index, 1)
      }

      // making view size default when changing the shipment method to correctly fetch orders
      openOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      openOrdersQuery.selectedShipmentMethods = selectedShipmentMethods

      this.store.dispatch('order/updateOpenQuery', { ...openOrdersQuery })
    },
    async assignPickers() {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal
      });
      return assignPickerModal.present();
    },
    async findOpenOrders () {
      await this.store.dispatch('order/findOpenOrders')
    },
    async fetchShipmentMethods() {
      let resp: any;

      const payload = prepareOrderQuery({
        queryFields: 'orderId',
        viewSize: '0',  // passed viewSize as 0 to not fetch any data
        filters: {
          quantityNotAvailable: { value: 0 },
          isPicked: { value: 'N' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          '-fulfillmentStatus': { value: 'Cancelled' },
          orderStatusId: { value: 'ORDER_APPROVED' },
          orderTypeId: { value: 'SALES_ORDER' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId }
        },
        facet: {
          "shipmentMethodTypeIdFacet":{
            "excludeTags":"shipmentMethodTypeIdFilter",
            "field":"shipmentMethodTypeId",
            "mincount":1,
            "limit":-1,
            "sort":"index",
            "type":"terms",
            "facet": {
              "ordersCount": "unique(orderId)"
            }
          }
        }
      })

      try {
        resp = await UtilService.fetchShipmentMethods(payload);
        if(resp.status == 200 && !hasError(resp) && resp.data.facets?.count > 0) {
          this.shipmentMethods = resp.data.facets.shipmentMethodTypeIdFacet.buckets
        } else {
          console.error('Failed to fetch shipment methods')
        }
      } catch(err) {
        console.error('error', err)
      }
    },
    async updateQueryString(queryString: string) {
      const openOrdersQuery = JSON.parse(JSON.stringify(this.openOrders.query))

      openOrdersQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      openOrdersQuery.queryString = queryString
      await this.store.dispatch('order/updateOpenQuery', { ...openOrdersQuery })
    },
    async updateOrderQuery(size: any) {
      const openOrdersQuery = JSON.parse(JSON.stringify(this.openOrders.query))

      openOrdersQuery.viewSize = size
      await this.store.dispatch('order/updateOpenQuery', { ...openOrdersQuery })
    }
  },
  async mounted () {
    emitter.on('updateOrderQuery', this.updateOrderQuery)
    await Promise.all([this.findOpenOrders(), this.fetchShipmentMethods()]);
  },
  unmounted() {
    emitter.off('updateOrderQuery', this.updateOrderQuery)
  },
  setup() {
    const store = useStore();

    return{
      formatUtcDate,
      getFeature,
      optionsOutline,
      pricetagOutline,
      printOutline,
      refreshCircleOutline,
      store
    }
  }
});
</script>

<style scoped>
.order-tags{
  display: flex;
  justify-content: space-between;
}

@media (max-width: 991px) {
  .order-item {
    border-bottom: none;
  }
}
</style>