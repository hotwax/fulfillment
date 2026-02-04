<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal" data-testid="create-shipment-method-modal-close-button"> 
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Create shipment method") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-item>
        <ion-input label-placement="floating" v-model="shipmentMethod.description" @ionBlur="setShipmentMethodTypeId($event)" data-testid="create-shipment-method-modal-name-input">
          <div slot="label">{{ translate("Name") }} <ion-text color="danger">*</ion-text></div>
        </ion-input>
      </ion-item>
      <ion-item>
        <ion-input label-placement="floating" v-model="shipmentMethod.shipmentMethodTypeId" data-testid="create-shipment-method-modal-id-input">
          <div slot="label">{{ translate("ID") }} <ion-text color="danger">*</ion-text></div>
        </ion-input>
      </ion-item>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createShipmentMethod()" data-testid="create-shipment-method-modal-save-button">
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
        shipmentMethods: "carrier/getFilteredShipmentMethods",
        currentCarrier: "carrier/getCurrent"
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
        if (!this.shipmentMethod.description?.trim() || !this.shipmentMethod.shipmentMethodTypeId?.trim()) {
          showToast(translate('Please fill all the required fields'))
          return;
        }

        try {
          let resp = await CarrierService.createShipmentMethod(this.shipmentMethod);
          if (!hasError(resp)) {
            showToast(translate("Shipment method created successfully."))
            await this.updateCarrierShipmentMethodAssociation()
            await this.store.dispatch('carrier/fetchShipmentMethodTypes')
            await this.store.dispatch('carrier/fetchCarrierShipmentMethods', {partyId: this.currentCarrier.partyId})
            await this.store.dispatch('carrier/checkAssociatedShipmentMethods')
            await this.store.dispatch('carrier/checkAssociatedProductStoreShipmentMethods')
            modalController.dismiss()
          } else {
            throw resp.data
          }
        } catch(err: any) {
          let errorMessage = translate('Failed to create shipment method');
          if (err?.response?.data?.error?.message) {
            errorMessage = err.response.data.error.message
          }
          logger.error('error', err)
          showToast(errorMessage);
        }
      },
      async updateCarrierShipmentMethodAssociation() {
        try {
          const payload = {
            shipmentMethodTypeId: this.shipmentMethod.shipmentMethodTypeId,
            partyId: this.currentCarrier.partyId,
            roleTypeId: "CARRIER",
            sequenceNumber: 1 //starting sequencing from 1
          } as any

          let currentCarrierShipmentMethods = this.currentCarrier.shipmentMethods ? JSON.parse(JSON.stringify(this.currentCarrier.shipmentMethods)) : {}
          const values = Object.values(currentCarrierShipmentMethods) as any

          //calculating next sequence number by adding one to sequence number of last shipment methods in the list
          const sequenceNumber = values[values.length - 1].sequenceNumber
          payload.sequenceNumber = sequenceNumber ? sequenceNumber + 1 : 1;

          const resp = await CarrierService.addCarrierShipmentMethod(payload)
          if (hasError(resp)) {
            throw resp.data;
          }
        } catch (err: any) {
          logger.log(err)
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