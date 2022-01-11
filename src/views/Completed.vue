<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title> {{ orderLength }} {{("of")}} {{ totalOrders }} {{ $t("orders") }}</ion-title>
        <ion-buttons slot="end">
            <ion-button fill="clear" @click="() => router.push('/upload-csv')">{{ $t("Upload CSV") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-searchbar />  
      <div class="filters">
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Fedex
            <p>30 {{ $t("packages") }}</p>
          </ion-label>
          <ion-icon :icon="printOutline" />
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            UPS
            <p>10 {{ $t("packages") }}</p>
          </ion-label>
          <ion-icon :icon="downloadOutline" />
        </ion-item>
      </div> 

      <ion-button expand="block" class="desktop-only" fill="outline" @click="shipOrderAlert">{{ $t("Ship") }}</ion-button>

      <ion-card v-for="(order, index) in orders" :key="index" >
        <div class="card-header">
          <div class="order-primary-info">
            <ion-label>
              {{ order.doclist.docs[0]?.customerPartyName }}
              <p v-if="order.doclist.docs[0]?.orderDate">
                {{ $t("Ordered") }} {{ $filters.formatDate(order.doclist.docs[0]?.orderDate) }}
              </p>
            </ion-label>
          </div>

          <div class="order-tags" v-if="order.doclist.docs[0]?.orderId">
            <ion-chip outline>
              <ion-icon :icon="pricetagOutline" />
              <ion-label>{{ order.doclist.docs[0]?.orderId }}</ion-label>
            </ion-chip>
          </div>

          <div class="order-metadata">
            <ion-label>
              {{ order.doclist.docs[0].shipmentMethodTypeId }}
              <!-- TODO: handle for this property -->
              <p>{{ $t("Last brokered") }} 28th January 2020 2:32 PM EST</p>
            </ion-label>
          </div>
        </div>

        <div class="order-item" v-for="(item, index) in order.doclist.docs" :key="index">
          <div class="product-info">
            <ion-item lines="none">
              <ion-thumbnail>
                <Image :src="getProduct(item.productId).mainImageUrl" />
              </ion-thumbnail>
              <ion-label>
                <p class="overline">{{ item.internalName }}</p>
                {{ getProduct(item.productId).parentProductName }}
                <p> {{ $filters.getFeature(getProduct(item.productId).productFeatures, 'Color') }} {{ $filters.getFeature(getProduct(item.productId).productFeatures, 'Size') }} </p>
              </ion-label>
            </ion-item>
          </div>

          <div class="product-metadata mobile-only">
            <!-- TODO: Handle for this property -->
            <ion-note>{{ getProductStock(item.productId) }} {{ $t("pieces in stock") }}</ion-note>
          </div>
        </div>

        <div class="mobile-only">
          <ion-item>
            <ion-button fill="clear" @click="shipOrderAlert">{{ $t("Ship Now") }}</ion-button>
            <ion-button slot="end" fill="clear" color="medium" @click="shippingPopover">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </ion-item>
        </div>

        <div class="actions">  
          <div class="desktop-only">
            <ion-button @click="shipOrderAlert">{{ $t("Ship Now") }}</ion-button>
            <ion-button fill="outline">{{ $t("Print Shipping Label") }}</ion-button>
            <ion-button fill="outline">{{ $t("Print Customer Letter") }}</ion-button>
          </div>
          <div class="desktop-only">
            <ion-button fill="outline" color="danger">{{ $t("Unpack") }}</ion-button>
          </div>
        </div>
      </ion-card>

      <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" :disabled="false" >
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
    <ion-fab class="mobile-only" vertical="bottom" horizontal="end">
      <ion-fab-button  @click="shipOrderAlert">
        <ion-icon :icon="checkmarkDoneOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonButton, 
  IonButtons, 
  IonCard, 
  IonChip, 
  IonContent, 
  IonCheckbox, 
  IonFab, 
  IonFabButton, 
  IonHeader, 
  IonIcon, 
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem, 
  IonLabel, 
  IonMenuButton,
  IonNote, 
  IonPage, 
  IonSearchbar, 
  IonThumbnail, 
  IonTitle, 
  IonToolbar, 
  alertController, 
  popoverController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { printOutline, downloadOutline, pricetagOutline, ellipsisVerticalOutline, checkmarkDoneOutline } from 'ionicons/icons'
import Popover from '@/views/ShippingPopover.vue'
import { useRouter } from 'vue-router';
import Image from "@/components/Image.vue";
import { mapGetters, useStore } from 'vuex';

export default defineComponent({
  name: 'Home',
  components: {
    Image,
    IonButton,
    IonButtons, 
    IonCard, 
    IonChip,
    IonContent, 
    IonCheckbox, 
    IonFab, 
    IonFabButton, 
    IonHeader, 
    IonIcon, 
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem, 
    IonLabel, 
    IonMenuButton,
    IonNote, 
    IonPage, 
    IonSearchbar,
    IonThumbnail, 
    IonTitle, 
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      orders: 'orders/getCompletedOrders',
      orderLength: 'orders/getcompletedOrderLength',
      getProduct: 'product/getProduct',
      currentFacility: 'user/getCurrentFacility',
      getProductStock: 'stock/getProductStock',
      totalOrders: 'orders/getTotalNumberOfOrders'
    })
  },
  methods: {
    async shipOrderAlert() {
      const alert = await alertController
        .create({
          header: this.$t("Ship orders"),
          message: this.$t("You are shipping orders. You cannot unpack and edit orders after they have been  shipped. Are you sure you are ready to ship this orders.", {count: 15, space: '<br /><br />'}),       
          buttons: [this.$t("Cancel"), this.$t("Ship")],
        });
      return alert.present();
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
    async getCompletedOrders(vStart?: any, vRow?: any) {
      vRow = vRow ? vRow : process.env.VUE_APP_VIEW_SIZE;
      vStart = vStart ? vStart : 0;
      const payload = 
        {
          "json": {
            "params": {
              "start": vStart,
              "rows": vRow,
              "sort": "reservedDatetime desc",
              "group": true,
              "group.field": "orderId",
              "group.limit": 1000,
              "group.ngroups": true,
              "defType": "edismax",
              "q.op": "AND",
              "qf": "orderId"
            },
            "query": "(* *)",
            "filter": ["docType:ORDER","orderTypeId: SALES_ORDER","orderStatusId:ORDER_COMPLETED","-shipmentMethodTypeId : STOREPICKUP",`facilityId: ${this.currentFacility.facilityId}`],
            "facet": {
              "shipmentMethodTypeIdFacet": {
                "excludeTags": "shipmentMethodTypeIdFilter",
                "field": "shipmentMethodTypeId",
                "mincount": 1,
                "limit": -1,
                "sort": "index",
                "type": "terms",
                "facet": {
                  "ordersCount": "unique(orderId)"
                }
              }
            }
          }
        }
        this.store.dispatch("orders/getCompletedOrders", payload)
    },
    async loadMoreOrders(event: any) {
      this.getCompletedOrders(Math.ceil(this.orderLength/process.env.VUE_APP_VIEW_SIZE)*10)
        .then(()=> {
          event.target.complete();
        })
    }
  },
  mounted(){
    this.getCompletedOrders();
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    return {  
      checkmarkDoneOutline,
      downloadOutline, 
      ellipsisVerticalOutline, 
      pricetagOutline, 
      printOutline, 
      router,
      store
    }
  }
});
</script>

<style scoped>
.order-primary-info {
  grid-area: info;
}

.order-tags {
  grid-area: tags;
  border-bottom: 1px solid black;
}

.order-metadata {
  grid-area: metadata;
  border-bottom: 1px solid black;
}

.card-header {
  display: grid;
  grid: "tags"
        "info"
        "metadata" / 1fr;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid black;
}  

@media (min-width: 991px) {
  .order-tags {
    border-bottom: none;
  }

  .order-metadata {
    text-align: end;
    border-bottom: none
  }

  .card-header {
    grid: "info tags metadata" / max-content 1fr max-content;
    justify-items: center;
    align-items: center;
    border-bottom: 1px solid black;
  }
}
</style>