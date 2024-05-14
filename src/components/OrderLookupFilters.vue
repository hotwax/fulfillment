<template>
  <ion-menu type="overlay" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-list-header><h3>{{ translate("Brand") }}</h3></ion-list-header>
        <ion-item v-for="productStore in productStoreOptions" :key="productStore">
          <ion-checkbox :checked="isProductStoreSelected(productStore)" @ionChange="updateAppliedFilters($event['detail'].checked, 'productStore', productStore)">
            <ion-label>{{ productStore }}</ion-label>
          </ion-checkbox>
        </ion-item>
        <ion-label class="ion-margin" v-if="!productStoreOptions.length">{{ translate("No brands found") }}</ion-label>
      </ion-list>
      <ion-list>
        <ion-list-header><h3>{{ translate("Type") }}</h3></ion-list-header>
        <ion-item :disabled="!ordersList.orders.length">
          <ion-checkbox :checked="query.storePickup" @ionChange="updateAppliedFilters($event['detail'].checked, 'storePickup')">
            <ion-label>{{ translate("Store pickup") }}</ion-label>
          </ion-checkbox>
        </ion-item>
        <ion-item :disabled="!ordersList.orders.length">
          <ion-checkbox :checked="query.shipFromStore" @ionChange="updateAppliedFilters($event['detail'].checked, 'shipFromStore')">
            <ion-label>{{ translate("Ship from store") }}</ion-label>
          </ion-checkbox>
        </ion-item>
        <!-- <ion-item>
          <ion-checkbox :checked="query.unfillable" @ionChange="updateAppliedFilters($event['detail'].checked, 'unfillable')">
            <ion-label>{{ translate("Reject Item") }}</ion-label>
          </ion-checkbox>
        </ion-item> -->
      </ion-list>
      <ion-list>
        <ion-list-header>
          <h3>{{ translate("Fulfillment") }}</h3>
        </ion-list-header>
        <ion-item>
          <ion-select :selected-text="!query.status.length ? translate('All') : query.status.length > 1 ? query.status.length + translate('items selected') : query.status" :label="translate('Status')" :disabled="!orderStatusOptions.length" :multiple="true" :value="query.status" @ionChange="updateAppliedFilters($event['detail'].value, 'status')" interface="popover">
            <ion-select-option v-for="status in orderStatusOptions" :key="status" :value="status">{{ translate(status) }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select :selected-text="!query.facility.length ? translate('All') : query.facility.length > 1 ? query.facility.length + translate('items selected') : query.facility" :label="translate('Facility')" :disabled="!facilityOptions.length" :multiple="true" :value="query.facility" @ionChange="updateAppliedFilters($event['detail'].value, 'facility')" interface="popover">
            <ion-select-option v-for="facility in facilityOptions" :key="facility" :value="facility">{{ facility }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
      <ion-list>
        <ion-list-header><h3>{{ translate("Channel") }}</h3></ion-list-header>
        <ion-item v-for="channel in channelOptions" :key="channel">
          <ion-checkbox :checked="isChannelSelected(channel)" @ionChange="updateAppliedFilters($event['detail'].checked, 'channel', channel)">
            <ion-label>{{ translate(channel) }}</ion-label>
          </ion-checkbox>
        </ion-item>
        <ion-label class="ion-margin" v-if="!channelOptions.length">{{ translate("No channels found") }}</ion-label>
      </ion-list>
      <ion-list>
        <ion-list-header><h3>{{ translate("Date") }}</h3></ion-list-header>
        <ion-item>
          <ion-select :label="translate('Date range')" :disabled="!ordersList.orders.length" :value="query.date" @ionChange="updateAppliedFilters($event['detail'].value, 'date')" interface="popover">
            <ion-select-option v-for="range in dateRanges" :key="range.label" :value="range.value">{{ range.label }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-datetime presentation="date" v-if="!query.date"></ion-datetime>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonCheckbox,
  IonContent,
  IonDatetime,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { close, checkmarkOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { translate } from '@hotwax/dxp-components'; 

export default defineComponent({
  name: 'OrderLookupFilters',
  components: {
    IonCheckbox,
    IonContent,
    IonDatetime,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonMenu,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
  },
  computed: {
    ...mapGetters({
      query: 'orderLookup/getOrderQuery',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
      facilityOptions: "orderLookup/getFacilityOptions",
      productStoreOptions: "orderLookup/getProductStoreOptions",
      channelOptions: "orderLookup/getChannelOptions",
      orderStatusOptions: "orderLookup/getOrderStatusOptions",
      ordersList: 'orderLookup/getOrders'
    })
  },
  data() {
    return {
      dateRanges: [{
        label: "Last 7 days",
        value: "NOW-7DAY TO NOW"
      }, {
        label: "Last 30 days",
        value: "NOW-30DAY TO NOW"
      }]
    }
  },
  methods: {
    async updateAppliedFilters(value: string | boolean, filterName: string, filterLabel?: string) {
      if (value === this.query[filterName]) {
        return;
      }

      let updatedValue = []
      if(filterName === "channel") {
        updatedValue = JSON.parse(JSON.stringify(this.query.channel))
        value ? updatedValue.push(filterLabel) : updatedValue.splice(updatedValue.indexOf(filterLabel), 1)
      }

      if(filterName === "productStore") {
        updatedValue = JSON.parse(JSON.stringify(this.query.productStore))
        value ? updatedValue.push(filterLabel) : updatedValue.splice(updatedValue.indexOf(filterLabel), 1)
      }

      // TODO: handle the case when the applied filter type is date, as in that case the action is called
      // multiple times (two times when date is applied and three times when date filter is removed)
      await this.store.dispatch('orderLookup/updateAppliedFilters', { value: updatedValue.length ? updatedValue : value, filterName })
    },
    isProductStoreSelected(value: string) {
      return this.query.productStore.includes(value)
    },
    isChannelSelected(value: string) {
      return this.query.channel.includes(value)
    }
  },
  setup() {
    const store = useStore();
    const orderStatus = JSON.parse(process.env.VUE_APP_ORDER_STATUS as any)

    return {
      close,
      checkmarkOutline,
      orderStatus,
      store,
      translate
    }
  }
})
</script>

<style scoped>
ion-modal {
  --width: 290px;
  --height: 382px;
  --border-radius: 8px;
}
</style>
