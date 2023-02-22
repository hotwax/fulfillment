<template>
  <ion-page :fullscreen="true">
    <PicklistSize content-id="picklist-size" />
    
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button menu="start" slot="start" />
        <ion-title>{{ picklistSize > openOrders.total ? openOrders.total : picklistSize }} {{ $t('of') }} {{ openOrders.total }} {{ $t('orders') }}</ion-title>
     
        <ion-buttons slot="end">
          <ion-menu-button menu="end">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="picklist-size">
      <div v-if="openOrders.total">
        <ion-searchbar v-model="queryString" @keyup.enter="fetchOpenOrders()"/>

        <div class="filters">
          <ion-item lines="none" v-for="method in shipmentMethods" :key="method.val">
            <ion-checkbox slot="start" @ionChange="updateShipmentMethodArray(method.val)"/>
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
                {{ orders.doclist.docs[0].shipmentMethodTypeId }}
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
                <ion-note>{{ getProductStock(order.productId) }} {{ $t('pieces in stock') }}</ion-note>
              </div>
            </div>
          </div>

          <!-- TODO: add functionality to the buttons-->
          <div class="actions">
            <div class="positive-action"></div>
            <div class="negative-action">
              <ion-button fill="outline" color="danger">{{ $t("Recycle") }}</ion-button>
            </div>
          </div>
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
import { formatUtcDate, getFeature } from '@/utils'

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
      shipmentMethods: 'order/getShipmentMethods',
      getProductStock: 'stock/getProductStock'
    })
  },
  data () {
    return {
      selectedShipmentMethod: [] as Array<string>,
      queryString: ''
    }
  },
  methods: {
    updateShipmentMethodArray (method: string) {
      const index = this.selectedShipmentMethod.indexOf(method)
      if (index < 0) {
        this.selectedShipmentMethod.push(method)
      } else {
        this.selectedShipmentMethod.splice(index, 1)
      }
      this.fetchOpenOrders();
    },
    async assignPickers() {
      const bgjobmodal = await modalController.create({
        component: AssignPickerModal
      });
      return bgjobmodal.present();
    },
    async fetchOpenOrders () {
      const viewSize = this.picklistSize
      const payload = {
        queryString: this.queryString,
        viewSize
      } as any

      if(this.selectedShipmentMethod.length) {
        payload['filters'] = {
          shipmentMethodTypeId: { value: this.selectedShipmentMethod, op: 'OR'}
        }
      }
      await this.store.dispatch('order/fetchOpenOrders', payload)
    }
  },
  mounted () {
    this.fetchOpenOrders();
  },
  watch: {
    // added a watcher in picklistSize to fetch the open orders whenever the size changes
    // TODO: find a better way to get open orders when changing the picklistSize
    // One way is to call the fetchOpenOrders action from the picklist component when picklist
    // changed, but in this case we need to pass some data to picklist component using props
    // Another way is to emit an event when picklist size change and catch that event in here.
    picklistSize () {
      this.fetchOpenOrders();
    }
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