<template>
  <ion-app>
    <ion-menu side="end" type="overlay" menu-id="filter" content-id="main">
      <ion-header>
        <ion-toolbar>
          <ion-title>Picklist Size</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-list>
          <ion-item>
            <ion-radio slot="start" />
            <ion-label>10 orders</ion-label>
            <ion-note slot="end">10 items</ion-note>
          </ion-item>
          <ion-item>
            <ion-radio slot="start" />
            <ion-label>15 orders</ion-label>
            <ion-note slot="end">17 items</ion-note>
          </ion-item>
          <ion-item>
            <ion-radio slot="start" />
            <ion-label>20 orders</ion-label>
            <ion-note slot="end">22 items</ion-note>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-menu>
    <ion-router-outlet id="main" />
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonContent, IonHeader, IonItem, IonLabel, IonList, IonMenu, IonNote, IonRadio, IonRouterOutlet, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"


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
    IonRouterOutlet,
    IonTitle, 
    IonToolbar
  },
  data() {
    return {
      loader: null as any
    }
  },
  methods: {
    async presentLoader() {
      this.loader = await loadingController
        .create({
          message: this.$t("Click the backdrop to dismiss."),
          translucent: true,
          backdropDismiss: true
        });
      await this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
      }
    }
  },
  mounted() {
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
});
</script>