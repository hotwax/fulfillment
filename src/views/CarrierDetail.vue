<template>
    <ion-page>
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-back-button default-href="/carriers" slot="start" />
          <ion-title>{{ translate("Carrier details") }}</ion-title>
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
              <ion-button slot="end" @click="updateCarrierName">{{ translate('Edit') }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
              <ion-toggle v-if="selectedSegment != 'shipping-methods'" :checked="true" :disabled="selectedSegment != 'shipping-methods'">
                {{ translate("Only methods for this carrier") }}
              </ion-toggle>
              <ion-toggle v-else  v-model="shipmentMethodQuery.showSelected" @ionChange="updateShipmentMethodQuery()">
                {{ translate("Only methods for this carrier") }}
              </ion-toggle>
            </ion-item>
          </ion-list>
          <hr />

          <ion-segment scrollable v-model="selectedSegment">
            <ion-segment-button value="shipping-methods">
              <ion-label>{{ translate("Methods") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="facilities">
              <ion-label>{{ translate("Facilities") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button v-for="(productStore, index) in productStores" :key="index" :value="productStore.productStoreId">
              <ion-label>{{ productStore.storeName ? productStore.storeName : productStore.productStoreId }}</ion-label>
            </ion-segment-button>
          </ion-segment>

          <div class="segments" v-if="currentCarrier">
            <template v-if="selectedSegment === 'shipping-methods'">
              <ShipmentMethods />
            </template>
            <template v-else-if="selectedSegment === 'facilities'">
              <section v-if="currentCarrier.facilities">
                <ion-card v-for="(facility, index) in currentCarrier.facilities" :key="index">
                  <ion-card-header>
                    <div>
                      <ion-card-title>{{ facility.facilityName }}</ion-card-title>
                      <ion-card-subtitle>{{ facility.facilityId }}</ion-card-subtitle>
                    </div>
                    <ion-checkbox :checked="facility.isChecked" @click="updateCarrierFacility($event, facility)" />
                  </ion-card-header>
                </ion-card>
              </section>
              <div v-else class="empty-state">
                <p>{{ translate('No data found') }}</p>
              </div>
            </template>
            <template v-for="(productStore, index) in productStores" :key="index">
              <template v-if="selectedSegment === productStore.productStoreId">
                <template v-if="Object.keys(carrierShipmentMethodsByProductStore).length != 0">
                  <div class="list-item ion-padding" v-for="(shipmentMethod, index) in carrierShipmentMethodsByProductStore[productStore.productStoreId]" :key="index">
                    <ion-item lines="none">
                      <ion-label>
                        {{ getShipmentMethodDescription(shipmentMethod.shipmentMethodTypeId) }}
                        <p>{{ shipmentMethod.shipmentMethodTypeId }}</p>
                      </ion-label>
                    </ion-item>
                    <div class="tablet">
                      <ion-chip v-if="shipmentMethod.shipmentGatewayConfigId" outline @click.stop="updateShipmentGatewayConfigId(shipmentMethod)">
                        <ion-label>{{ getGatewayConfigDescription(shipmentMethod?.shipmentGatewayConfigId)}}</ion-label>
                      </ion-chip>
                      <ion-chip v-else :disabled="!shipmentMethod.isChecked" outline @click.stop="updateShipmentGatewayConfigId(shipmentMethod)">
                        <ion-icon :icon="addCircleOutline" />
                        <ion-label>{{ translate('gateway') }}</ion-label>
                      </ion-chip>
                      <ion-note class="config-label">{{ translate('gateway') }}</ion-note>
                    </div>
                    <div class="tablet">
                      <ion-toggle :checked="shipmentMethod.isTrackingRequired" :disabled="!shipmentMethod.isChecked" @ionChange="updateTrackingRequired($event, shipmentMethod)"/>
                      <ion-note class="config-label">{{ translate("require tracking code") }}</ion-note>
                    </div>
                    <div class="tablet">
                      <ion-checkbox :checked="shipmentMethod.isChecked" @click="updateProductStoreShipmentMethodAssociation($event, shipmentMethod, productStore)" />
                    </div>
                  </div>
                </template>
                <div v-else class="empty-state">
                  <p>{{ translate('No data found') }}</p>
                </div>
              </template>
            </template>
          </div>
        </main>
      </ion-content>
      <ion-fab v-if="selectedSegment === 'shipping-methods'" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="openCreateShipmentMethodModal()">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-page>
  </template>
  
  <script lang="ts">
  import {
    IonButton,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCheckbox,
    IonChip,
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
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToggle,
    IonToolbar,
    alertController,
    modalController,
  } from '@ionic/vue';
  import { defineComponent } from 'vue';
  import { add, checkmarkDone, barcodeOutline, pricetagOutline, addCircleOutline, addOutline, ellipsisVerticalOutline, peopleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
  import { mapGetters, useStore } from "vuex";
  import { translate } from '@hotwax/dxp-components';

  import { useRouter } from 'vue-router';
  import { Actions, hasPermission } from '@/authorization'
  import { DateTime } from 'luxon';
  import { showToast } from '@/utils';
  import emitter from "@/event-bus";
  import { hasError } from '@/adapter';
  import logger from '@/logger';
  import { CarrierService } from '@/services/CarrierService';
  import CreateShipmentMethodModal from '@/components/CreateShipmentMethodModal.vue';
  import ShipmentMethods from '@/components/ShipmentMethods.vue'

  
  export default defineComponent({
    name: "CarrierDetail",
    components: {
      IonButton,
      IonBackButton,
      IonCard,
      IonCardHeader,
      IonCardSubtitle,
      IonCardTitle,
      IonCheckbox,
      IonChip,
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
      IonSegment,
      IonSegmentButton,
      IonTitle,
      IonToggle,
      IonToolbar,
      ShipmentMethods
    },
    data() {
      return {
        carrierMethodsOnly: false,
        selectedSegment: 'shipping-methods',
      }
    },
    async mounted() {
      emitter.emit('presentLoader');
      await this.store.dispatch('carrier/fetchCarrierDetail', { partyId: this.$route.params.partyId });
      await Promise.all([this.store.dispatch('carrier/fetchShipmentMethodTypes'), this.store.dispatch('util/fetchProductStores'),
       this.store.dispatch('util/fetchShipmentGatewayConfigs'),
        this.store.dispatch('carrier/fetchCarrierShipmentMethods', {partyId: this.$route.params.partyId}),
         this.store.dispatch('carrier/fetchProductStoreShipmentMethods', {partyId: this.$route.params.partyId}),
          this.store.dispatch('util/fetchFacilities')])
      await this.store.dispatch('carrier/checkAssociatedShipmentMethods')
      await this.store.dispatch('carrier/checkAssociatedProductStoreShipmentMethods')
      await this.store.dispatch('carrier/fetchCarrierFacilities');

      emitter.emit('dismissLoader');
    },
    computed: {
      ...mapGetters({
        shipmentMethodQuery: 'carrier/getShipmentMethodQuery',
        currentCarrier: 'carrier/getCurrent',
        productStores : 'util/getProductStores',
        shipmentMethods: "carrier/getShipmentMethods",
        carrierShipmentMethodsByProductStore: "carrier/getCarrierShipmentMethodsByProductStore",
        shipmentGatewayConfigs : "util/getShipmentGatewayConfigs"
      }),
    },
    methods: {
      getGatewayConfigDescription(shipmentGatewayConfigId: string) {
        const config = this.shipmentGatewayConfigs[shipmentGatewayConfigId];
        return config.description ? config.description : shipmentGatewayConfigId
      },
      getShipmentMethodDescription(shipmentMethodTypeId: string) {
        const method = this.shipmentMethods[shipmentMethodTypeId];
        return method?.description ? method.description : shipmentMethodTypeId
      },
      async updateShipmentMethodQuery() {
        await this.store.dispatch('carrier/updateShipmentMethodQuery', this.shipmentMethodQuery)
      },
      
      async updateCarrierName() {
        const alert = await alertController.create({
          header: translate('Edit carrier detail'),
          inputs: [{
            name: "groupName",
            value: this.currentCarrier.groupName
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Confirm'),
            handler: async (data: any) => {
              if (!data.groupName.trim()) {
                showToast(translate("Carrier name can not be empty."));
                return;
              }
              if (data.groupName.trim() != this.currentCarrier.groupName) {
                let resp;
                const payload = { partyId: this.currentCarrier.partyId, groupName: data.groupName.trim() }
                emitter.emit('presentLoader')

                try {
                  resp = await CarrierService.updateCarrier(payload)
                  if (!hasError(resp)) {
                    showToast(translate("Carrier name updated successfully."))
                    await this.store.dispatch("carrier/updateCurrentCarrier", { ...this.currentCarrier, ...payload });
                  } else {
                    throw resp.data;
                  }
                } catch(err) {
                  logger.error(err)
                }
                emitter.emit('dismissLoader')
              }
            }
          }]
        })
        await alert.present()
      },
      async openCreateShipmentMethodModal() {
        const createShipmentMethodModal = await modalController.create({
          component: CreateShipmentMethodModal,
          componentProps: { carrier: this.currentCarrier }
        });
        return createShipmentMethodModal.present();
      },
      async updateCarrierFacility(event: any, facility: any) {
        event.stopPropagation();

        try {
          const payload = {
            facilityId: facility.facilityId,
            partyId: this.currentCarrier.partyId,
            roleTypeId: "CARRIER",
            fromDate: DateTime.now().toMillis()
          }
          let resp = {} as any;
          if (facility.isChecked) {
            const params = {
              ...payload,
              fromDate: facility.fromDate,
              thruDate: DateTime.now().toMillis()
            }
            resp = await CarrierService.removeCarrierFromFacility(params)
            if (hasError(resp)) {
              throw resp.data
            }
            facility.isChecked = false 
            facility.fromDate = ""
          } else {
            resp = await CarrierService.addCarrierToFacility(payload)
            if (hasError(resp)) {
              throw resp.data;
            }
            facility = {...facility, ...payload, isChecked: true}
          }

          if (!hasError(resp)) {
            showToast(translate("Facility carrier association updated successfully."))
            this.store.dispatch('carrier/updateCarrierFacility', facility)
          } else {
            throw resp.data;
          }
        } catch(err) {
          showToast(translate("Failed to update facility carrier association."))
          logger.error(err)
        }
      },
      async updateShipmentGatewayConfigId(shipmentMethod: any) {
        let configOptions = [] as any;
        Object.values(this.shipmentGatewayConfigs).forEach((config: any) => {
          configOptions.push({
            name: "shipmentGatewayConfigId",
            label: config.description,
            type: "radio",
            value: config.shipmentGatewayConfigId,
            checked: shipmentMethod.shipmentGatewayConfigId === config.shipmentGatewayConfigId
          })
        })

        const alert = await alertController.create({
          header: translate('Edit gateway'),
          inputs: configOptions,
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Confirm'),
            handler: (data) => {
              const modifiedData = {"fieldName": "shipmentGatewayConfigId", "fieldValue": data}
              const messages = {"successMessage": "Shipment gateway updated successfuly.", "errorMessage": "Failed to update shipment gateway."}
              this.updateProductStoreShipmentMethod(shipmentMethod, modifiedData, messages)
            }
          }]
        })
        await alert.present()
      },

      async updateTrackingRequired(event: any, shipmentMethod: any) {
        event.stopPropagation();
        const modifiedData = {"fieldName": "isTrackingRequired", "fieldValue": shipmentMethod.isTrackingRequired ? false : true}
        const messages = {"successMessage": "Tracking code settings updated successfully.", "errorMessage": "Failed to update tracking code settings."}
        this.updateProductStoreShipmentMethod(shipmentMethod, modifiedData, messages)
      },

      async updateProductStoreShipmentMethod(shipmentMethod: any, modifiedData: any, messages: any) {
        if (modifiedData && shipmentMethod[modifiedData.fieldName] !== modifiedData.fieldValue) {
            let resp = {} as any;
            const productStoreShipmentMethods = this.currentCarrier.productStoreShipmentMethods ? JSON.parse(JSON.stringify(this.currentCarrier.productStoreShipmentMethods)) : {}
            try {
              const payload = {productStoreShipMethId: shipmentMethod.productStoreShipMethId} as any
              if (modifiedData.fieldName === 'isTrackingRequired') {
                payload.isTrackingRequired = modifiedData.fieldValue ? "Y" : "N"
              } else {
                payload[modifiedData.fieldName] = modifiedData.fieldValue
              }
              resp = await CarrierService.updateProductStoreShipmentMethod(payload)

              if (!hasError(resp)) {
                showToast(translate(messages.successMessage))
                productStoreShipmentMethods[shipmentMethod.productStoreId][shipmentMethod.shipmentMethodTypeId] = {...shipmentMethod, [modifiedData.fieldName]: modifiedData.fieldValue}
                await this.store.dispatch('carrier/updateCurrentCarrierProductStoreShipmentMethods', productStoreShipmentMethods)
                await this.store.dispatch('carrier/checkAssociatedProductStoreShipmentMethods')
              } else {
                throw resp.data;
              }
            } catch(err) {
              showToast(translate(messages.errorMessage))
              logger.error(err)
            }
          }
      },
      
      async updateProductStoreShipmentMethodAssociation(event: any, shipmentMethod: any, productStore: any) {
        event.stopPropagation();

        let resp = {} as any;
        const payload = {
          shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
          partyId: this.currentCarrier.partyId,
          roleTypeId: "CARRIER"
        }

        let productStoreShipmentMethods = this.currentCarrier.productStoreShipmentMethods ? JSON.parse(JSON.stringify(this.currentCarrier.productStoreShipmentMethods)) : {}

        try {
          if (shipmentMethod.isChecked) {
            resp = await CarrierService.removeProductStoreShipmentMethod({
              productStoreShipMethId: shipmentMethod.productStoreShipMethId,
              thruDate: DateTime.now().toMillis()
            })

            if (hasError(resp)) {
              throw resp.data;
            }

            delete productStoreShipmentMethods[shipmentMethod.productStoreId][shipmentMethod.shipmentMethodTypeId]
          } else {
            const time = DateTime.now().toMillis()
            let params = {
              ...payload,
              productStoreId: productStore.productStoreId,
              fromDate: DateTime.now().toMillis(),
            } as any

            resp = await CarrierService.createProductStoreShipmentMethod(params)
            

            if (hasError(resp)) {
              throw resp.data;
            } else {
              params = {...params, productStoreShipMethId: resp.data.productStoreShipMethId}
            }

            if (!productStoreShipmentMethods[productStore.productStoreId]) {
              productStoreShipmentMethods[productStore.productStoreId] = {};
            }
            productStoreShipmentMethods[productStore.productStoreId][shipmentMethod.shipmentMethodTypeId] = params
          }

          if (!hasError(resp)) {
            showToast(translate("Product store and shipment method association updated successfully."))
            await this.store.dispatch('carrier/updateCurrentCarrierProductStoreShipmentMethods', productStoreShipmentMethods)
            await this.store.dispatch('carrier/checkAssociatedProductStoreShipmentMethods')
            //event.target.checked = !shipmentMethod.isChecked
          } else {
            throw resp.data
          }
        } catch(err) {
          showToast(translate("Failed to update product store and shipment method association."))
          logger.error(err)
        }
      }
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
        ellipsisVerticalOutline,
        hasPermission,
        pricetagOutline,
        peopleOutline,
        shieldCheckmarkOutline,
        showToast,
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
  .list-item:hover {
    cursor: default;
  }
  .tablet {
    display: block;
    text-align: center;
  }
  .config-label {
    display: block;
    text-align: center;
  }
  ion-card-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  ion-card-header > ion-checkbox {
    flex-shrink: 0;
  }

  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
</style>
  