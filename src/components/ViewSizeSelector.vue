<template>
  <ion-menu type="overlay" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t(title) }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-radio-group :value="viewSize" @ionChange="updateViewSize($event.detail.value)">
          <ion-item v-for="count in prepareViewSizeOptions()" :key="count">
            <ion-radio slot="start" :value="count"/>
            <ion-label>{{ count }} {{ $t('orders') }}</ion-label>
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
  IonLabel,
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

export default defineComponent({
  name: "ViewSizeSelector",
  components: {
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonRadio,
    IonRadioGroup,
    IonTitle,
    IonToolbar
  },
  methods: {
    prepareViewSizeOptions () {
      // creating an array of numbers using Array.keys method and then multiplying each by 5
      return [ ...Array(Math.ceil(this.total / 5)).keys() ].map( i => {
        const count = (i+1) * 5
        // added check that if the count is greater than the total orders available then assigning orders total as size option
        return count > this.total ? this.total : count
      })
    },
    async updateViewSize(size: number) {
      // TODO: multiple api calls being made as viewSize is updated after fetching the orders
      // not updating viewSize and calling solr-query when size in state and clicked size are same
      // TODO: adding this check handles issue of multiple api calls, but results in wrong behaviour
      if(this.viewSize == size) {
        return;
      }

      emitter.emit('updateOrderQuery', { filter: 'viewSize', value: size })
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
    }

    return {
      store,
      route,
      title,
      total,
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