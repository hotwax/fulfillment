<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal"> 
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Create shipment method") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-item>
        <ion-input label-placement="floating" v-model="shipmentMethod.description" @ionBlur="setShipmentMethodTypeId($event)">
          <div slot="label">{{ translate("Name") }} <ion-text color="danger">*</ion-text></div>
        </ion-input>
      </ion-item>
      <ion-item>
        <ion-input label-placement="floating" :label="translate('ID')" v-model="shipmentMethod.shipmentMethodTypeId"/>
      </ion-item>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createShipmentMethod()">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </template>
  
  <script lang="ts">
  import { 
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonText,
    IonTitle,
    IonToolbar,
    IonItem,
    modalController
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import { close, closeCircle, saveOutline } from "ionicons/icons";
  import { mapGetters, useStore } from 'vuex';
  import { generateInternalId, showToast } from "@/utils";
  import { translate } from '@hotwax/dxp-components'
  import logger from "@/logger";
  import { hasError } from "@/adapter";
  import { CarrierService } from '@/services/CarrierService';
  
  export default defineComponent({
    name: "CreateShipmentMethodModal",
    components: { 
      IonButtons,
      IonButton,
      IonContent,
      IonFab,
      IonFabButton,
      IonHeader,
      IonIcon,
      IonInput,
      IonText,
      IonTitle,
      IonToolbar,
      IonItem
    },
    data() {
      return {
        filteredShipmentMethods: [],
        toast: null as any,
        shipmentMethod: {} as any
      }
    },
    props:['carrier'],
    computed: {
      ...mapGetters({
        shipmentMethods: "carrier/getFilteredShipmentMethods"
      })
    },
    async ionViewWillEnter() {
      this.filteredShipmentMethods = this.shipmentMethods ? JSON.parse(JSON.stringify(this.shipmentMethods)) : []
    },
    methods: {
      closeModal() {
        modalController.dismiss({
          dismissed: true
        });
      },
      setShipmentMethodTypeId(event: any) {
        this.shipmentMethod.shipmentMethodTypeId = generateInternalId(event.target.value)
      },
      async createShipmentMethod() {
        if (!this.shipmentMethod.description?.trim()) {
          showToast(translate('Please fill all the required fields'))
          return;
        }

        try {
          const resp = await CarrierService.createShipmentMethod(this.shipmentMethod);
          if (!hasError(resp)) {
            showToast(translate("Shipment method created successfully."))
            await this.store.dispatch('carrier/fetchShipmentMethodTypes')
            await this.store.dispatch('carrier/checkAssociatedShipmentMethods')
            await this.store.dispatch('carrier/checkAssociatedProductStoreShipmentMethods')
            modalController.dismiss()
          } else {
            throw resp.data
          }
        } catch(err) {
          logger.log(err)
          showToast(translate("Failed to create shipment method"))
        }
      }
    },
    setup() {
      const store = useStore();
      return {
        close,
        saveOutline,
        closeCircle,
        store,
        translate
      };
    }
  });
  </script>