<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()" data-testid="create-to-close-modal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Create transfer order") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="full">
      <ion-input data-testid="transfer-name-input" v-model="transferOrderName" :label="translate('Transfer name')" :placeholder="translate('Add a name')"/>
    </ion-item>

    <ion-searchbar v-if="facilities.length" data-testid="facility-search-input" v-model="queryString" :placeholder="translate('Search facilites')"/>
    <ion-list>
      <ion-list-header v-if="facilities.length">{{ translate("Select destination facility") }}</ion-list-header>
      <div v-if="isLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Loading...") }}</ion-label>
      </div>

      <template v-else-if="filteredFacilities().length">
        <ion-item v-for="facility in filteredFacilities()" :key="facility.facilityId" @click="selectFacility(facility.facilityId)">
          <ion-radio data-testid="facility-radio-options" label-placement="end" justify="start" :value="facility.facilityId" :checked="facility.facilityId === selectedDestinationFacilityId">
            <ion-label>
              {{ facility.facilityName || facility.facilityId }}
              <p>{{ facility.facilityId }}</p>
            </ion-label>
          </ion-radio>
        </ion-item>
      </template>

      <div v-else lines="none" class="empty-state">
        <ion-label>{{ translate('No facilities found') }}</ion-label>
      </div>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!facilities.length" data-testid="create-transfer-order-btn" @click="createTransferOrder">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent, IonInput, IonSearchbar, IonList, IonListHeader, IonItem, IonRadio, IonLabel, IonFab, IonFabButton, modalController } from '@ionic/vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { computed, ref, onMounted } from 'vue';
import { translate, useUserStore } from '@hotwax/dxp-components';
import { UtilService } from '@/services/UtilService';
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter';
import { useStore } from 'vuex';
import { showToast } from '@/utils';
import router from '@/router';
import logger from '@/logger';

const store = useStore();

const facilityAddresses = computed(() => store.getters['util/getFacilityAddress'])

const transferOrderName = ref('');
const queryString = ref('');
const facilities = ref([]) as any;
const selectedDestinationFacilityId = ref('');
const isLoading = ref(false);

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
  selectedDestinationFacilityId.value = id;
}

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

// Creates a transfer order with the provided details and navigates to the order creation page.
async function createTransferOrder() {
  if(!transferOrderName.value?.trim()) {
    showToast(translate('Please give some valid transfer order name.'));
    return;
  }

  if(!selectedDestinationFacilityId.value) {
    showToast(translate('Please select a destination facility.'));
    return;
  }
  
  const productStoreId = useUserStore().getCurrentEComStore?.productStoreId || '';
  const originFacilityId = useUserStore().getCurrentFacility?.facilityId || '';
  
  if(originFacilityId === selectedDestinationFacilityId.value) {
    showToast(translate('Origin and destination facility cannot be the same.'));
    return;
  }
  
  const orderPayload: any = {
    orderName: transferOrderName.value.trim(),
    orderTypeId: 'TRANSFER_ORDER',
    customerId: 'COMPANY',
    statusId: 'ORDER_CREATED',
    statusFlowId: 'TO_Fulfill_And_Receive',
    grandTotal: 0,
    productStoreId,
    originFacilityId,
    shipGroups: [{
      facilityId: originFacilityId,
      orderFacilityId: selectedDestinationFacilityId.value,
    }],
  };
  
  // Fetch origin and destination facility addresses directly from the store getter and assign them to the order payload.
  const originAddress = facilityAddresses.value(originFacilityId)
  const destinationAddress = facilityAddresses.value(selectedDestinationFacilityId.value)

  if(originAddress) {
    orderPayload.shipGroups[0].shipFrom = {
      postalAddress: { id: originAddress.contactMechId }
    }
  }

  if(destinationAddress) {
    orderPayload.shipGroups[0].shipTo = {
      postalAddress: { id: destinationAddress.contactMechId }
    }
  }

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