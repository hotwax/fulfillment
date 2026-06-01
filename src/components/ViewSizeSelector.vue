<template>
  <ion-menu type="overlay" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate(title) }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-radio-group :value="viewSize" @ionChange="updateViewSize($event.detail.value)">
          <ion-item v-for="count in prepareViewSizeOptions()" :key="count">
            <ion-radio label-placement="end" justify="start" :value="count">{{ count }} {{ count === 1 ? translate('order') : translate('orders') }}</ion-radio>
            <!-- TODO: add support to display the order items count -->
            <!-- <ion-note slot="end">10 items</ion-note> -->
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonItem, IonList, IonMenu, IonRadio, IonRadioGroup, IonTitle, IonToolbar, menuController } from "@ionic/vue";
import { computed } from "vue";
import { useOrderStore } from "@/store/order";
import { emitter, translate } from "@common";
import router from "@/router";

const route = router.currentRoute.value;

const title = computed(() => {
  if (route.name === "OpenOrders") return "Picklist Size";
  return "Result Size";
});

const orderState = computed(() => {
  if (route.name === "OpenOrders") return useOrderStore().getOpenOrders;
  if (route.name === "InProgress") return useOrderStore().getInProgressOrders;
  if (route.name === "Completed") return useOrderStore().getCompletedOrders;
  return { query: { viewSize: 0 }, total: 0 };
});

const viewSize = computed(() => orderState.value.query.viewSize);
const total = computed(() => orderState.value.total);

const prepareViewSizeOptions = () => {
  const maxViewSize = total.value > 100 ? 100 : total.value;
  return [...Array(Math.ceil(maxViewSize / 5)).keys()].map((i) => {
    const count = (i + 1) * 5;
    return count > maxViewSize ? maxViewSize : count;
  });
};

const updateViewSize = async (size: number) => {
  if (viewSize.value === size) {
    return;
  }
  emitter.emit("updateOrderQuery", size);
  menuController.close();
};
</script>

<style scoped>
ion-menu::part(backdrop) {
  background-color: transparent;
}
</style>
