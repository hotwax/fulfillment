<template>
  <ion-menu type="overlay" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("Picklist Size") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-radio-group :value="currentPicklistSize" @ionChange="setPicklistSize($event.detail.value)">
          <ion-item v-for="count in preparePicklistSizeOptions()" :key="count">
            <ion-radio slot="start" :value="count"/>
            <!-- If the count is greater then length of openOrders then display the length of total orders -->
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
  methods: {
    preparePicklistSizeOptions () {
      // creating an array of numbers using Array.keys method and then multiplying each by 5
      const picklistSizeOptions =  [ ...Array(Math.ceil(this.openOrders.total / 5)).keys() ].map( i => {
        const count = (i+1) * 5
        // added check that if the count is greater than the total orders available then assigning orders total as picklistSize
        return count > this.openOrders.total ? this.openOrders.total : count
      })

      // Added this check as if the picklistSize options only have a single option to select then by default selecting that option
      // This condition will become true only in case when the orders total is equal to or less than 5, as we are generating picklist options with a difference of 5
      if(picklistSizeOptions.length === 1) {
        this.setPicklistSize(picklistSizeOptions[0])
      } else {
        // Checking that whether the current picklist size exists in the options available
        // This scenario occurs when we have selected a shipping method having for example 3 orders, so we set the picklist size to 3
        // Now when we de-select the shipping method or select another shipping method than the orders totals will increase,
        // and thus 3 as an picklist option will not be available, thus checking for below condition

        // Using + operator to convert string into number, as env entries always return a string
        this.setPicklistSize(picklistSizeOptions.includes(this.currentPicklistSize) ? this.currentPicklistSize : +process.env.VUE_APP_VIEW_SIZE)
      }

      return picklistSizeOptions;
    },
    async setPicklistSize(size: number) {
      await this.store.dispatch('picklist/setPicklistSize', size)
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