<template>
    <ion-page>      
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-title>{{ translate('Carriers') }}</ion-title>
        </ion-toolbar>
      </ion-header>
      
      <ion-content>
        <template v-if="carriers.total">
          <div class="results">
            <ion-list>
              <ion-item v-for="(carrier, index) in carriers.list" :key="index" @click="viewCarrierDetail(carrier)" button detail>
                <ion-label>
                  <p class="overline">{{ carrier.partyId }}</p>
                  {{ carrier.groupName }}
                </ion-label>
                <ion-note slot="end"> {{carrier.shipmentMethodCount}} {{ translate('methods') }}</ion-note>
              </ion-item>
            </ion-list>
          </div>
        </template>
        <div v-else class="empty-state">
          <p>
            {{ translate("No carrier found.") }}
          </p>
        </div>
      </ion-content>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createCarrier()">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-page>
  </template>
  
  <script lang="ts">
  import { 
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon, 
    IonItem, 
    IonLabel, 
    IonList,
    IonNote,
    IonPage, 
    IonTitle, 
    IonToolbar
  } from '@ionic/vue';
  import { defineComponent } from 'vue';
  import { mapGetters, useStore } from 'vuex';
  import { useRouter } from 'vue-router';
  import { translate } from '@hotwax/dxp-components';
  import { Actions } from '@/authorization'
  import { addOutline } from 'ionicons/icons';
  
  export default defineComponent({
    name: 'Carriers',
    components: {
      IonContent, 
      IonFab,
      IonFabButton,
      IonHeader,
      IonIcon, 
      IonItem, 
      IonLabel, 
      IonList,
      IonNote,
      IonPage, 
      IonTitle, 
      IonToolbar
    },
    computed: {
      ...mapGetters({
        carriers: 'carrier/getCarriers',
      })
    },
    methods: {
      async viewCarrierDetail(carrier: any) {
        await this.store.dispatch('carrier/updateCurrentCarrier', carrier)
        this.router.push({ path: `/carrier-details/${carrier.partyId}` })
      },
      createCarrier () {
        this.router.push({ path: '/create-carrier' })
      }
    },
    async ionViewWillEnter () {
      await this.store.dispatch('carrier/fetchCarriers')
      await this.store.dispatch('carrier/clearShipmentMethodQuery')
    },
    unmounted() {
      this.store.dispatch('carrier/clearCarriers');
    },
    setup() {
      const router = useRouter();
      const store = useStore();
  
      return{
        Actions,
        addOutline,
        router,
        store,
        translate
      }
    }
  });
  </script>
  <style scoped>
    ion-note {
      align-self: center;
      padding: 0;
    }
  </style>