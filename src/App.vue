<template>
  <ion-app>
    <IonSplitPane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content" />
    </IonSplitPane>
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane, loadingController } from '@ionic/vue';
import { defineComponent } from 'vue';
import Menu from '@/components/Menu.vue';
import emitter from "@/event-bus";
import { useStore, mapGetters } from 'vuex';
import { updateInstanceUrl, updateToken } from '@hotwax/oms-api';

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
      loader: null as any
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
    updateToken(this.userToken)
    updateInstanceUrl(this.instanceUrl)
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
    updateToken('')
    updateInstanceUrl('')
  },
  computed: {
    ...mapGetters({
      userToken: 'user/getUserToken',
      instanceUrl: 'user/getInstanceUrl'
    })
  },
  setup() {
    const store = useStore();
    return {
      store
    };
  },
});
</script>

<style scoped>
ion-split-pane {
  --side-width: 304px;
}
</style>