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
              <div class="list-item ion-padding" v-for="(shipmentMethod, index) in filteredShipmentMethods" :key="index">
                <ion-item lines="none">
                  <ion-label>
                    {{ shipmentMethod.description }}
                    <p>{{ shipmentMethod.shipmentMethodTypeId }}</p>
                  </ion-label>
                </ion-item>
                <div class="tablet">
                  <ion-chip v-if="shipmentMethod.deliveryDays" outline @click.stop="editDeliveryDays(shipmentMethod)">
                    <ion-label>{{ shipmentMethod?.deliveryDays }}</ion-label>
                  </ion-chip>
                  <ion-chip v-else :disabled="!shipmentMethod.isChecked" outline @click.stop="editDeliveryDays(shipmentMethod)">
                    <ion-icon :icon="addCircleOutline" />
                    <ion-label>{{ translate('delivery days') }}</ion-label>
                  </ion-chip>
                  <ion-note class="config-label">{{ translate('delivery days') }}</ion-note>
                </div>
                <div class="tablet">
                  <ion-chip v-if="shipmentMethod?.carrierServiceCode" outline @click.stop="editCarrierCode(shipmentMethod)">
                    <ion-label>{{ shipmentMethod?.carrierServiceCode }}</ion-label>
                  </ion-chip>
                  <ion-chip v-else :disabled="!shipmentMethod.isChecked" outline @click.stop="editCarrierCode(shipmentMethod)">
                    <ion-icon :icon="addCircleOutline" />
                    <ion-label>{{ translate('carrier code') }}</ion-label>
                  </ion-chip>
                  <ion-note class="config-label">{{ translate('carrier code') }}</ion-note>
                </div>
                <div class="tablet">
                  <ion-checkbox :checked="shipmentMethod.isChecked" @click="updateCarrierShipmentMethodAssociation($event, shipmentMethod)" />
                </div>
                <ion-button fill="clear" color="medium" @click="openShipmentMethodActionsPopover($event, shipmentMethod)">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                </ion-button>
              </div>
            </template>
            <template v-else-if="selectedSegment === 'facilities'">
              <section>
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
            </template>
            <template v-for="(productStore, index) in productStores" :key="index">
              <template v-if="selectedSegment === productStore.productStoreId">
                <div class="list-item ion-padding" v-for="(shipmentMethod, index) in carrierShipmentMethodsByProductStore[productStore.productStoreId]" :key="index">
                  <ion-item lines="none">
                    <ion-label>
                      {{ shipmentMethod.description }}
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
                    <ion-toggle v-model="shipmentMethod.isTrackingRequired" :disabled="!shipmentMethod.isChecked" @ionChange="updateTrackingRequired($event, shipmentMethod)"/>
                    <ion-note class="config-label">{{ translate("require tracking code") }}</ion-note>
                  </div>
                  <div class="tablet">
                    <ion-checkbox :checked="shipmentMethod.isChecked" @click="updateProductStoreShipmentMethodAssociation($event, shipmentMethod, productStore)" />
                  </div>
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
    popoverController
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
  import ShipmentMethodActionsPopover from '@/components/ShipmentMethodActionsPopover.vue'
  import CreateShipmentMethodModal from '@/components/CreateShipmentMethodModal.vue';

  
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
      IonToolbar
    },
    data() {
      return {
        carrierMethodsOnly: false,
        selectedSegment: 'shipping-methods',
      }
    },
    async ionViewWillEnter() {
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
        filteredShipmentMethods: "carrier/getFilteredShipmentMethods",
        shipmentMethods: "carrier/getShipmentMethods",
        carrierShipmentMethodsByProductStore: "carrier/getCarrierShipmentMethodsByProductStore",
        shipmentGatewayConfigs : "util/getShipmentGatewayConfigs"
      }),
    },
    methods: {
      getTime(time: any) {
        return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t a")
      },
      getGatewayConfigDescription(shipmentGatewayConfigId: string) {
        const config = this.shipmentGatewayConfigs[shipmentGatewayConfigId];
        return config.description ? config.description : shipmentGatewayConfigId
      },
      async updateShipmentMethodQuery() {
        await this.store.dispatch('carrier/updateShipmentMethodQuery', this.shipmentMethodQuery)
      },
      async editDeliveryDays(shipmentMethod: any) {
        const alert = await alertController.create({
          header: translate('Edit delivery days'),
          inputs: [{
            name: "deliveryDays",
            value: shipmentMethod.deliveryDays
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Apply'),
            handler: async (data) => {
              const modifiedData = {"fieldName": "deliveryDays", "fieldValue": data.deliveryDays}
              const messages = {"successMessage": "Delivery days updated.", "errorMessage": "Failed to update delivery days."}
              await this.updateCarrierShipmentMethod(shipmentMethod, modifiedData, messages)
            }
          }]
        })
        await alert.present()
      },
      async editCarrierCode(shipmentMethod: any) {
        const alert = await alertController.create({
          header: translate('Edit carrier code'),
          inputs: [{
            name: "carrierServiceCode",
            value: shipmentMethod.carrierServiceCode
          }],
          buttons: [{
            text: translate('Cancel'),
            role: "cancel"
          },
          {
            text: translate('Apply'),
            handler: async (data) => {
              const modifiedData = {"fieldName": "carrierServiceCode", "fieldValue": data.carrierServiceCode}
              const messages = {"successMessage": "Carrier code updated.", "errorMessage": "Failed to update carrier code."}
              await this.updateCarrierShipmentMethod(shipmentMethod, modifiedData, messages)
            }
          }]
        })
        await alert.present()
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
            text: translate('Confim'),
            handler: async (data: any) => {
              if (data.groupName) {
                let resp;
                const payload = { partyId: this.currentCarrier.partyId, ...data }
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
        let facilities = JSON.parse(JSON.stringify(this.currentCarrier.facilities))
        let updatedFacility = facilities[facility.facilityId];

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
            updatedFacility.isChekced = false;
            updatedFacility.fromDate = ""
          } else {
            resp = await CarrierService.addCarrierToFacility(payload)
            if (hasError(resp)) {
              throw resp.data;
            }
            updatedFacility = {...updatedFacility, ...payload}
          }

          if (!hasError(resp)) {
            showToast(translate("Facility carrier association updated successfully."))
            this.store.dispatch('carrier/updateCarrierFacility', updatedFacility)
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
        const modifiedData = {"fieldName": "isTrackingRequired", "fieldValue": shipmentMethod.isTrackingRequired}
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
                this.store.dispatch('carrier/updateCurrentCarrierProductStoreShipmentMethods', productStoreShipmentMethods)
                this.store.dispatch('carrier/checkAssociatedProductStoreShipmentMethods')
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
      },
      async updateCarrierShipmentMethodAssociation(event: any, shipmentMethod: any) {
        event.stopPropagation();

        let resp = {} as any;
        const payload = {
          shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
          partyId: this.currentCarrier.partyId,
          roleTypeId: "CARRIER"
        }

        let currentCarrierShipmentMethods = JSON.parse(JSON.stringify(this.currentCarrier.shipmentMethods))

        try {
          if (shipmentMethod.isChecked) {
            resp = await CarrierService.removeCarrierShipmentMethod(payload)

            if (hasError(resp)) {
              throw resp.data;
            }

            delete currentCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId]
          } else {
            const time = DateTime.now().toMillis()
            const params = {
              ...payload,
              fromDate: time
            }

            resp = await CarrierService.addCarrierShipmentMethod(payload)

            if (hasError(resp)) {
              throw resp.data;
            }

            currentCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId] = payload
          }

          if (!hasError(resp)) {
            showToast(translate("Carrier and shipment method association updated successfully."))
            await this.store.dispatch('carrier/updateCurrentCarrierShipmentMethods', currentCarrierShipmentMethods)
            await this.store.dispatch('carrier/checkAssociatedShipmentMethods')
            event.target.checked = !shipmentMethod.isChecked
          } else {
            throw resp.data
          }
        } catch(err) {
          showToast(translate("Failed to update product store and shipment method association."))
          logger.error(err)
        }
      },
      
      async openShipmentMethodActionsPopover(event: Event, shipmentMethod: any) {
        const popover = await popoverController.create({
          component: ShipmentMethodActionsPopover,
          componentProps: {
            shipmentMethod
          },
          showBackdrop: false,
          event: event
        });
        popover.present();
        const result = await popover.onDidDismiss();
        if (result.data) {
          const modifiedData = result.data;
          const modifiedFieldName = modifiedData?.fieldName;
          const modifiedFieldValue = modifiedData?.fieldValue;


          if (modifiedFieldName == 'shipmentMethodName' && modifiedFieldValue !== shipmentMethod.description) {
            await this.updateShipmentMethodName(shipmentMethod, modifiedFieldValue)
          } else if (modifiedFieldName == 'deliveryDays' && modifiedFieldValue !== shipmentMethod.deliveryDays) {
            const messages = {"successMessage": "Delivery days updated.", "errorMessage": "Failed to update delivery days."}
            await this.updateCarrierShipmentMethod(shipmentMethod, modifiedData, messages)
          } else if (modifiedFieldName == 'carrierServiceCode' && modifiedFieldValue !== shipmentMethod.carrierServiceCode) {
            const messages = {"successMessage": "Carrier code updated.", "errorMessage": "Failed to update carrier code."}
            await this.updateCarrierShipmentMethod(shipmentMethod, modifiedData, messages)
          }
        }
      },
      async updateShipmentMethodName(shipmentMethod: any, updatedShipmentMethodName: any) {
        try {
          const resp = await CarrierService.updateShipmentMethodType({
            shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
            description: updatedShipmentMethodName
          })

          if (!hasError(resp)) {
            showToast(translate('Shipment method renamed.'))
            const updatedShipmentMethods = JSON.parse(JSON.stringify(this.shipmentMethods))
              .map((shipmentMethodData: any) => {
                if (shipmentMethod.shipmentMethodTypeId === shipmentMethodData.shipmentMethodTypeId) {
                  shipmentMethodData.description = updatedShipmentMethodName
                }

                return shipmentMethodData
              })
            this.store.dispatch('carrier/updateShipmentMethods', updatedShipmentMethods)
          } else {
            throw resp.data
          }
        } catch (error) {
          showToast(translate('Failed to rename facility group.'))
          logger.error('Failed to rename facility group.', error)
        }
      },
      async updateCarrierShipmentMethod(shipmentMethod: any, updatedData: any, messages: any) {
        try {
          const resp = await CarrierService.updateCarrierShipmentMethod({
            shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
            partyId: shipmentMethod.partyId,
            roleTypeId: shipmentMethod.roleTypeId,
            [updatedData["fieldName"]]: updatedData["fieldValue"]
          })

          if (!hasError(resp)) {
            showToast(translate(messages["successMessage"]))
            //updating shipment methods in state
            const updatedShipmentMethods = JSON.parse(JSON.stringify(this.shipmentMethods))
              .map((shipmentMethodData: any) => {
                if (shipmentMethod.shipmentMethodTypeId === shipmentMethodData.shipmentMethodTypeId) {
                  shipmentMethodData[updatedData.fieldName] = updatedData.fieldValue
                }

                return shipmentMethodData
              })
            this.store.dispatch('carrier/updateShipmentMethods', updatedShipmentMethods)

            //updating current carrier shipment methods in state
            let updatedCarrierShipmentMethods = JSON.parse(JSON.stringify(this.currentCarrier.shipmentMethods))
            const updatedShipmentMethod = updatedCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId];
            updatedShipmentMethod[updatedData.fieldName] = updatedData.fieldValue;
            this.store.dispatch('carrier/updateCurrentCarrierShipmentMethods', updatedCarrierShipmentMethods)
          } else {
            throw resp.data
          }
        } catch (error) {
          showToast(translate(messages["errorMessage"]))
          logger.error(messages["errorMessage"], error)
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
  