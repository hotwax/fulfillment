<template>
  <ion-page :fullscreen="true">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ picklistSize }} of {{ openOrders.total }} orders</ion-title>
        <ion-buttons  slot="end">
        <ion-menu-button>
          <ion-icon :icon="optionsOutline" />
        </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-searchbar />

      <div class="filters">
        <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
          <ion-checkbox slot="start" @ionChange="updateShipmentMethodArray(method.val)"/>
          <ion-label>
            {{ method.val }}
            <p>{{ method.ordersCount }} orders, {{ method.count }} items</p>
          </ion-label>
        </ion-item>
      </div>

      <ion-button class="desktop-only" fill="outline" @click="assignPickers">Print Picksheet</ion-button>

      <ion-card v-for="(orders, index) in openOrders.list" :key="index">
        <div class="card-header">
          <div class="order-primary-info">
            <ion-label>
              {{ orders.doclist.docs[0].customerName }}
              <p>Ordered {{ $filters.formatUtcDate(orders.doclist.docs[0].orderDate, 'YYYY-MM-DDTHH:mm:ssZ', 'Do MMMM YYYY LT z') }}</p>
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
              Next Day Shipping
              <p>Ordered 28th January 2020 2:32 PM EST</p>
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
                  {{ order.productName }}
                  <p>{{$filters.getFeature(getProduct(order.productId).featureHierarchy, '1/COLOR/')}} {{$filters.getFeature(getProduct(order.productId).featureHierarchy, '1/SIZE/')}}</p>
                </ion-label>
              </ion-item>
            </div>
            <div class="product-metadata">
              <ion-note>49 pieces in stock</ion-note>
            </div>
          </div>
        </div>

        <!-- TODO: add functionality to the buttons-->
        <div class="actions">  
          <div class="positive-action"></div>
          <div class="negative-action">
            <ion-button fill="outline" color="danger">Recycle</ion-button>
          </div>
        </div>
      </ion-card>

      <ion-fab class="mobile-only" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="assignPickers">
          <ion-icon :icon="printOutline" />
        </ion-fab-button>
      </ion-fab> 
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
    IonToolbar
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      openOrders: 'order/getOpenOrders',
      getProduct: 'product/getProduct',
      picklistSize: 'picklist/getPicklistSize',
      shipmentMethods: 'order/getShipmentMethods' 
    })
  },
  data () {
    return {
      selectedShipmentMethod: [] as Array<string>
    }
  },
  methods: {
    updateShipmentMethodArray (method: string) {
      const index = this.selectedShipmentMethod.indexOf(method)
      if (index < 0) {
        this.selectedShipmentMethod.push(method)
      } else {
        this.selectedShipmentMethod.splice(index)
      }
      this.fetchOpenOrders();
    },
    async assignPickers() {
      const bgjobmodal = await modalController.create({
        component: AssignPickerModal
      });
      return bgjobmodal.present();
    },
    async fetchOpenOrders (event?: any) {
      const arrays = this.selectedShipmentMethod.toString().replaceAll(",", " OR ")
      const viewSize = this.picklistSize
      const sortBy = ''
      const payload = {
        "json": {
          "params": {
            "rows": `${viewSize}`,
            "sort": `${sortBy ? sortBy:'reservedDatetime desc'}`,
            "group": true,
            "group.field": "orderId",
            "group.limit": 1000,
            "group.ngGroups": true
          },
          "query": "docType:OISGIR",
          "filter": ["orderTypeId: SALES_ORDER","orderStatusId:ORDER_APPROVED","-shipmentMethodTypeId : STOREPICKUP",`shipmentMethodTypeId : ${arrays ? arrays : "*" }`,"-picklistItemStatusId:PICKITEM_COMPLETED", `facilityId: ${this.currentFacility.facilityId}`],
          "fields": "",
          "facet": {
            "shipmentMethodTypeIdFacet":{
              "excludeTags":"shipmentMethodTypeIdFilter",
              "field":"shipmentMethodTypeId",
              "mincount":1,
              "limit":-1,
              "sort":"index",
              "type":"terms",
              "facet": {
                "ordersCount": "uniqueBlock(orderId)"
              }
            }
          }
        }
      }
      this.store.dispatch('order/fetchOpenOrders', payload).then((resp) => console.log(resp)).catch(err => console.log(err))
    }
  },
  mounted () {
    this.fetchOpenOrders();
  },
  watch: {
    // added a watcher in picklistSize to fetch the open orders whenever the size changes
    picklistSize () {
      this.fetchOpenOrders();
    }
  },
  setup() {
    const store = useStore();

    return{
      optionsOutline,
      pricetagOutline,
      printOutline,
      refreshCircleOutline,
      print,
      store
    }
  }
});
</script>

<style scoped>

.card-header {
  display: grid;
  grid: "tags"
        "info"
        "metadata"/ 1fr;
  justify-content: start;
  border-bottom: 1px solid black;        
}

.order-primary-info {
  grid-area: info;
}

.order-tags {
  grid-area: tags;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid black;
}

.order-metadata {
  grid-area: metadata;
}  

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}  

@media (min-width: 991px) {
  .card-header {
    grid: "info tags metadata" / max-content 1fr max-content;
    align-items: center;
  }

  .order-tags {
    justify-self: center;
    border-bottom: none;
  }

  .order-metadata {
    text-align: end;
  }

  .order-item {
    border-bottom: 1px solid black;
  }  
}
</style>