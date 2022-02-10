<template>
  <ion-page :fullscreen="true">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ inProgressOrders.list.total  }} {{ $t("orders" )}} | {{ inProgressOrders.list.items }} {{ $t("items") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-searchbar v-model="queryString" @keyup.enter="fetchInProgressOrders()"/> 

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
      <ion-button expand="block" class="desktop-only" fill="outline" @click="packOrdersAlert">{{ $t("Pack orders") }}</ion-button>
      <ion-card v-for="(orders, index) in inProgressOrders.list.inProgress" :key="index">
        <div class="card-header">
          <div class="order-primary-info">
            <ion-label>
              {{ orders.doclist.docs[0].customerName }}
              <p>{{ $t("Ordered") }} {{ $filters.formatUtcDate(orders.doclist.docs[0].orderDate, 'YYYY-MM-DDTHH:mm:ssZ', 'Do MMMM YYYY LT z') }}</p>
            </ion-label>
          </div>

          <div class="order-tags">
            <ion-chip outline>
              <ion-icon :icon="pricetagOutline" />
              <ion-label>{{ orders.doclist.docs[0].orderId }}</ion-label>
            </ion-chip>
          </div>

          <div class="order-metadata">
            <!-- <ion-label>
              Next Day Shipping
              <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p>
            </ion-label> -->
          </div>
        </div>

        <div class="box-type desktop-only">
          <ion-button fill="outline"><ion-icon :icon="addOutline" />{{ $t("Add Box") }}</ion-button>
          <ion-chip> Box A | Type 3</ion-chip>  
        </div>

        <div v-for="order in orders.doclist.docs" :key="order" class="order-item">
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

          <div class="desktop-only">
              <ion-segment @ionChange="segmentChanged($event)" v-model="segment">
                <ion-segment-button value="pack">
                  <ion-label>{{ $t("Ready to pack") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="issue">
                  <ion-label>{{ $t("Report an issue") }}</ion-label>
                </ion-segment-button>
              </ion-segment> 
              <div class="segments">
              <div v-if="segment == 'pack'">
                <ion-item lines="none">
                  <ion-label>{{ $t("Select box") }}</ion-label>   
                  <ion-select value="box1">
                    <ion-select-option value="box1">Box A Type 3</ion-select-option>
                    <ion-select-option value="box2">Box B Type 2</ion-select-option>
                  </ion-select>      
                </ion-item>
              </div>
              <div v-if="segment == 'issue'">
                <ion-item lines="none">  
                  <ion-label>{{ $t("Select issue") }}</ion-label>  
                  <ion-select value="a">
                    <ion-select-option value="a">Out of stock</ion-select-option>
                    <ion-select-option value="b">Worn display</ion-select-option>
                  </ion-select> 
                </ion-item>
              </div>
            </div> 
          </div>

          <div class="product-metadata">
            <ion-note>{{ getProductStock(order.productId) }} {{ $t('pieces in stock') }}</ion-note>
          </div>
        </div>

        <div class="mobile-only">
          <ion-item>
            <ion-button fill="clear" @click="packOrdersAlert(orders)">{{ $t("Pack using default packaging") }}</ion-button>
            <ion-button slot="end" fill="clear" color="medium" @click="packagingPopover">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </ion-item>
        </div>

        <div class="actions">  
          <div>
            <ion-button @click="packOrdersAlert(orders)">{{ $t("Pack") }}</ion-button>
             <ion-button fill="outline">{{ $t("Save") }}</ion-button>
          </div>
          <div></div>
        </div>
      </ion-card>

      <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" :disabled="!isScrollable">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
      </ion-infinite-scroll>

      <ion-fab class="mobile-only" vertical="bottom" horizontal="end">
        <ion-fab-button  @click="packOrdersAlert">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonCard, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonItem, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToolbar, alertController, popoverController } from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { printOutline, addOutline, ellipsisVerticalOutline, checkmarkDoneOutline, pricetagOutline } from 'ionicons/icons'
import Popover from "@/views/PackagingPopover.vue";
import { mapGetters, useStore } from 'vuex';
import Image from '@/components/Image.vue'

export default defineComponent({
  name: 'InProgress',
  components: {
    Image,
    IonButton,  
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
    IonNote,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonThumbnail,   
    IonTitle,
    IonToolbar
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      inProgressOrders: 'order/getInProgressOrders',
      getProduct: 'product/getProduct',
      getProductStock: 'stock/getProductStock',
      isScrollable: 'order/isScrollable'
    })
  },
  data () {
    return {
      queryString: ''
    }
  },
  methods: {
    segmentChanged(ev: CustomEvent) {
      this.segment = ev.detail.value;
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
    async packOrdersAlert(orders: any) {
      const alert = await alertController
        .create({
          header: this.$t("Pack orders"),
          message: this.$t("You are packing orders. Select additional documents that you would like to print.", {count: 15, space: '<br /><br />'}),
          inputs: [
            {
              type: 'checkbox',
              label: this.$t("Shipping labels"),
              value: 'value1',
              checked: true,
              },
            {
              type: 'checkbox',
              label: this.$t("Packing slip"),
              value: 'value2',
            },
          ],   
          buttons: [{
            role: 'cancel',
            text: this.$t("Cancel")
          }, {
            text: this.$t("Pack"),
            handler: async () => {
              const params = {
                'picklistBinId': orders.doclist.docs[0].picklistBinId,
                'orderId': orders.doclist.docs[0].orderId
              }
              await this.store.dispatch('order/packOrder', params).then((resp) => {
                this.fetchInProgressOrders();
              })
              console.log('order packed', params)
            }
          }],
        });
      return alert.present();
    },
    async reportIssueAlert() {
      const alert = await alertController
        .create({
          header: this.$t("Report an Issue"),
          message: this.$t(", and other products are identified as unfulfillable. other orders  containing these products will be  unassigned  from this store and sent to be rebrokered.", {productName: "WJ06-XL-Purple", products: 5, space: '<br /><br />', orders: 4}),       
          buttons: [this.$t("Cancel"), this.$t("Report")],
        });
      return alert.present();
    },
    async fetchInProgressOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE
      const viewIndex = vIndex ? vIndex : 0
      const sortBy = ''
      const payload = {
        "json": {
          "params": {
            "rows": `${viewSize}`,
            "start": `${viewIndex}`,
            "sort": `${sortBy ? sortBy:'reservedDatetime desc'}`,
            "group": true,
            "group.field": "orderId",
            "group.limit": 1000,
            "group.ngroups": true,
            "defType": "edismax",
            "q.op": "AND",
            "qf": "orderId"
          },
          "query": `(*${this.queryString}*) OR "${this.queryString}"^100`,         
          "filter" : `docType: OISGIR AND picklistItemStatusId: PICKITEM_PENDING AND -fulfillmentStatus: Rejected AND -shipmentMethodTypeId : STOREPICKUP AND facilityId: ${this.currentFacility.facilityId}`    
        } 
      } 
      this.store.dispatch('order/fetchInProgressOrders', payload).then((resp: any) => console.log(resp)).catch((err: any) => console.log(err))
    },
    async loadMoreOrders(event: any) {
      this.fetchInProgressOrders(
        undefined,
        Math.ceil(this.inProgressOrders.list.inProgress.length / process.env.VUE_APP_VIEW_SIZE).toString()
      ).then(() => {
        event.target.complete();
      })
    },
  },
  mounted(){
    this.fetchInProgressOrders();
  },
  setup() {
      const store = useStore();
      const segment = ref("pack");

      return {
          addOutline,
          printOutline,
          ellipsisVerticalOutline,
          checkmarkDoneOutline,
          pricetagOutline,
          segment,
          store
      }
  }
});
</script>

<style scoped>
.filters > ion-item {
  flex: 1 0 100%;
  max-width: 200px;
  border: 0.01px solid black;
  border-radius: 10px;
}

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

  .box-type {
    border-bottom: 1px solid black;
  }
}
</style>