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
  
<script setup lang="ts">
import { IonContent, IonHeader, IonItem, IonList, IonMenu, IonSelect, IonSelectOption, IonTitle, IonToolbar } from "@ionic/vue";
import { computed, defineProps, onMounted, onUnmounted, ref } from "vue";
import { useUtilStore } from "@/store/util";
import { useRejectionStore } from "@/store/rejection";
import { translate } from "@hotwax/dxp-components";

defineProps(["queryString"]);
const rejectionPeriods = ref([] as Array<any>);

const rejectReasons = computed(() => useUtilStore().getRejectReasons);
const rejectedOrders = computed(() => useRejectionStore().getRejectedOrders);

onMounted(() => {
  useUtilStore().fetchRejectReasons();
  rejectionPeriods.value = [{ id: "LAST_TWENTY_FOUR_HOURS", description: "Last 24 hours" }, { id: "LAST_SEVEN_DAYS", description: "Last 7 days" }];
});

onUnmounted(() => {
  useRejectionStore().clearRejectedOrdersFilters();
});

const applyFilter = async (value: any, type: string) => {
  const rejectedOrdersQuery = JSON.parse(JSON.stringify(rejectedOrders.value.query));
  rejectedOrdersQuery.viewIndex = 0;
  if (type === "duration") {
    rejectedOrdersQuery.rejectionPeriodId = value;
  } else if (type === "reason") {
    rejectedOrdersQuery.rejectionReasons = value;
  }

  await useRejectionStore().updateRejectedOrderQuery({ ...rejectedOrdersQuery });
  await useRejectionStore().fetchRejectedOrders();
  if (type === "duration") {
    await useRejectionStore().fetchRejectionStats();
  }
};
</script>
