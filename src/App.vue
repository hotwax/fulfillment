<template>
  <ion-app>
    <IonSplitPane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content" />
    </IonSplitPane>
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { defineComponent } from 'vue';
import Menu from '@/components/Menu.vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"

export default defineComponent({
  name: 'App',
  components: {
    IonApp,  
    IonRouterOutlet, 
    IonSplitPane,
    Menu
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

<style scoped>
ion-split-pane {
  --side-width: 304px;
}
</style>