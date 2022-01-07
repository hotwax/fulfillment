<template>
  <ion-app>
    <ion-menu side="end" type="overlay" menu-id="picklist-size" content-id="main">
      <ion-header>
        <ion-toolbar>
          <ion-title>Picklist Size</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-list>
          <ion-radio-group v-model="size" @ionChange="setPicklistSize()">
            <ion-item v-for="count in preparePicklistSize()" :key="count">
              <ion-radio slot="start" :value="count * 5"/>
              <ion-label>{{ (count * 5) >= openOrders.total ? openOrders.total : count * 5}} orders</ion-label>
              <ion-note slot="end">10 items</ion-note>
            </ion-item>
          </ion-radio-group>
        </ion-list>
      </ion-content>
    </ion-menu>
    <ion-router-outlet id="main" />
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonContent, IonHeader, IonItem, IonLabel, IonList, IonMenu, IonNote, IonRadio, IonRadioGroup, IonRouterOutlet, IonTitle, IonToolbar, menuController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { mapGetters, useStore } from 'vuex';

export default defineComponent({
  name: 'App',
  components: {
    IonApp, 
    IonContent, 
    IonHeader, 
    IonItem, 
    IonLabel,
    IonList, 
    IonMenu,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonRouterOutlet,
    IonTitle, 
    IonToolbar
  },
  computed: {
    ...mapGetters({
      openOrders: 'order/getOpenOrders',
      currentPicklistSize: 'picklist/getPicklistSize'
    })
  },
  data() {
    return {
      loader: null as any,
      size: 0
    }
  },
  methods: {
    async presentLoader() {
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: this.$t("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: true
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null as any;
      }
    },
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
  async mounted() {
    this.loader = await loadingController
      .create({
        message: this.$t("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
  setup () {
    const store = useStore();

    return {
      store
    }
  }
});
</script>