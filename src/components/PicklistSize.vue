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
            <ion-radio slot="start" :value="count * 5"/>
            <ion-label>{{ (count * 5) >= openOrders.total ? openOrders.total : count * 5}} {{ $t('orders') }}</ion-label>
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
      const size = Math.ceil(this.openOrders.total / 5)
      return size;
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