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
import { mapGetters, useStore } from 'vuex';

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
  computed: {
    ...mapGetters({
      inProgressOrders: 'order/getInProgressOrders',
      viewSize: 'util/getViewSize'
    })
  },
  methods: {
    prepareViewSizeOptions () {
      const total = this.inProgressOrders.total
      // creating an array of numbers using Array.keys method and then multiplying each by 5
      const viewSizeOptions = [ ...Array(Math.ceil(total / 5)).keys() ].map( i => {
        const count = (i+1) * 5
        // added check that if the count is greater than the total orders available then assigning orders total as size option
        return count > total ? total : count
      })
      // Added this check, if the viewSize options only have one option to select then making 0th index value as view size, and if having empty view than making view size as 0
      // This condition will become true only in case when the orders total is equal to or less than 5, as we are generating size options with a difference of 5
      if(viewSizeOptions.length <= 1) {
        viewSizeOptions.length == 1 ? this.setViewSize(viewSizeOptions[0]) : this.setViewSize(0)
      } else {
        // Checking that whether the current size exists in the options available, if exist than not changing the size otherwise setting default size.
        // This scenario occurs when we have selected a shipping method having for example 3 orders, so we set the size to 3
        // Now when we de-select the shipping method or select another shipping method than the orders totals will increase,
        // and thus 3 as an option will not be available, thus checking for below condition
        viewSizeOptions.includes(this.viewSize) || (viewSizeOptions.includes(+process.env.VUE_APP_VIEW_SIZE) ? this.setViewSize(+process.env.VUE_APP_VIEW_SIZE) : this.setViewSize(viewSizeOptions[0]))
      }
      return viewSizeOptions;
    },
    async setViewSize(size: number) {
      if(this.viewSize == size) {
        return;
      }
      await this.store.dispatch('util/updateViewSize', size)
    },
    prepareViewSizeOptionss () {
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
      await this.store.dispatch('util/updateViewSize', size)
      if(this.$route.name === 'InProgress') {
        this.store.dispatch('order/fetchInProgressOrders')
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