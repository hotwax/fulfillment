<template>
  <ion-menu side="end" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item>
          <ion-label class="ion-text-wrap">
            <p>{{ translate("Shipping Method") }}</p>
          </ion-label>
        </ion-item>
        <ion-item button v-for="(shipmentMethod, index) in shipmentMethods" :key="index" @click="applyFilter(shipmentMethod.val, 'shipment-method')">
          <ion-checkbox slot="end" :checked="transferOrders.query.selectedShipmentMethods.includes(shipmentMethod.val)">
            <ion-label>{{ translate(getShipmentMethodDesc(shipmentMethod.val)) }}</ion-label>
          </ion-checkbox>
        </ion-item>

        <ion-item>
          <ion-label class="ion-text-wrap">
            <p>{{ translate("Status") }}</p>
          </ion-label>
        </ion-item>
        <ion-item button v-for="(status, index) in statuses" :key="index" @click="applyFilter(status.val, 'status')">
          <ion-checkbox slot="end" :checked="transferOrders.query.selectedStatuses.includes(status.val)">
            <ion-label>{{ translate(getStatusDesc(status.val)) }}</ion-label>
          </ion-checkbox>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { albumsOutline, banOutline, barChartOutline, calendarNumberOutline, checkmarkDoneOutline, closeOutline, filterOutline, iceCreamOutline, libraryOutline, pulseOutline, settings, shirtOutline, ticketOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'
import { escapeSolrSpecialChars, prepareOrderQuery } from '@/utils/solrHelper';
import { UtilService } from '@/services/UtilService';
import { hasError } from '@/adapter';
import logger from '@/logger';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "TransferOrderFilters",
  components: {
    IonCheckbox,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonTitle,
    IonToolbar
  },
  props: ["queryString"],
  data () {
    return {
      shipmentMethods: [] as Array<any>,
      statuses: [] as Array<any>
    }
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      transferOrders: 'transferorder/getTransferOrders',
      getStatusDesc: 'util/getStatusDesc',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      currentEComStore: 'user/getCurrentEComStore',
    })
  },
  async mounted() {
    await this.fetchFilters();
  },
  unmounted() {
    this.store.dispatch('transferorder/clearTransferOrderFilters');
  },
  methods: {
    async applyFilter(value: any, type: string) {
      const transferOrdersQuery = JSON.parse(JSON.stringify(this.transferOrders.query))
      if (type === "shipment-method") {
        const selectedShipmentMethods = transferOrdersQuery.selectedShipmentMethods;
        const index = selectedShipmentMethods.indexOf(value)
        if (index < 0) {
          selectedShipmentMethods.push(value)
        } else {
          selectedShipmentMethods.splice(index, 1)
        }
        transferOrdersQuery.selectedShipmentMethods = selectedShipmentMethods
      }
      if (type === "status") {
        const selectedStatuses = transferOrdersQuery.selectedStatuses;
        const index = selectedStatuses.indexOf(value)
        if (index < 0) {
          selectedStatuses.push(value)
        } else {
          selectedStatuses.splice(index, 1)
        }
        transferOrdersQuery.selectedStatuses = selectedStatuses
      }
      await this.store.dispatch('transferorder/updateTransferOrderQuery', { ...transferOrdersQuery })
    },
    async fetchFilters() {
      let resp: any;
      const payload = prepareOrderQuery({
        docType: "ORDER",
        queryFields: 'orderId',
        viewSize: '0',  // passed viewSize as 0 to not fetch any data
        filters: {
          '-orderStatusId': { value: 'ORDER_CREATED' },
          orderTypeId: { value: 'TRANSFER_ORDER' },
          facilityId: { value: escapeSolrSpecialChars(this.currentFacility.facilityId) },
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
          },
          "orderStatusIdFacet":{
            "excludeTags":"orderStatusIdFilter",
            "field":"orderStatusId",
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
        resp = await UtilService.fetchTransferOrderFacets(payload);
        if (resp.status == 200 && !hasError(resp) && resp.data.facets?.count > 0) {
          this.shipmentMethods = resp.data.facets.shipmentMethodTypeIdFacet.buckets
          this.statuses = resp.data.facets.orderStatusIdFacet.buckets
          this.store.dispatch('util/fetchShipmentMethodTypeDesc', this.shipmentMethods.map((shipmentMethod: any) => shipmentMethod.val))
          this.store.dispatch('util/fetchStatusDesc', this.statuses.map((status: any) => status.val))
        } else {
          throw resp.data;
        }
      } catch(err) {
        logger.error('Failed to fetch transfer order filters.', err)
      }
    },
  },
  setup() {
    const store = useStore();
    
    return {
      albumsOutline,
      banOutline,
      barChartOutline,
      calendarNumberOutline,
      checkmarkDoneOutline,
      closeOutline,
      filterOutline,
      iceCreamOutline,
      libraryOutline,
      pulseOutline,
      settings,
      shirtOutline,
      store,
      ticketOutline,
      translate
    };
  },
});
</script>