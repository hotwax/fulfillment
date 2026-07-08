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
import { useRoute } from "vue-router";

const route = useRoute();
const orderStore = useOrderStore();

const title = computed(() => {
  if (route.name === "OpenOrders") return "Picklist Size";
  return "Result Size";
});

const orders = computed(() => {
  if (route.name === "OpenOrders") return orderStore.getOpenOrders;
  if (route.name === "InProgress") return orderStore.getInProgressOrders;
  if (route.name === "Completed") return orderStore.getCompletedOrders;
  return {};
});

const viewSize = computed(() => orders.value?.query?.viewSize || 0);
const total = computed(() => orders.value?.total || 0);

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
