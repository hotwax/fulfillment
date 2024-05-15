<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="`/order-lookup`" />
        <ion-title>{{ translate("Order detail") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main v-if="order.orderId">
        <section class="header">
          <div class="id">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="ticketOutline" />
              <ion-label>
                <h1>{{ order.orderName }}</h1>
                <p>{{ order.orderId }}</p>
              </ion-label>
              <ion-label slot="end">
                <p>{{ formatCurrency(order.grandTotal, order.currencyUom) }}</p>
              </ion-label>
            </ion-item>
          </div>

          <div class="timeline">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="timeOutline" class="mobile-only" />
              <h2>{{ translate("Timeline") }}</h2>
              <ion-badge slot="end" :color="getColorByDesc(orderStatuses[order.statusId].label) || getColorByDesc('default')">{{ translate(orderStatuses[order.statusId].label) }}</ion-badge>
            </ion-item>

            <ion-list class="desktop-only">
              <ion-item v-if="order.orderDate">
                <ion-icon :icon="sunnyOutline" slot="start" />
                <ion-label>
                  {{ translate("Created in Shopify") }}
                </ion-label>
                <ion-note slot="end">{{ formatDateTime(order.orderDate) }}</ion-note>
              </ion-item>
              <ion-item v-if="order.entryDate">
                <ion-icon :icon="downloadOutline" slot="start" />
                <ion-label>
                  <p>{{ findTimeDiff(order.orderDate, order.entryDate) }}</p>
                  {{ translate("Imported from Shopify") }}
                </ion-label>
                <ion-note slot="end">{{ formatDateTime(order.entryDate) }}</ion-note>
              </ion-item>
              <ion-item v-if="order.approvedDate">
                <ion-icon :icon="checkmarkDoneOutline" slot="start" />
                <ion-label>
                  <p>{{ findTimeDiff(order.orderDate, order.approvedDate) }}</p>
                  {{ translate("Approved for fulfillment") }}
                </ion-label>
                <ion-note slot="end">{{ formatDateTime(order.approvedDate) }}</ion-note>
              </ion-item>
              <ion-item v-if="order.firstBrokeredDate">
                <ion-icon :icon="checkmarkDoneOutline" slot="start" />
                <ion-label>
                  <p>{{ findTimeDiff(order.orderDate, order.firstBrokeredDate) }}</p>
                  {{ translate("First Brokered") }}
                </ion-label>
                <ion-note slot="end">{{ formatDateTime(order.firstBrokeredDate) }}</ion-note>
              </ion-item>
              <ion-item v-if="order.completedDate">
                <ion-icon :icon="pulseOutline" slot="start" />
                <ion-label>
                  <p>{{ findTimeDiff(order.orderDate, order.completedDate) }}</p>
                  {{ translate("Order completed") }}
                </ion-label>
                <ion-note slot="end">{{ formatDateTime(order.completedDate) }}</ion-note>
              </ion-item>
            </ion-list>
          </div>

          <div class="info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ order.partyName || order.billToPartyId }}</ion-card-title>
              </ion-card-header>
              <ion-list>
                <ion-item>
                  <ion-icon :icon="mailOutline" slot="start" />
                  <ion-label class="ion-text-wrap"> {{ order.billingEmail || "-" }} </ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon :icon="callOutline" slot="start" />
                  <ion-label>{{ order.billingPhone || "-" }}</ion-label>
                </ion-item>
                <ion-item lines="none">
                  <ion-icon :icon="cashOutline" slot="start" />
                  <ion-label v-if="order.billingAddress" class="ion-text-wrap">
                    {{ order.billingAddress.toName }}
                    <p>{{ order.billingAddress.address1 }}</p>
                    <p>{{ order.billingAddress.address2 }}</p>
                    <p>{{ order.billingAddress.city }} {{ order.billingAddress.city && order.billingAddress.postalCode && ',' }} {{ order.billingAddress.postalCode }}</p>
                    <p>{{ order.billingAddress.stateName }} {{ order.billingAddress.stateName && order.billingAddress.countryName && ',' }} {{ order.billingAddress.countryName }}</p>
                  </ion-label>
                  <ion-label v-else>{{ "-" }}</ion-label>
                </ion-item>
              </ion-list>
            </ion-card>

            <div>
              <ion-card>
                <ion-card-header>
                  <ion-card-title>{{ translate("Source") }}</ion-card-title>
                </ion-card-header>
                <ion-list>
                  <ion-item>
                    <ion-label>{{ translate("Brand") }}</ion-label>
                    <p slot="end">{{ currentEcomStore.storeName || "-" }}</p>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-label>{{ translate("Channel") }}</ion-label>
                    <p slot="end">{{ order.salesChannel || "-" }}</p>
                  </ion-item>
                </ion-list>
              </ion-card>
  
              <ion-card>
                <ion-card-header>
                  <ion-card-title>{{ translate("Payment") }}</ion-card-title>
                </ion-card-header>
                <div v-if="order.orderPayments?.length">
                  <ion-list v-for="orderPayment in order.orderPayments" :key="orderPayment">
                    <ion-item lines="none">
                      <ion-label class="ion-text-wrap">
                        <p class="overline">{{ orderPayment.methodTypeId }}</p>
                        {{ translate(getPaymentMethodDesc(orderPayment.methodTypeId)) || orderPayment.methodTypeId }}
                        <ion-note :color="getColorByDesc(getStatusDesc(orderPayment.paymentStatus))">{{ translate(getStatusDesc(orderPayment.paymentStatus)) }}</ion-note>
                      </ion-label>
                      <p slot="end">{{ formatCurrency(orderPayment.amount, order.currencyUom) }}</p>
                    </ion-item>
                  </ion-list>
                </div>
                <p v-else class="empty-state">
                  {{ translate("No payments found") }}
                </p>
              </ion-card>
            </div>

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Order Identifications") }}</ion-card-title>
              </ion-card-header>
              <ion-list>
                <ion-item>
                  <ion-label class="ion-text-wrap"> {{ translate("Order Name") }} </ion-label>
                  <p slot="end">{{ order.orderName || "-" }}</p>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap"> {{ translate("OMS ID") }} </ion-label>
                  <p slot="end">{{ order.orderId || "-" }}</p>
                </ion-item>
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap"> {{ translate("Shopify ID") }} </ion-label>
                  <p slot="end">{{ order.shopifyOrderId || "-" }} </p>
                </ion-item>
              </ion-list>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Additional data") }}</ion-card-title>
              </ion-card-header>
              <ion-list>
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Customer ID") }}</ion-label>
                  <p slot="end">{{ order.orderAttributes.customerid || "-" }}</p>
                </ion-item>
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">{{ translate("Muncipio") }}</ion-label>
                  <p slot="end">{{ order.orderAttributes.municipio || "-" }}</p>
                </ion-item>
              </ion-list>
            </ion-card>
          </div>
        </section>
        <section>
          <div v-if="Object.values(order.shipGroups).length">
            <div v-for="(shipGroups, index) in Object.values(order.shipGroups) as Array<any>" :key="index" class="ship-group-info ion-margin-vertical">
              <ion-item lines="none">
                <ion-icon slot="start" :icon="shipGroups[0].facilityTypeId === 'RETAIL_STORE' ? storefrontOutline : golfOutline" />
                <ion-label>
                  <p class="overline" v-if="shipGroups[0].facilityId !== '_NA_'">{{ shipGroups[0].facilityId }}</p>
                  <h1>{{ shipGroups[0].facilityName || shipGroups[0].facilityId }}</h1>
                  <p v-if="shipGroups[0].facilityId !== '_NA_'">{{ getShipmentMethodDesc(shipGroups[0].shipmentMethodTypeId) || shipGroups[0].shipmentMethodTypeId }}</p>
                </ion-label>
              </ion-item>
    
              <div class="product-card">
                <ion-card v-for="shipGroup in shipGroups" :key="shipGroup.shipGroupSeqId">
                  <ion-item>
                    <ion-thumbnail slot="start">
                      <DxpShopifyImg :src="getProduct(shipGroup.productId).mainImageUrl" size="small" />
                    </ion-thumbnail>
                    <ion-label class="ion-text-wrap">
                      <h1>{{ shipGroup.productId }}</h1>
                      <p>{{ getProduct(shipGroup.productId).productName }}</p>
                    </ion-label>
                    <ion-badge slot="end" :color="getColorByDesc(itemStatuses[shipGroup.statusId].label) || getColorByDesc('default')">{{ translate(itemStatuses[shipGroup.statusId].label) }}</ion-badge>
                  </ion-item>

                  <ion-item>
                    <ion-label class="ion-text-wrap">{{ translate("Price") }}</ion-label>
                    <p slot="end">{{ formatCurrency(shipGroup.unitPrice, order.currencyUom) }}</p>
                  </ion-item>

                  <ion-item v-if="shipGroup.facilityId !== '_NA_'">
                    <ion-label class="ion-text-wrap">{{ translate("Allocation") }}</ion-label>
                    <p slot="end">{{ order["shipGroupFacilityAllocationTime"][shipGroup.shipGroupSeqId] ? formatDateTime(order["shipGroupFacilityAllocationTime"][shipGroup.shipGroupSeqId]) : "-" }}</p>
                  </ion-item>

                  <ion-item v-if="shipGroup.facilityId !== '_NA_'">
                    <ion-label class="ion-text-wrap">{{ translate("Fulfillment Status") }}</ion-label>
                    <p slot="end">{{ translate(shipGroup.statusId === "ITEM_COMPLETED" ? shipGroup.shipmentMethodTypeId === "STOREPICKUP" ? "Picked up" : "Shipped" : order?.shipGroupFulfillmentStatus?.[shipGroup.shipGroupSeqId] || "Reserved") }}</p>
                  </ion-item>

                  <ion-item v-if="shipGroup.statusId !== 'ITEM_CANCELLED' && shipGroup.statusId !== 'ITEM_COMPLETED'">
                    <ion-label>{{ translate("QOH") }}</ion-label>
                    <ion-note slot="end" v-if="getProductStock(shipGroup.productId, shipGroup.facilityId).quantityOnHandTotal >= 0">
                      {{ getProductStock(shipGroup.productId, shipGroup.facilityId).quantityOnHandTotal }} {{ translate("pieces in stock") }}
                    </ion-note>
                    <ion-spinner slot="end" v-else-if="isFetchingStock" color="medium" name="crescent" />
                    <ion-button v-else fill="clear" @click.stop="fetchProductStock(shipGroup.productId, shipGroup.facilityId)">
                      <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
                    </ion-button>
                  </ion-item>
                </ion-card>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>{{ translate("No ship groups found") }}</p>
          </div>
        </section>
      </main>
      <main v-else-if="isFetchingOrderInfo" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Fetching order information...") }}</ion-label>
      </main>
      <main v-else class="empty-state">
        <p>{{ translate("Something went wrong while fetching order details, please check the orderId and try again.") }}</p>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { translate } from '@hotwax/dxp-components';
import { cubeOutline, golfOutline, callOutline, cashOutline, informationCircleOutline, ribbonOutline, mailOutline, ticketOutline, timeOutline, pulseOutline, storefrontOutline, sunnyOutline, checkmarkDoneOutline, downloadOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { DateTime } from "luxon";
import { formatCurrency, getColorByDesc } from "@/utils"

export default defineComponent({
  name: "OrderLookupDetail",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonPage,
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToolbar
  },
  props: ["orderId"],
  data() {
    return {
      orderStatuses: JSON.parse(process.env.VUE_APP_ORDER_STATUS as any),
      itemStatuses: JSON.parse(process.env.VUE_APP_ITEM_STATUS as any),
      isFetchingStock: false,
      isFetchingOrderInfo: false
    }
  },
  computed: {
    ...mapGetters({
      order: "orderLookup/getCurrentOrder",
      currentEcomStore: "user/getCurrentEComStore",
      getProduct: "product/getProduct",
      getProductStock: "stock/getProductStock",
      getStatusDesc: "util/getStatusDesc",
      getShipmentMethodDesc: "util/getShipmentMethodDesc",
      getPaymentMethodDesc: 'util/getPaymentMethodDesc',
    })
  },
  async ionViewWillEnter() {
    this.isFetchingOrderInfo = true
    await this.store.dispatch("orderLookup/getOrderDetails", this.orderId)
    this.isFetchingOrderInfo = false
  },
  methods: {
    formatDateTime(date: any) {
      return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
    },
    findTimeDiff(startTime: any, endTime: any) {
      const timeDiff = DateTime.fromMillis(endTime).diff(DateTime.fromMillis(startTime), ["years", "months", "days", "hours", "minutes"]);
      let diffString = "+ ";
      if(timeDiff.years) diffString += `${Math.round(timeDiff.years)} years `
      if(timeDiff.months) diffString += `${Math.round(timeDiff.months)} months `
      if(timeDiff.days) diffString += `${Math.round(timeDiff.days)} days `
      if(timeDiff.hours) diffString += `${Math.round(timeDiff.hours)} hours `
      if(timeDiff.minutes) diffString += `${Math.round(timeDiff.minutes)} minutes`
      return diffString
    },
    async fetchProductStock(productId: string, facilityId: string) {
      this.isFetchingStock = true
      // TODO: fetch QOH only for brokered facility
      await this.store.dispatch('stock/fetchStock', { productId, facilityId })
      this.isFetchingStock = false
    },
  },
  setup() {
    const store = useStore();

    return {
      callOutline,
      cashOutline,
      checkmarkDoneOutline,
      cubeOutline,
      downloadOutline,
      formatCurrency,
      getColorByDesc,
      golfOutline,
      informationCircleOutline,
      mailOutline,
      pulseOutline,
      ribbonOutline,
      store,
      storefrontOutline,
      sunnyOutline,
      ticketOutline,
      timeOutline,
      translate
    }
  }
});
</script>

<style scoped>
.header {
  display: grid;
  grid: "id timeline" min-content
        "cards timeline" 1fr
        / 1fr 500px;
  justify-content: space-between;  
}

.id {
  grid-area: id;
}

.info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(314px, max-content));
  align-items: start;
  grid-area: cards;
}

.timeline {
  grid-area: timeline;
}

@media (min-width: 343px) {
  .ship-group-info > .product-card {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(343px, 1fr));
  }
}
</style>
