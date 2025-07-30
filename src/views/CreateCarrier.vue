<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-back-button default-href="/carriers" slot="start"></ion-back-button>
          <ion-title>{{ translate("Create carrier") }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <main>
          <ion-item>
            <ion-input label-placement="floating" v-model="carrier.groupName" @ionBlur="setCarrierPartyId($event)">
              <div slot="label">{{ translate("Name") }} <ion-text color="danger">*</ion-text></div>
            </ion-input>
          </ion-item>
          <ion-item>
            <ion-input label-placement="floating" :label="translate('ID')" v-model="carrier.partyId"/>
          </ion-item>
          <ion-button class="ion-margin-top" @click="createCarrier()">
            {{ translate("Setup methods") }}
            <ion-icon slot="end" :icon="arrowForwardOutline"/>
          </ion-button>
        </main>
      </ion-content>
    </ion-page>
  </template>
  
  <script lang="ts">
  import {
    IonButton,
    IonBackButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonPage,
    IonText,
    IonTitle,
    IonToolbar,
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import { mapGetters, useStore } from "vuex";
  import { useRouter } from 'vue-router'
  import {
    addOutline,
    arrowForwardOutline
  } from 'ionicons/icons';
  import { translate } from "@hotwax/dxp-components";
  import { generateInternalId, showToast } from "@/utils";
  import { CarrierService } from '@/services/CarrierService';
  import { hasError } from '@/adapter'
  import logger from '@/logger'


  export default defineComponent({
    name: "CreateCarrier",
    components: {
      IonButton,
      IonBackButton,
      IonContent,
      IonHeader,
      IonIcon,
      IonInput,
      IonItem,
      IonPage,
      IonText,
      IonTitle,
      IonToolbar,
    },
    computed: {
      ...mapGetters({
        facilities: 'util/getFacilities'
      })
    },
    data() {
      return {
        carrier: {} as any
      }
    },
    async ionViewWillEnter() {
      this.clearCarrierData()
    },
    methods: {
      clearCarrierData() {
        this.carrier = {}
      },
      setCarrierPartyId(event: any) {
        this.carrier.partyId = generateInternalId(event.target.value)
      },
      async createCarrier() {
        if (!this.carrier.groupName.trim()) {
          showToast(translate("Carrier name can not be empty."));
          return;
        }
        const payload = {
          groupName: this.carrier.groupName.trim(),
          partyId: this.carrier.partyId.trim(),
          partyTypeId: "PARTY_GROUP"
        }
        try {
          const response = await CarrierService.createCarrier(payload);
          if (!hasError(response)) {
            this.store.dispatch('carrier/clearShipmentMethodQuery')
            this.$router.replace({ path: `/shipment-methods-setup/${response.data.partyId}` })
          }
        } catch (err: any) {
          logger.error("error", err);
          showToast("Failed to create carrier.")
        }        
      }
    },
    setup() {
      const store = useStore();
      const router = useRouter();
  
      return {
        store,
        router,
        addOutline,
        arrowForwardOutline,
        translate
      };
    }
  });
  </script>
  
  <style scoped>
  
    @media (min-width: 700px) {
      main {
        max-width: 375px;
        margin: auto;
      }
    }
  
  </style>