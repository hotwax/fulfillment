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
          <ion-checkbox label-placement="start" :checked="transferOrders.query.selectedShipmentMethods.includes(shipmentMethod.val)">
            {{ translate(getShipmentMethodDesc(shipmentMethod.val)) }}
          </ion-checkbox>
        </ion-item>

        <ion-item>
          <ion-label class="ion-text-wrap">
            <p>{{ translate("Status") }}</p>
          </ion-label>
        </ion-item>
        <ion-item button v-for="(status, index) in statuses" :key="index" @click="applyFilter(status.val, 'status')">
          <ion-checkbox label-placement="start" :checked="transferOrders.query.selectedStatuses.includes(status.val)">
            {{ translate(getStatusDesc(status.val)) }}
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
import { defineComponent, computed } from "vue";
import { albumsOutline, banOutline, barChartOutline, calendarNumberOutline, checkmarkDoneOutline, closeOutline, filterOutline, iceCreamOutline, libraryOutline, pulseOutline, settings, shirtOutline, ticketOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'
import { translate, useUserStore } from '@hotwax/dxp-components';

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
  props: ["queryString", "shipmentMethods", "statuses"],
  computed: {
    ...mapGetters({
      transferOrders: 'transferorder/getTransferOrders',
      getStatusDesc: 'util/getStatusDesc',
      getShipmentMethodDesc: 'util/getShipmentMethodDesc',
    })
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

      transferOrdersQuery.viewIndex = 0;
      await this.store.dispatch('transferorder/updateTransferOrderQuery', { ...transferOrdersQuery })
    },
  },
  setup() {
    const store = useStore();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      albumsOutline,
      banOutline,
      barChartOutline,
      calendarNumberOutline,
      checkmarkDoneOutline,
      closeOutline,
      currentFacility,
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