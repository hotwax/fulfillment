<template>
  <ion-menu type="overlay" side="end" content-id="orderLookup-filter">
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
        <ion-item>
          <ion-checkbox :checked="query.storePickup" @ionChange="updateAppliedFilters($event['detail'].checked, 'storePickup')">
            <ion-label>{{ translate("Store pickup") }}</ion-label>
          </ion-checkbox>
        </ion-item>
        <ion-item>
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
          <ion-select :label="translate('Date range')" :value="query.date" @ionChange="updateAppliedFilters($event['detail'].value, 'date')" interface="popover">
            <ion-select-option v-for="range in dateRanges" :key="range.label" :value="range.value">{{ translate(range.label) }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item v-if="query.date === 'custom'">
          <ion-label>{{ translate("From") }}</ion-label>
          <ion-datetime-button datetime="fromDate" @click="enableFromDateFilter()"></ion-datetime-button>
        </ion-item>
        <ion-datetime v-show="enableFromDate" @ionChange="updateAppliedFilters($event['detail'].value, 'fromDate')" id="fromDate" presentation="date" v-model="fromDate" :max="toDate || DateTime.now().toISO()"></ion-datetime>
        <ion-item v-if="query.date === 'custom'">
          <ion-label>{{ translate("To") }}</ion-label>
          <ion-datetime-button datetime="toDate" @click="enableToDateFilter()"></ion-datetime-button>
        </ion-item>
        <ion-datetime v-show="enableToDate" @ionChange="updateAppliedFilters($event['detail'].value, 'toDate')" id="toDate" presentation="date" v-model="toDate" :min="fromDate" :max="DateTime.now().toISO()"></ion-datetime>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script setup lang="ts">
import { IonCheckbox, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonMenu, IonSelect, IonSelectOption, IonTitle, IonToolbar } from "@ionic/vue";
import { computed, ref } from "vue";
import { translate } from "@hotwax/dxp-components";
import { DateTime } from "luxon";
import { useOrderLookupStore } from "@/store/orderLookup";
const query = computed(() => useOrderLookupStore().getOrderQuery);
const facilityOptions = computed(() => useOrderLookupStore().getFacilityOptions);
const productStoreOptions = computed(() => useOrderLookupStore().getProductStoreOptions);
const channelOptions = computed(() => useOrderLookupStore().getChannelOptions);
const orderStatusOptions = computed(() => useOrderLookupStore().getOrderStatusOptions);

const dateRanges = ref([{ label: "Last 7 days", value: "NOW-7DAY TO NOW" }, { label: "Last 30 days", value: "NOW-30DAY TO NOW" }, { label: "Custom", value: "custom" }, { label: "All", value: "" }]);
const fromDate = ref(DateTime.now().toISO());
const toDate = ref(DateTime.now().toISO());
const enableFromDate = ref(false);
const enableToDate = ref(false);

const updateAppliedFilters = async (value: string | boolean, filterName: string, filterLabel?: string) => {
  let updatedValue: any[] = [];
  if (filterName === "channel") {
    updatedValue = JSON.parse(JSON.stringify(query.value.channel));
    value ? updatedValue.push(filterLabel) : updatedValue.splice(updatedValue.indexOf(filterLabel), 1);
  }

  if (filterName === "productStore") {
    updatedValue = JSON.parse(JSON.stringify(query.value.productStore));
    value ? updatedValue.push(filterLabel) : updatedValue.splice(updatedValue.indexOf(filterLabel), 1);
  }

  if (filterName === "date") {
    fromDate.value = DateTime.now().toISO();
    toDate.value = DateTime.now().toISO();
    enableFromDate.value = false;
    enableToDate.value = false;
  }

  await useOrderLookupStore().updateAppliedFilters({ value: filterName === "channel" || filterName === "productStore" ? updatedValue : value, filterName });
};

const isProductStoreSelected = (value: string) => {
  return query.value.productStore.includes(value);
};

const isChannelSelected = (value: string) => {
  return query.value.channel.includes(value);
};

const enableToDateFilter = () => {
  enableFromDate.value = false;
  enableToDate.value = !enableToDate.value;
};

const enableFromDateFilter = () => {
  enableToDate.value = false;
  enableFromDate.value = !enableFromDate.value;
};
</script>

<style scoped>
ion-modal {
  --width: 290px;
  --height: 382px;
  --border-radius: 8px;
}
</style>
