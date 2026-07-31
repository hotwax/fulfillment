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
          <ion-select :label="translate('Duration')" interface="popover" :placeholder="translate('Select')" :value="rejectedOrders.query.rejectionPeriodId" @ionChange="applyFilter($event['detail'].value, 'duration')">
            <ion-select-option v-for="rejectionPeriod in rejectionPeriods" :key="rejectionPeriod.id" :value="rejectionPeriod.id">{{ rejectionPeriod.description }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select :label="translate('Reason')" interface="popover" :placeholder="translate('Select')" :value="rejectedOrders.query.rejectionReasons" :multiple="true" @ionChange="applyFilter($event['detail'].value, 'reason')">
            <ion-select-option v-for="rejectionReason in rejectReasons" :key="rejectionReason.enumId" :value="rejectionReason.enumId">{{ rejectionReason.description ? rejectionReason.description : rejectionReason.enumId }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>
  
<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonMenu,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { albumsOutline, banOutline, barChartOutline, calendarNumberOutline, checkmarkDoneOutline, closeOutline, filterOutline, iceCreamOutline, libraryOutline, pulseOutline, settings, shirtOutline, ticketOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'
import { hasError } from '@/adapter';
import logger from '@/logger';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "TransferOrderFilters",
  components: {
    IonContent,
    IonHeader,
    IonItem,
    IonList,
    IonMenu,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
  },
  props: ["queryString"],
  data () {
    return {
      shipmentMethods: [] as Array<any>,
      statuses: [] as Array<any>,
      rejectionPeriods: [] as Array<any>
    }
  },
  computed: {
    ...mapGetters({
      rejectReasons: 'util/getRejectReasons',
      rejectedOrders: 'rejection/getRejectedOrders',
    })
  },
  async mounted() {
    this.store.dispatch('util/fetchRejectReasons')
    this.rejectionPeriods = [{"id": "LAST_TWENTY_FOUR_HOURS", "description": "Last 24 hours"}, {"id": "LAST_SEVEN_DAYS", "description": "Last 7 days"}]
  },
  unmounted() {
    this.store.dispatch('rejection/clearRejectedOrdersFilters');
  },
  methods: {
    async applyFilter(value: any, type: string) {
      const rejectedOrdersQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))
      rejectedOrdersQuery.viewIndex = 0;
      if (type === "duration") {
        rejectedOrdersQuery.rejectionPeriodId = value
      } else if (type === "reason") {
        rejectedOrdersQuery.rejectionReasons = value
      }
      
      await this.store.dispatch('rejection/updateRejectedOrderQuery', { ...rejectedOrdersQuery })
      await this.store.dispatch('rejection/fetchRejectedOrders');
      if (type === "duration") {
        await this.store.dispatch('rejection/fetchRejectionStats')
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