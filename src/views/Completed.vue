<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!completedOrders.total">{{ completedOrders.total }} {{ $t('orders') }}</ion-title>
        <ion-title v-else>{{ completedOrders.query.viewSize }} {{ $t('of') }} {{ completedOrders.total }} {{ $t('orders') }}</ion-title>

        <ion-buttons slot="end">
          <!-- TODO: implement support to upload CSV -->
          <ion-button :disabled="true" fill="clear" @click="() => router.push('/upload-csv')">{{ $t("Upload CSV") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-searchbar />

      <div v-if="completedOrders.total">

        <div class="filters">
          <ion-item lines="none" v-for="carrierPartyId in carrierPartyIds" :key="carrierPartyId.val">
            <ion-checkbox slot="start"/>
            <ion-label>
              {{ carrierPartyId.val.split('/')[0] }}
              <p>{{ carrierPartyId.groups }} {{ carrierPartyId.groups === 1 ? $t('package') : $t("packages") }}</p>
            </ion-label>
            <ion-icon :icon="printOutline" />
          </ion-item>

          <ion-item lines="none" v-for="shipmentMethod in shipmentMethods" :key="shipmentMethod.val">
            <ion-checkbox :value="shipmentMethod.val" slot="start"/>
            <ion-label>
              {{ shipmentMethod.val }}
              <p>{{ shipmentMethod.groups }} {{ shipmentMethod.groups > 1 ? $t('orders') : $t('order') }}, {{ shipmentMethod.itemCount }} {{ shipmentMethod.itemCount > 1 ? $t('items') : $t('item') }}</p>
            </ion-label>
          </ion-item>
        </div>

        <ion-button expand="block" class="bulk-action desktop-only" fill="outline" @click="shipOrderAlert">{{ $t("Ship") }}</ion-button>

        <ion-card v-for="(orders, index) in completedOrders.list" :key="index">
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

          <div v-for="order in orders.doclist.docs" :key="order" class="order-item">
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

            <div class="product-metadata mobile-only">
              <ion-note>{{ getProductStock(order.productId) }} {{ $t("pieces in stock") }}</ion-note>
            </div>
          </div>

          <!-- TODO: implement functionality to mobile view -->
          <div class="mobile-only">
            <ion-item>
              <ion-button fill="clear" @click="shipOrderAlert">{{ $t("Ship Now") }}</ion-button>
              <ion-button slot="end" fill="clear" color="medium" @click="shippingPopover">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </ion-item>
          </div>

          <!-- TODO: make the buttons functional -->
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

        <!-- TODO: make mobile view functional -->
        <ion-fab class="mobile-only" vertical="bottom" horizontal="end">
          <ion-fab-button  @click="shipOrderAlert">
            <ion-icon :icon="checkmarkDoneOutline" />
          </ion-fab-button>
        </ion-fab>
      </div>
      <div class="empty-state" v-else>
        {{ currentFacility.name }}{{ $t(" doesn't have any completed orders right now.") }}
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
  IonContent,
  IonCheckbox,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
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
  popoverController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { printOutline, downloadOutline, pricetagOutline, ellipsisVerticalOutline, checkmarkDoneOutline } from 'ionicons/icons'
import Popover from '@/views/ShippingPopover.vue'
import { useRouter } from 'vue-router';
import { mapGetters, useStore } from 'vuex'
import { formatUtcDate, getFeature, hasError } from '@/utils'
import Image from '@/components/Image.vue'
import { UtilService } from '@/services/UtilService';
import { prepareOrderQuery } from '@/utils/solrHelper';

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
  data() {
    return {
      shipmentMethods: [] as Array<any>,
      carrierPartyIds: [] as Array<any>
    }
  },
  computed: {
    ...mapGetters({
      completedOrders: 'order/getCompletedOrders',
      getProduct: 'product/getProduct',
      currentFacility: 'user/getCurrentFacility',
      getProductStock: 'stock/getProductStock',
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  async mounted() {
    await Promise.all([this.store.dispatch('order/findCompletedOrders'), this.fetchShipmentMethods(), this.fetchCarrierPartyIds()]);
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

    async fetchShipmentMethods() {
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        queryFields: 'productId productName virtualProductName orderId search_orderIdentifications productSku customerId customerName goodIdentifications',
        groupBy: 'picklistBinId',
        sort: 'orderDate asc',
        defType: "edismax",
        filters: {
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId }
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
        }
      } catch(err) {
        console.error(err)
      }
    },
    async fetchCarrierPartyIds() {
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        queryFields: 'productId productName virtualProductName orderId search_orderIdentifications productSku customerId customerName goodIdentifications',
        groupBy: 'picklistBinId',
        sort: 'orderDate asc',
        defType: "edismax",
        filters: {
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: this.currentFacility.facilityId },
          productStoreId: { value: this.currentEComStore.productStoreId },
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

        if(resp.status == 200 && !hasError(resp) && resp.data.facets.count >= 0) {
          this.carrierPartyIds = resp.data.facets.manifestContentIdFacet.buckets
        } else {
          console.error('Failed to fetch carrierPartyIds', resp.data)
        }
      } catch(err) {
        console.error(err)
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      checkmarkDoneOutline,
      downloadOutline,
      ellipsisVerticalOutline,
      formatUtcDate,
      getFeature,
      pricetagOutline,
      printOutline,
      router,
      store
    }
  }
});
</script>