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
import { IonApp, IonContent, IonHeader, IonItem, IonLabel, IonList, IonMenu, IonNote, IonRadio, IonRouterOutlet, IonTitle, IonToolbar, alertController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { loadingController } from '@ionic/vue';
import { useStore } from './store'
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
    },
    async timeZoneDifferentAlert(payload: any) {
      const alert = await alertController.create({
        header: this.$t("Change time zone"),
        message: this.$t('Would you like to update your time zone to . Your profile is currently set to . This setting can always be changed from the settings menu.', { localTimeZone: payload.localTimeZone, profileTimeZone: payload.profileTimeZone }),
        buttons: [
            {
              text: this.$t("Dismiss"),
              role: 'cancel',
              cssClass: 'secondary'
            },
            {
              text: this.$t("Update time zone"),
              handler: () => {
                this.store.dispatch("user/setUserTimeZone", {
                    "tzId": payload.localTimeZone
                });
              },
            },
          ],
      });
      return alert.present();
    },
  },
  async mounted() {
    emitter.on('timeZoneDifferent', this.timeZoneDifferentAlert);
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
    emitter.off('timeZoneDifferent', this.timeZoneDifferentAlert);
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
  setup() {
    const store = useStore();
    return {
      store
    };
  },
});
</script>