<template>
  <ion-menu data-testid="view-size-selector-menu" type="overlay" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate(title) }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-radio-group data-testid="view-size-selector-radio-group" :value="viewSize" @ionChange="updateViewSize($event.detail.value)">
          <ion-item data-testid="view-size-selector-item" v-for="count in prepareViewSizeOptions()" :key="count">
            <ion-radio data-testid="view-size-selector-radio" label-placement="end" justify="start" :value="count">{{ count }} {{ count === 1 ? translate('order') : translate('orders') }}</ion-radio>
            <!-- TODO: add support to display the order items count -->
            <!-- <ion-note slot="end">10 items</ion-note> -->
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import emitter from "@/event-bus";
import {
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonMenu,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar,
  menuController
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { useRoute } from "vue-router";
import { useStore } from 'vuex';
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "ViewSizeSelector",
  components: {
    IonContent,
    IonHeader,
    IonItem,
    IonList,
    IonMenu,
    IonRadio,
    IonRadioGroup,
    IonTitle,
    IonToolbar
  },
  methods: {
    prepareViewSizeOptions () {
      // Added check to only have 100 as the max option in size selector
      const maxViewSize = this.total > 100 ? 100 : this.total
      // creating an array of numbers using Array.keys method and then multiplying each by 5
      return [ ...Array(Math.ceil(maxViewSize / 5)).keys() ].map( i => {
        const count = (i+1) * 5
        // added check that if the count is greater than the total orders available then assigning orders total as size option
        return count > maxViewSize ? maxViewSize : count
      })
    },
    async updateViewSize(size: number) {
      // TODO: multiple api calls being made as viewSize is updated after fetching the orders
      // not updating viewSize and calling solr-query when size in state and clicked size are same
      // TODO: adding this check handles issue of multiple api calls, but results in wrong behaviour
      if(this.viewSize == size) {
        return;
      }

      emitter.emit('updateOrderQuery', size)
      // closing the menu after selecting any view size
      menuController.close()
    }
  },
  setup () {
    const store = useStore();
    const route = useRoute();

    let title = 'Result Size'
    let viewSize: any = 0
    let total: any = 0

    if(route.name === 'OpenOrders') {
      title = 'Picklist Size'
      // TODO: check if we can use a single getter to get the data, currently when trying that the values are not reactive
      viewSize = computed(() => store.getters['order/getOpenOrders'].query.viewSize)
      total = computed(() => store.getters['order/getOpenOrders'].total)
    } else if(route.name === 'InProgress') {
      // TODO: check if we can use a single getter to get the data, currently when trying that the values are not reactive
      viewSize = computed(() => store.getters['order/getInProgressOrders'].query.viewSize)
      total = computed(() => store.getters['order/getInProgressOrders'].total)
    } else if(route.name === 'Completed') {
      // TODO: check if we can use a single getter to get the data, currently when trying that the values are not reactive
      viewSize = computed(() => store.getters['order/getCompletedOrders'].query.viewSize)
      total = computed(() => store.getters['order/getCompletedOrders'].total)
    }

    return {
      store,
      route,
      title,
      total,
      translate,
      viewSize
    }
  }
});
</script>

<style scoped>
ion-menu::part(backdrop) {
  background-color: transparent;
}
</style>