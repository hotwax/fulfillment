<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-back-button default-href="/tabs/users" slot="start"></ion-back-button>
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
  import { generateInternalId } from "@/utils";
  import { CarrierService } from '@/services/CarrierService';

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
        const partyId = await CarrierService.createCarrier({...this.carrier, partyTypeId: "PARTY_GROUP"});
        if (partyId) {
          this.$router.replace({ path: `/shipment-methods-setup/${partyId}` })
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