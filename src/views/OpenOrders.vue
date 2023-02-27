<template>
  <ion-page>
    <PicklistSize content-id="picklist-size" />
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title>{{ picklistSize }} {{ $t('of') }} {{ openOrders.total }} {{ $t('orders') }}</ion-title>
     
        <ion-buttons slot="end">
          <ion-menu-button menu="end">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="picklist-size">
      <div v-if="openOrders.total">
        <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; fetchOpenOrders()"/>
        <div class="filters">
          <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
            <ion-checkbox slot="start" @ionChange="updateSelectedShipmentMethods(method.val)"/>
            <ion-label>
              {{ method.val }}
              <p>{{ method.ordersCount }} {{ $t("orders") }}, {{ method.count }} {{ $t("items") }}</p>
            </ion-label>
          </ion-item>
        </div>

        <ion-button class="desktop-only" fill="outline" @click="assignPickers">{{ $t("Print Picksheet") }}</ion-button>

        <ion-card v-for="(orders, index) in openOrders.list" :key="index">
          <div class="card-header">
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
                  <ion-thumbnail>
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
      <div v-else>
        {{ currentFacility.name }}{{ $t(' doesn’t have any outstanding orders right now.') }}
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
import PicklistSize from '@/components/PicklistSize.vue';
import { formatUtcDate, getFeature, hasError } from '@/utils'
import { UtilService } from '@/services/UtilService';
import { prepareOrderQuery } from '@/utils/solrHelper';

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
    PicklistSize
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      openOrders: 'order/getOpenOrders',
      getProduct: 'product/getProduct',
      picklistSize: 'picklist/getPicklistSize',
      getProductStock: 'stock/getProductStock'
    })
  },
  data () {
    return {
      selectedShipmentMethod: [] as Array<string>,
      queryString: '',
      shipmentMethods: [] as Array<any>
    }
  },
  methods: {
    async updateSelectedShipmentMethods (method: string) {
      await this.store.dispatch('order/updateSelectedShipmentMethods', method)
    },
    async assignPickers() {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal
      });
      return assignPickerModal.present();
    },
    async fetchOpenOrders () {
      const payload = {
        queryString: this.queryString
      } as any

      console.log('in fetch orders')

      await this.store.dispatch('order/fetchOpenOrders', payload)
    },
    async fetchShipmentMethods() {
      let resp: any;

      const payload = prepareOrderQuery({
        queryFields: 'orderId',
        viewSize: 1,  // passed viewSize as 0 to not fetch any data
        filters: {
          quantityNotAvailable: { value: 0 },
          isPicked: { value: 'N' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          '-fulfillmentStatus': { value: 'Cancelled' },
          orderStatusId: { value: 'ORDER_APPROVED' },
          orderTypeId: { value: 'SALES_ORDER' },
          facilityId: { value: this.currentFacility.facilityId },
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
        if(resp.status == 200 && !hasError(resp) && resp.data.facets.count > 0) {
          this.shipmentMethods = resp.data.facets.shipmentMethodTypeIdFacet.buckets
        } else {
          console.error('Failed to fetch shipment methods')
        }
      } catch(err) {
        console.error('error', err)
      }
    }
  },
  async mounted () {
    await Promise.all([this.fetchOpenOrders(), this.fetchShipmentMethods()]);
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