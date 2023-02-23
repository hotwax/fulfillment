<template>
  <ion-menu type="overlay" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("Picklist Size") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-radio-group v-model="size" @ionChange="setPicklistSize()">
          <ion-item v-for="count in preparePicklistSize()" :key="count">
            <ion-radio slot="start" :value="count"/>
            <!-- If the count is greater then length of openOrders then display the length of total orders -->
            <ion-label>{{ count >= openOrders.total ? openOrders.total : count }} {{ $t('orders') }}</ion-label>
            <!-- TODO: add support to display the order items count -->
            <!-- <ion-note slot="end">10 items</ion-note> -->
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
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
import { defineComponent } from "vue";
import { mapGetters, useStore } from 'vuex';

export default defineComponent({
  name: "PicklistMenu",
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
      openOrders: 'order/getOpenOrders',
      currentPicklistSize: 'picklist/getPicklistSize'
    })
  },
  data () {
    return {
      size: 10
    }
  },
  methods: {
    preparePicklistSize () {
      // creating an array of numbers using Array.keys method and then multiplying each by 5
      return [ ...Array(Math.ceil(this.openOrders.total / 5)).keys() ].map( i => {
        const count = (i+1) * 5
        // added check that if the count is greater than the total orders available then assigning orders total as picklistSize
        return count > this.openOrders.total ? this.openOrders.total : count
      })
    },
    setPicklistSize () {
      this.store.dispatch('picklist/setPicklistSize', this.size)
      // closing the menu after selecting any picklist size
      menuController.close()
    }
  },
  setup () {
    const store = useStore();

    return {
      store
    }
  }
});
</script>

<style scoped>
ion-menu::part(backdrop) {
  background-color: transparent;
}
</style>