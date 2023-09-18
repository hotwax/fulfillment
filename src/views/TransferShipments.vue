<template>
  <ion-page>
    <ViewSizeSelector content-id="view-size-selector" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title v-if="!transferShipments.total">{{ transferShipments.total }} {{ $t('shipments') }}</ion-title>
        <ion-title v-else>{{ transferShipments.query.viewSize }} {{ $t('of') }} {{ transferShipments.total }} {{ $t('shipments') }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="end" :disabled="!transferShipments.total">
            <ion-icon :icon="optionsOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content id="view-size-selector">
      <ion-searchbar :value="transferShipments.query.queryString" @keyup.enter="updateQueryString($event.target.value)" :placeholder="$t('Search transfer shipments')"/>
      <div class="filters">
        <ion-item lines="none" v-for="carrierPartyId in carrierPartyIds" :key="carrierPartyId">
          <ion-checkbox slot="start" :checked="transferShipments.query.selectedCarrierPartyIds.includes(carrierPartyId)" @ionChange="updateSelectedCarrierPartyIds(carrierPartyId)"/>
          <ion-label>
            {{ getPartyName(carrierPartyId) }}
          </ion-label>
        </ion-item>

        <ion-item lines="none" v-for="shipmentMethodTypeId in shipmentMethodTypeIds" :key="shipmentMethodTypeId">
          <ion-checkbox slot="start" :checked="transferShipments.query.selectedShipmentMethodTypeIds.includes(shipmentMethodTypeId)" @ionChange="updateSelectedShipmentMethods(shipmentMethodTypeId)"/>
          <ion-label>
            {{ getShipmentMethodDesc(shipmentMethodTypeId) }}              
          </ion-label>
        </ion-item>
      </div>
      <main class="transfer-shipments">
        <section>
          <div v-if="transferShipments.total">
            <ion-item v-for="(shipment, index) in getTransferShipments()" :key="index" @click="viewShipmentDetail(shipment)" button detail>
              <ion-label>
                <p fill="overline">{{shipment.shipmentId}} </p>
                {{ shipment.destinationFacilityName ? shipment.destinationFacilityName : shipment.destinationFacilityId }}
                <p> {{ shipment.estimatedShipDate ? this.getFromattedDateTime(shipment.estimatedShipDate) : "-" }}</p>
              </ion-label>
              <ion-note slot="end">{{ getTransferShipmentStatusDesc(shipment.statusId) }}</ion-note>
            </ion-item>

            <ion-infinite-scroll @ionInfinite="loadMoreTransferShipments($event)" threshold="100px" :disabled="!isTransferShipmentScrollable()">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
            </ion-infinite-scroll>
          </div>
          <div class="empty-state" v-else>
            <p v-html="getErrorMessage()"></p>
          </div>
        </section>
        <aside class="desktop-only" v-if="isDesktop" v-show="Object.keys(currentShipment).length">
          <ShipmentDetails :query='transferShipments.query' />
        </aside>
      </main>  
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButtons,
  IonContent,
  IonCheckbox,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  IonNote,
  isPlatform
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { printOutline, downloadOutline, ellipsisVerticalOutline, checkmarkDoneOutline, optionsOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router';
import { mapGetters, useStore } from 'vuex'
import { DateTime } from 'luxon';
import { copyToClipboard, getFeature } from '@/utils'
import { hasError } from '@/adapter'
import ViewSizeSelector from '@/components/ViewSizeSelector.vue'
import { TransferShipmentService } from '@/services/TransferShipmentService';
import ShipmentDetails from '@/components/ShipmentDetails.vue'
import logger from '@/logger';
import { Actions, hasPermission } from '@/authorization'
import emitter from '@/event-bus';

export default defineComponent({
  name: 'TransferShipments',
  components: {
    IonButtons,
    IonContent,
    IonCheckbox,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    IonNote,
    ViewSizeSelector,
    ShipmentDetails
  },
  data() {
    return {
      shipmentMethodTypeIds: [] as Array<any>,
      carrierPartyIds: [] as Array<any>,
      searchedQuery: '',
      isShipmentDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
    }
  },
  computed: {
    ...mapGetters({
      transferShipments: 'transferShipment/getTransferShipments',
      currentFacility: 'user/getCurrentFacility',
      currentEComStore: 'user/getCurrentEComStore',
      getPartyName: 'util/getPartyName',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      currentShipment: 'transferShipment/getCurrentShipment',
      getTransferShipmentStatusDesc: 'util/getTransferShipmentStatusDesc',
    })
  },
  async mounted() {
    await Promise.all([this.initialiseTransferShipmentQuery(), this.fetchShipmentMethodAndCarriers()]);
    emitter.on('updateTransferShipmentQuery', this.updateTransferShipmentQuery)
  },
  unmounted() {
    this.store.dispatch('order/clearCompletedOrders')
    emitter.on('updateTransferShipmentQuery', this.updateTransferShipmentQuery)
  },
  methods: {
    getFromattedDateTime (time: any) {
      return DateTime.fromMillis(time).toFormat('dd MMMM yyyy t a ZZZZ');
    },
    getErrorMessage() {
      return this.searchedQuery === '' ? this.$t("doesn't have any transfer shipments right now.", { facilityName: this.currentFacility.name }) : this.$t( "No results found for . Try switching stores.", { searchedQuery: this.searchedQuery })
    },
    getTransferShipments() {
      return this.transferShipments.list.slice(0, (this.transferShipments.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any) );
    },
    async loadMoreTransferShipments(event: any) {
      const transferShipmentQuery = JSON.parse(JSON.stringify(this.transferShipments.query))
      transferShipmentQuery.viewIndex++;
      await this.store.dispatch('transferShipment/updateTransferShipmentQueryIndex', { ...transferShipmentQuery })
      event.target.complete();
    },
    isTransferShipmentScrollable() {
      return ((this.transferShipments.query.viewIndex + 1) * (process.env.VUE_APP_VIEW_SIZE as any)) <  this.transferShipments.query.viewSize;
    },
    async initialiseTransferShipmentQuery() {
      const transferShipmentsQuery = JSON.parse(JSON.stringify(this.transferShipments.query))
      transferShipmentsQuery.viewIndex = 0 // If the size changes, list index should be reintialised
      transferShipmentsQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      await this.store.dispatch('transferShipment/updateTransferShipmentQuery', { ...transferShipmentsQuery })
    },
    async updateTransferShipmentQuery(size: any) {
      const transferShipmentsQuery = JSON.parse(JSON.stringify(this.transferShipments.query))

      transferShipmentsQuery.viewSize = size
      await this.store.dispatch('transferShipment/updateTransferShipmentQuery', { ...transferShipmentsQuery })
    },
    async viewShipmentDetail(shipmentInformation: any) {
      await this.store.dispatch('transferShipment/setCurrentShipment', { shipmentId: shipmentInformation.shipmentId });
      if (!this.isDesktop && this.currentShipment) {
        this.router.push({ path: `/transfer-shipments/${shipmentInformation.shipmentId}` });
        return;
      }
      if (this.currentShipment && !this.isShipmentDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isShipmentDetailAnimationCompleted = true;
      }      
    },
    async fetchShipmentMethodAndCarriers() {
      const payload = {
        "entityName": "ProductStoreShipmentMeth",
        "inputFields": {
          "productStoreId": this.currentEComStore?.productStoreId,
        } as any,
        "fieldList": [ "shipmentMethodTypeId", "partyId" ],
        "noConditionFind": "Y",
        "viewSize": 200,
        "viewIndex": 0,
        "distinct": "Y",
        "orderBy": "shipmentMethodTypeId ASC"
      }

      try {
        const resp = await TransferShipmentService.fetchShipmentMethodAndCarriers(payload)

        if (resp.status == 200 && !hasError(resp)) {
          this.shipmentMethodTypeIds = [...new Set(resp.data.docs.map((doc: any) => doc.shipmentMethodTypeId))]
          this.store.dispatch('util/fetchShipmentMethodTypeDesc', this.shipmentMethodTypeIds)

          this.carrierPartyIds = [...new Set(resp.data.docs.map((doc: any) => doc.partyId))]
          this.store.dispatch('util/fetchPartyInformation', this.carrierPartyIds)
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch shipment methods and carriers', err)
      }
    },
    async updateQueryString(queryString: string) {
      const transferShipmentsQuery = JSON.parse(JSON.stringify(this.transferShipments.query))

      transferShipmentsQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      transferShipmentsQuery.queryString = queryString
      await this.store.dispatch('transferShipment/updateTransferShipmentQuery', { ...transferShipmentsQuery })
      this.searchedQuery = queryString;
    },
    async updateSelectedShipmentMethods (method: string) {
      const transferShipmentsQuery = JSON.parse(JSON.stringify(this.transferShipments.query))

      const selectedShipmentMethodTypeIds = transferShipmentsQuery.selectedShipmentMethodTypeIds
      const index = selectedShipmentMethodTypeIds.indexOf(method)
      if (index < 0) {
        selectedShipmentMethodTypeIds.push(method)
      } else {
        selectedShipmentMethodTypeIds.splice(index, 1)
      }

      // making view size default when changing the shipment method to correctly fetch orders
      transferShipmentsQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      transferShipmentsQuery.selectedShipmentMethodTypeIds = selectedShipmentMethodTypeIds

      this.store.dispatch('transferShipment/updateTransferShipmentQuery', { ...transferShipmentsQuery })
    },
    async updateSelectedCarrierPartyIds (carrierPartyId: string) {
      const transferShipmentsQuery = JSON.parse(JSON.stringify(this.transferShipments.query))

      const selectedCarrierPartyIds = transferShipmentsQuery.selectedCarrierPartyIds
      const index = selectedCarrierPartyIds.indexOf(carrierPartyId)
      if (index < 0) {
        selectedCarrierPartyIds.push(carrierPartyId)
      } else {
        selectedCarrierPartyIds.splice(index, 1)
      }

      // making view size default when changing the shipment method to correctly fetch orders
      transferShipmentsQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
      transferShipmentsQuery.selectedCarrierPartyIds = selectedCarrierPartyIds

      this.store.dispatch('transferShipment/updateTransferShipmentQuery', { ...transferShipmentsQuery })
    },
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      copyToClipboard,
      checkmarkDoneOutline,
      downloadOutline,
      ellipsisVerticalOutline,
      getFeature,
      hasPermission,
      optionsOutline,
      printOutline,
      router,
      store
    }
  }
});
</script>
<style scoped>
  ion-note {
    align-self: center;
    padding: 0;
  }
</style>
