<template>
  <!-- Rendered outside the app's split pane: Ionic 8 treats any menu inside a visible split pane as a
       side pane, which hides the button that opens it. Deferred, since ion-app isn't in the document
       yet while the first page renders. -->
  <Teleport defer to="ion-app">
    <ion-menu v-bind="$attrs" type="overlay" side="end">
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
  </Teleport>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonItem, IonList, IonMenu, IonRadio, IonRadioGroup, IonTitle, IonToolbar, menuController } from "@ionic/vue";
import { computed } from "vue";
import { useOrderStore } from "@/store/order";
import { emitter, translate } from "@common";
import router from "@/router";

// The menu-id and content-id attributes belong on the teleported menu, not the component root.
defineOptions({ inheritAttrs: false });

// A page that counts its own orders (the live Open page) passes its total; others use the store's.
const props = defineProps<{ total?: number }>();

const route = router.currentRoute.value;

const title = computed(() => {
  if (route.name === "OpenOrders") return "Picklist Size";
  return "Result Size";
});

const viewSize = computed(() => {
  if (route.name === "OpenOrders") return useOrderStore().getOpenOrders.query.viewSize;
  if (route.name === "InProgress") return useOrderStore().getInProgressOrders.query.viewSize;
  if (route.name === "Completed") return useOrderStore().getCompletedOrders.query.viewSize;
  return 0;
});

const total = computed(() => {
  if(props.total !== undefined) {return props.total;}
  if (route.name === "OpenOrders") return useOrderStore().getOpenOrders.total;
  if (route.name === "InProgress") return useOrderStore().getInProgressOrders.total;
  if (route.name === "Completed") return useOrderStore().getCompletedOrders.total;
  return 0;
});

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
