<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Store Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-item>
        {{currentFacility}}
        <ion-label>{{ $t("Store") }}</ion-label>
        <ion-select :value="currentFacility.facilityId" @ionChange="setFacility($event)">
          <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-card>
        <ion-item lines="none">
          <ion-label class="text-wrap">{{ $t("Documents to print when packing orders") }}</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Shipping label") }}</ion-label>
          <ion-checkbox slot="end" />
        </ion-item>
        <ion-item lines="none">
          <ion-label>{{ $t("Packing slip") }}</ion-label>
          <ion-checkbox slot="end" />
        </ion-item>
      </ion-card>

      <ion-card>
        <ion-item lines="none">
          <ion-label>{{ $t("Fulfillment") }} : {{ $t("On") }}</ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-label class="text-wrap">{{ $t("has outstanding orders and in progress orders.", {storeName: "Broadway", outstandingOrder: 47, progressOrder: 77}) }}</ion-label>
        </ion-item>
        <div class="actions">
          <div>
            <ion-button fill="outline" color="secondary" size="medium">{{ $t("Recycle all open orders") }}</ion-button>
            <ion-button fill="outline" color="secondary" size="medium">{{ $t("Recycle all orders") }}</ion-button>
          </div>
          <div>
            <ion-button fill="outline" color="danger" size="medium">{{ $t("Turn off fulfillment") }}</ion-button>
          </div>
        </div>

        <ion-item class="mobile-only">
          <ion-button fill="clear">{{ $t("Recycle all open orders") }}</ion-button>
          <ion-button slot="end" fill="clear" color="medium" @click="RecyclePopover">
            <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
          </ion-button>
        </ion-item>
      </ion-card>

      <ion-item>
        <ion-label>Asia / Cullcutta</ion-label>
        <ion-button fill="outline">{{ $t("Change") }}</ion-button>
      </ion-item>
      <ion-item>
        <ion-label>{{ userProfile !== null ? userProfile.partyName : '' }}</ion-label>
        <ion-button fill="outline" color="medium" @click="logout()">{{ $t("Logout") }}</ion-button>
      </ion-item>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonButton, 
  IonCard, 
  IonCheckbox, 
  IonContent, 
  IonHeader,
  IonIcon, 
  IonItem, 
  IonLabel, 
  IonMenuButton,
  IonPage, 
  IonSelect, 
  IonSelectOption, 
  IonTitle, 
  IonToolbar,
  popoverController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { ellipsisVerticalOutline } from 'ionicons/icons'
import Popover from '@/views/RecyclePopover.vue'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Settings',
  components: { 
    IonButton,
    IonCard,
    IonCheckbox,
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonLabel, 
    IonMenuButton,
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle, 
    IonToolbar
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility'
    })
  },
  methods: {
    async RecyclePopover(ev: Event) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
    logout () {
      this.store.dispatch('user/logout').then(() => {
        this.store.dispatch('picklist/clearPicklist')
        this.router.push('/login');
      })
    },
    setFacility (facility: any) {
      if (this.userProfile){
        this.userProfile.facilities.map((fac: any) => {
          if (fac.facilityId == facility['detail'].value) {
            this.store.dispatch('user/setFacility', {'facility': fac});
          }
        })
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      ellipsisVerticalOutline,
      router,
      store
    }
  }
});
</script>

<style scoped>
.text-wrap {
  white-space: normal;
}
</style>