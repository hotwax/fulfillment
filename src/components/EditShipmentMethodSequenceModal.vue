<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal" data-testid="edit-shipment-method-sequence-modal-close-button"> 
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Sequence methods") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <main>
        <div v-if="shipmentMethods.length">
          <ion-reorder-group @ionItemReorder="doReorder($event)" :disabled="false" data-testid="edit-shipment-method-sequence-modal-reorder-group">
            <div class="list-item" v-for="shipmentMethod in filteredShipmentMethods" :key="shipmentMethod.shipmentMethodTypeId" :data-testid="`edit-shipment-method-sequence-modal-item-${shipmentMethod.shipmentMethodTypeId}`">
              <ion-item lines="none">
                <ion-label>
                  {{ shipmentMethod.description ? shipmentMethod.description : shipmentMethod.shipmentMethodTypeId }}
                  <p>{{ shipmentMethod.shipmentMethodTypeId }}</p>
                </ion-label>
              </ion-item>
              <ion-reorder />
            </div>
          </ion-reorder-group>
        </div>
        <div class="empty-state" v-else>
          <p>{{ translate("No shipment methods found.") }}</p>
        </div>
      </main>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="saveShipmentMethodsOrder()" data-testid="edit-shipment-method-sequence-modal-save-button">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </template>
  
  <script lang="ts">
  import { 
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonReorder,
    IonReorderGroup,
    IonTitle,
    IonToolbar,
    modalController
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import { close, closeCircle, saveOutline } from "ionicons/icons";
  import { mapGetters, useStore } from 'vuex';
  import { showToast, sortItems } from '@/utils';
  import { CarrierService } from '@/services/CarrierService';
  import { translate } from '@hotwax/dxp-components'
  
  export default defineComponent({
    name: "SequenceShipmentMethods",
    components: { 
      IonButton,
      IonButtons,
      IonContent,
      IonFab,
      IonFabButton,
      IonHeader,
      IonIcon,
      IonItem,
      IonLabel,
      IonReorder,
      IonReorderGroup,
      IonTitle,
      IonToolbar
    },
    data() {
      return {
        filteredShipmentMethods: [] as any,
        toast: null as any
      }
    },
    computed: {
      ...mapGetters({
        currentCarrier: "carrier/getCurrent",
        shipmentMethods: "carrier/getFilteredShipmentMethods"
      })
    },
    async mounted() {
      const methods = this.shipmentMethods.filter((shipmentMethod: any) => shipmentMethod.isChecked)
      sortItems(methods, "sequenceNumber")
      this.filteredShipmentMethods = methods;
    },
    methods: {
      closeModal() {
        modalController.dismiss({
          dismissed: true
        });
      },
      async doReorder(event: CustomEvent) {
        const previousSeq = JSON.parse(JSON.stringify(this.filteredShipmentMethods))

        // returns the updated sequence after reordering
        const updatedSeq = event.detail.complete(JSON.parse(JSON.stringify(this.filteredShipmentMethods)));

        let diffSeq = this.findShipmentMethodsDiff(previousSeq, updatedSeq)

        const updatedSeqenceNum = previousSeq.map((shipmentMethod: any) => shipmentMethod.sequenceNumber)
        Object.keys(diffSeq).map((key: any) => {
          diffSeq[key].sequenceNumber = updatedSeqenceNum[key]
        })

        diffSeq = Object.keys(diffSeq).map((key) => diffSeq[key])
        this.filteredShipmentMethods = updatedSeq

        if (diffSeq.length && !this.toast) {
          showToast(translate("Shipment methods order has been changed. Click save button to update them."));
        }
      },
      findShipmentMethodsDiff(previousSeq: any, updatedSeq: any) {
        const diffSeq: any = Object.keys(previousSeq).reduce((diff, key) => {
          if (updatedSeq[key].shipmentMethodTypeId === previousSeq[key].shipmentMethodTypeId && updatedSeq[key].sequenceNumber === previousSeq[key].sequenceNumber) return diff
          return {
            ...diff,
            [key]: updatedSeq[key]
          }
        }, {})
        return diffSeq;
      },
      async saveShipmentMethodsOrder() {
        const diffShipmentMethods = this.filteredShipmentMethods.filter((filteredShipmentMethod: any) => this.shipmentMethods.some((shipmentMethod: any) => shipmentMethod.shipmentMethodTypeId === filteredShipmentMethod.shipmentMethodTypeId && shipmentMethod.sequenceNumber !== filteredShipmentMethod.sequenceNumber))
        let currentCarrierShipmentMethods = this.currentCarrier.shipmentMethods ? JSON.parse(JSON.stringify(this.currentCarrier.shipmentMethods)) : {}

        const responses = await Promise.allSettled(diffShipmentMethods.map(async (method: any) => {
          await CarrierService.updateCarrierShipmentMethod(method)
          currentCarrierShipmentMethods[method.shipmentMethodTypeId] = method
          await this.store.dispatch('carrier/updateCurrentCarrierShipmentMethods', currentCarrierShipmentMethods)
          await this.store.dispatch('carrier/checkAssociatedShipmentMethods')
        }))

        const isFailedToUpdateSomeMethod = responses.some((response) => response.status === 'rejected')
        if (isFailedToUpdateSomeMethod) {
          showToast(translate("Failed to update sequence for some shipment methods."))
        } else {
          showToast(translate("Sequence for shipment methods updated successfully."))
        }
        
        modalController.dismiss()
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
  <style scoped>
  .list-item {
    --columns-desktop: 2;
  }
  ion-content {
    --padding-bottom: 80px;
  }
  </style>