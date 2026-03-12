<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/carriers" slot="start" />
        <ion-title>{{ translate("Carrier details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
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
          <ion-toggle v-else v-model="shipmentMethodQuery.showSelected" @ionChange="updateShipmentMethodQuery()">
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
                <ion-checkbox :checked="facility.isChecked" @click="updateCarrierFacilityAssociation($event, facility)" />
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
                    <ion-label>{{ getGatewayConfigDescription(shipmentMethod?.shipmentGatewayConfigId) }}</ion-label>
                  </ion-chip>
                  <ion-chip v-else :disabled="!shipmentMethod.isChecked" outline @click.stop="updateShipmentGatewayConfigId(shipmentMethod)">
                    <ion-icon :icon="addCircleOutline" />
                    <ion-label>{{ translate('gateway') }}</ion-label>
                  </ion-chip>
                  <ion-note class="config-label">{{ translate('gateway') }}</ion-note>
                </div>
                <div class="tablet">
                  <ion-toggle :checked="shipmentMethod.isTrackingRequired" :disabled="!shipmentMethod.isChecked" @ionChange="updateTrackingRequired($event, shipmentMethod)" />
                  <ion-note class="config-label">{{ translate("require tracking code") }}</ion-note>
                </div>
                <div class="tablet">
                  <ion-checkbox :checked="shipmentMethod.isChecked" @click="updateProductStoreShipmentMethodAssociationLocal($event, shipmentMethod, productStore)" />
                </div>
              </div>
            </template>
            <div v-else class="empty-state">
              <p>{{ translate('No data found') }}</p>
            </div>
          </template>
        </template>
      </div>
    </ion-content>
    <ion-fab v-if="selectedSegment === 'shipping-methods'" vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="openCreateShipmentMethodModal()">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonBackButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToggle, IonToolbar, alertController, modalController } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { addCircleOutline, addOutline, peopleOutline, shieldCheckmarkOutline } from "ionicons/icons";
import { commonUtil, emitter, logger, translate } from "@common";
import { useRoute } from "vue-router";
import CreateShipmentMethodModal from "@/components/CreateShipmentMethodModal.vue";
import ShipmentMethods from "@/components/ShipmentMethods.vue";
import { useCarrierStore } from "@/store/carrier";
import { useUtilStore } from "@/store/util";
import { useCarrier } from "@/composables/useCarrier";

const route = useRoute();
const carrierStore = useCarrierStore();
const utilStore = useUtilStore();
const { 
  updateCarrier, 
  updateCarrierFacility, 
  updateProductStoreShipmentMethod,
  updateProductStoreShipmentMethodAssociation 
} = useCarrier();

const selectedSegment = ref("shipping-methods");

const shipmentMethodQuery = computed(() => carrierStore.getShipmentMethodQuery);
const currentCarrier = computed(() => carrierStore.getCurrent);
const productStores = computed(() => utilStore.getProductStores);
const shipmentMethods = computed(() => carrierStore.getShipmentMethods);
const carrierShipmentMethodsByProductStore = computed(() => carrierStore.getCarrierShipmentMethodsByProductStore);
const shipmentGatewayConfigs = computed(() => carrierStore.getShipmentGatewayConfigs);

const getGatewayConfigDescription = (shipmentGatewayConfigId: string) => {
  const config = shipmentGatewayConfigs.value[shipmentGatewayConfigId];
  return config?.description ? config.description : shipmentGatewayConfigId;
};

const getShipmentMethodDescription = (shipmentMethodTypeId: string) => {
  const method = shipmentMethods.value[shipmentMethodTypeId];
  return method?.description ? method.description : shipmentMethodTypeId;
};

const updateShipmentMethodQuery = async () => {
  await carrierStore.setShipmentMethodQuery({ query: shipmentMethodQuery.value });
};

const updateCarrierName = async () => {
  const alert = await alertController.create({
    header: translate("Edit carrier detail"),
    inputs: [{
      name: "groupName",
      value: currentCarrier.value.groupName
    }],
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    },
    {
      text: translate("Confirm"),
      handler: async (data: any) => {
        if (!data.groupName.trim()) {
          commonUtil.showToast(translate("Carrier name can not be empty."));
          return;
        }
        if (data.groupName.trim() != currentCarrier.value.groupName) {
          const payload = { partyId: currentCarrier.value.partyId, groupName: data.groupName.trim() };
          emitter.emit("presentLoader");

          try {
            await updateCarrier(payload);
            commonUtil.showToast(translate("Carrier name updated successfully."));
            await carrierStore.fetchCarrierDetail({ partyId: currentCarrier.value.partyId });
          } catch (err) {
            logger.error(err);
          }
          emitter.emit("dismissLoader");
        }
      }
    }]
  });
  await alert.present();
};

const openCreateShipmentMethodModal = async () => {
  const createShipmentMethodModal = await modalController.create({
    component: CreateShipmentMethodModal,
    componentProps: { carrier: currentCarrier.value }
  });
  return createShipmentMethodModal.present();
};

const updateCarrierFacilityAssociation = async (event: any, facility: any) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  await updateCarrierFacility(facility, currentCarrier.value.partyId);
};

const updateShipmentGatewayConfigId = async (shipmentMethod: any) => {
  const configOptions = Object.values(shipmentGatewayConfigs.value).map((config: any) => ({
    type: "radio",
    label: config.description,
    value: config.shipmentGatewayConfigId,
    checked: config.shipmentGatewayConfigId === shipmentMethod.shipmentGatewayConfigId
  })) as any;

  const alert = await alertController.create({
    header: translate("Edit gateway"),
    inputs: configOptions,
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    },
    {
      text: translate("Confirm"),
      handler: (data) => {
        const modifiedData = { fieldName: "shipmentGatewayConfigId", fieldValue: data };
        const messages = { successMessage: "Shipment gateway updated successfuly.", errorMessage: "Failed to update shipment gateway." };
        updateProductStoreShipmentMethodInternal(shipmentMethod, modifiedData, messages);
      }
    }]
  });
  await alert.present();
};

const updateTrackingRequired = async (event: any, shipmentMethod: any) => {
  event.stopPropagation();
  const modifiedData = { fieldName: "isTrackingRequired", fieldValue: shipmentMethod.isTrackingRequired ? 'N' : 'Y' };
  const messages = { successMessage: "Tracking code settings updated successfully.", errorMessage: "Failed to update tracking code settings." };
  updateProductStoreShipmentMethodInternal(shipmentMethod, modifiedData, messages);
};

const updateProductStoreShipmentMethodInternal = async (shipmentMethod: any, modifiedData: any, messages: any) => {
  if (modifiedData && shipmentMethod[modifiedData.fieldName] !== modifiedData.fieldValue) {
    try {
      const updatedMethod = { ...shipmentMethod, [modifiedData.fieldName]: modifiedData.fieldValue };
      await updateProductStoreShipmentMethod(shipmentMethod.productStoreId, updatedMethod);
      commonUtil.showToast(translate(messages.successMessage));
      await carrierStore.checkAssociatedProductStoreShipmentMethods();
    } catch (err) {
      commonUtil.showToast(translate(messages.errorMessage));
      logger.error(err);
    }
  }
};

const updateProductStoreShipmentMethodAssociationLocal = async (event: any, shipmentMethod: any, productStore: any) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  await updateProductStoreShipmentMethodAssociation({
    productStoreId: productStore.productStoreId,
    shipmentMethod,
    isChecked: !shipmentMethod.isChecked
  });
};

onMounted(async () => {
  emitter.emit("presentLoader");
  await carrierStore.fetchCarrierDetail({ partyId: route.params.partyId as string });
  await Promise.all([
    carrierStore.fetchShipmentMethodTypes(),
    utilStore.fetchProductStores(),
    carrierStore.fetchProductStoreShipmentMethods({ partyId: route.params.partyId as string }),
    utilStore.fetchFacilities()
  ]);
  await carrierStore.checkAssociatedShipmentMethods();
  await carrierStore.checkAssociatedProductStoreShipmentMethods();
  await carrierStore.fetchCarrierFacilities();
  await carrierStore.fetchShipmentGatewayConfigs();

  emitter.emit("dismissLoader");
});
</script>

<style scoped>
ion-content > main {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}
ion-content {
  --padding-bottom: 80px;
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
