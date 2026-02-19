<template>
    <ion-page>
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-title>{{ translate("Setup methods") }}</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content>
        <main>
          <ion-list class="items-inline">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="peopleOutline"></ion-icon>
              <ion-label>
                <p class="overline">{{ currentCarrier.partyId }}</p>
                {{ currentCarrier.groupName }}
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
              <ion-toggle v-model="shipmentMethodQuery.showSelected" @ionChange="updateShipmentMethodQuery()">
                {{ translate("Only methods for this carrier") }}
              </ion-toggle>
            </ion-item>
          </ion-list>
          <hr />
          <ShipmentMethods />
        </main>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-buttons slot="end">
            <ion-button fill="solid" color="medium" @click="openCreateShipmentMethodModal()">
              <ion-icon :icon="addCircleOutline" />
              {{ translate("Create shipment method") }}
            </ion-button>
            <ion-button fill="solid" color="primary" @click="viewCarrierDetail()" >
              <ion-icon slot="start" :icon="checkmarkDoneOutline" />
              {{ translate("Finish setup") }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    </ion-page>
  </template>
  
  <script lang="ts">
  import {
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar,
    modalController
  } from '@ionic/vue';
  import { defineComponent } from 'vue';
  import { add, checkmarkDone, barcodeOutline, pricetagOutline, addCircleOutline, addOutline, ellipsisVerticalOutline, peopleOutline, shieldCheckmarkOutline, checkmarkDoneOutline } from 'ionicons/icons';
  import { mapGetters, useStore } from "vuex";
  import { translate } from '@hotwax/dxp-components';

  import { useRouter } from 'vue-router';
  import { Actions } from '@/authorization'
  import { showToast } from '@/utils';
  import ShipmentMethods from '@/components/ShipmentMethods.vue'
  import CreateShipmentMethodModal from '@/components/CreateShipmentMethodModal.vue';

  
  export default defineComponent({
    name: "CarrierShipmentMethods",
    components: {
      IonButton,
      IonButtons,
      IonContent,
      IonHeader,
      IonFooter,
      IonIcon,
      IonItem,
      IonLabel,
      IonList,
      IonPage,
      IonTitle,
      IonToggle,
      IonToolbar,
      ShipmentMethods
    },
    async mounted() {
      await this.store.dispatch('carrier/fetchCarrierDetail', { partyId: this.$route.params.partyId });
      await this.store.dispatch('carrier/fetchShipmentMethodTypes')
    },
    computed: {
      ...mapGetters({
        shipmentMethodQuery: 'carrier/getShipmentMethodQuery',
        currentCarrier: 'carrier/getCurrent'
      }),
    },
    methods: {
      async viewCarrierDetail() {
        await this.store.dispatch('carrier/clearShipmentMethodQuery')
        showToast(translate('Carrier and shipment methods have been set up successfully.'))
        this.router.replace({ path: `/carrier-details/${this.currentCarrier.partyId}` })
      },
      async updateShipmentMethodQuery() {
        await this.store.dispatch('carrier/updateShipmentMethodQuery', this.shipmentMethodQuery)
      },
      async openCreateShipmentMethodModal() {
        const createShipmentMethodModal = await modalController.create({
          component: CreateShipmentMethodModal,
          componentProps: { carrier: this.currentCarrier }
        });
        return createShipmentMethodModal.present();
      },
    }, 
    setup() {
      const store = useStore(); 
      const router = useRouter();
  
      return {
        Actions,
        add,
        addCircleOutline,
        addOutline,
        barcodeOutline,
        checkmarkDone,
        checkmarkDoneOutline,
        ellipsisVerticalOutline,
        pricetagOutline,
        peopleOutline,
        shieldCheckmarkOutline,
        store,
        router,
        translate
      };
    },
  });
  </script>
  
  <style scoped>
  ion-content > main {
    max-width: 1110px;
    margin-right: auto;
    margin-left: auto;
  }

  .items-inline {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(228px, 1fr));
    gap: var(--spacer-xs);
    align-items: start;
    margin-bottom: var(--spacer-lg);
  }

  .list-item {
    --columns-desktop: 5;
  }
  .tablet {
    display: block;
    text-align: center;
  }
  .config-label {
    display: block;
    text-align: center;
  }
  </style>
  