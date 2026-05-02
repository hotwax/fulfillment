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

    const title = computed(() => route.name === 'OpenOrders' ? 'Picklist Size' : 'Result Size')

    const orders = computed(() => {
      if(route.name === 'OpenOrders') {
        return store.getters['order/getOpenOrders']
      } else if(route.name === 'InProgress') {
        return store.getters['order/getInProgressOrders']
      } else if(route.name === 'Completed') {
        return store.getters['order/getCompletedOrders']
      }
      return {}
    })

    const viewSize = computed(() => orders.value.query?.viewSize || 0)
    const total = computed(() => orders.value.total || 0)

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