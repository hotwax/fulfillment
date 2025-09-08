<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Create transfer order") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="full">
      <ion-input v-model="transferOrderName" :label="translate('Transfer name')" :placeholder="translate('Add a name')"/>
    </ion-item>

    <ion-searchbar v-model="queryString" :placeholder="translate('Search facilites')"/>
    <ion-list>
      <ion-list-header>{{ translate("Select destination facility") }}</ion-list-header>
      <div v-if="isLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Loading...") }}</ion-label>
      </div>

      <template v-else-if="filteredFacilities().length">
        <ion-item v-for="facility in filteredFacilities()" :key="facility.facilityId" @click="selectFacility(facility.facilityId)">
          <ion-radio label-placement="end" justify="start" :value="facility.facilityId" :checked="facility.facilityId === selectedDestinationFacilityid">
            <ion-label>
              {{ facility.facilityName || facility.facilityId }}
              <p>{{ facility.facilityId }}</p>
            </ion-label>
          </ion-radio>
        </ion-item>
      </template>

      <ion-item v-else lines="none" class="empty-state">
        <ion-label>{{ translate('No facilities found') }}</ion-label>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="saving" @click="createTransferOrder">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent, IonInput, IonSearchbar, IonList, IonListHeader, IonItem, IonRadio, IonLabel, IonFab, IonFabButton, modalController } from '@ionic/vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { ref, onMounted } from 'vue';
import { translate, useUserStore } from '@hotwax/dxp-components';
import { UtilService } from '@/services/UtilService';
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter';
import { useStore } from 'vuex';
import { showToast } from '@/utils';
import router from '@/router';
import logger from '@/logger';

const store = useStore();

const transferOrderName = ref('');
const queryString = ref('');
const facilities = ref([]) as any;
const selectedDestinationFacilityid = ref('');
const isLoading = ref(false);
const saving = ref(false);

onMounted(async () => {
  await loadFacilities();
});

async function loadFacilities() {
  try {
    isLoading.value = true;
    const productStoreId = useUserStore().getCurrentEComStore?.productStoreId;
    if(!productStoreId) return;

    const resp = await UtilService.fetchProductStoreFacilities({
      productStoreId,
      facilityTypeId: 'VIRTUAL_FACILITY',
      facilityTypeId_op: 'equals',
      facilityTypeId_not: 'Y',
      parentFacilityTypeId: 'VIRTUAL_FACILITY',
      parentFacilityTypeId_op: 'equals',
      parentFacilityTypeId_not: 'Y',
      fieldsToSelect: ['facilityId', 'facilityName'],
      pageSize: 200,
    });

    if(!hasError(resp)) {
      facilities.value = resp.data;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
  }
  isLoading.value = false;
}

function filteredFacilities() {
  const value = queryString.value.trim().toLowerCase();
  if(!value) return facilities.value;
  return facilities.value.filter((facility: any) => {
    const name = (facility.facilityName || "").toLowerCase();
    const id = (facility.facilityId || "").toLowerCase();
    return name.includes(value) || id.includes(value);
  });
}

function selectFacility(id: string) {
  selectedDestinationFacilityid.value = id;
}

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

async function createTransferOrder() {
  if(saving.value) return;
  if(!transferOrderName.value?.trim()) {
    showToast(translate('Please give some valid transfer order name.'));
    return;
  }
  if(!selectedDestinationFacilityid.value) {
    showToast(translate('Please select a destination facility.'));
    return;
  }
  saving.value = true;

  const productStoreId = useUserStore().getCurrentEComStore?.productStoreId || '';
  const originFacilityId = useUserStore().getCurrentFacility?.facilityId || '';

  const orderPayload: any = {
    orderName: transferOrderName.value.trim(),
    orderTypeId: 'TRANSFER_ORDER',
    customerId: 'COMPANY',
    statusId: 'ORDER_CREATED',
    statusFlowId: 'TO_Fulfill_And_Receive',
    productStoreId,
    originFacilityId,
    shipGroups: [{
      facilityId: originFacilityId,
      orderFacilityId: selectedDestinationFacilityid.value,
    }],
  };

  const addresses = await store.dispatch("util/fetchFacilityAddresses", [originFacilityId, selectedDestinationFacilityid.value])
  addresses.map((address: any) => {
    if(address.facilityId === originFacilityId) {
      orderPayload.shipGroups[0].shipFrom = {
        postalAddress: {
          id: address.contactMechId
        }
      }
    }
    if(address.facilityId === selectedDestinationFacilityid.value) {
      orderPayload.shipGroups[0].shipTo = {
        postalAddress: {
          id: address.contactMechId
        }
      }
    }
  })

  try {
    const resp = await TransferOrderService.createTransferOrder({ payload: orderPayload })
    if(!hasError(resp) && resp.data?.orderId) {
      const orderId = resp.data.orderId
      router.replace(`/create-transfer-order/${orderId}`)
      showToast(translate("Transfer order created successfully."))
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error)
    showToast(translate("Failed to create order."))
  }
  closeModal();
}
</script>