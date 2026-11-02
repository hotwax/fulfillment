<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Assign Pickers") }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar v-model="queryString" />
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-row>
      <ion-chip v-for="picker in selectedPickers" :key="picker.id">
        <ion-label>{{ picker.name }}</ion-label>
        <ion-icon :icon="closeCircle" @click="selectPicker(picker.id)" />
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>{{ translate("Staff") }}</ion-list-header>
      <div class="empty-state" v-if="!pickers.length">{{ isLoading ? translate("Fetching pickers") : "No picker found" }}</div>
      <div v-else>
        <ion-item v-for="(picker, index) in pickers" :key="index" @click="selectPicker(picker.id)">
          <ion-checkbox :checked="isPickerSelected(picker.id)">
            <ion-label>
              {{ picker.name }}
              <p>{{ picker.externalId ? picker.externalId : picker.id }}</p>
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!selectedPickers.length" @click="printPicklist()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonRow, IonSearchbar, IonSpinner, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { computed, defineProps, ref } from "vue";
import { closeOutline, closeCircle, saveOutline } from "ionicons/icons";
import { commonUtil, emitter, logger, translate, useLiveEntity } from "@common";
import { OPEN_ORDERS_DOMAIN } from "@/db/domains";
import { fulfillmentDb } from "@/db/fulfillmentDb";
import { refreshLiveOrders, removeOpenOrdersLocally } from "@/db/appDbSync";
import { useUserStore as useDxpUserStore } from "@/store/user";
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { useUtilStore } from "@/store/util";
import { useOrderStore } from "@/store/order";
import Actions from "@/authorization/actions";

const props = defineProps(["order", "orders"]);
const orderStore = useOrderStore();
const utilStore = useUtilStore();

const userStore = useDxpUserStore();
const currentFacility = computed(() => useAppProductStore().getCurrentFacility);
const selectedPickers = ref([]) as any;
const queryString = ref("");

// The staff come from the app database, which the sync keeps current, so the list is here as the modal opens.
const pickerRows = useLiveEntity<any>(fulfillmentDb.tables.pickers);
const isLoading = computed(() => !pickerRows.hydrated.value);
const pickerName = (picker: any) => picker.groupName ? picker.groupName : (picker.firstName || picker.lastName) ? (picker.firstName ? picker.firstName : "") + (picker.lastName ? " " + picker.lastName : "") : picker.partyId;
const pickers = computed(() => {
  const keywords = queryString.value.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return pickerRows.records.value
    .map((picker: any) => ({ name: pickerName(picker), id: picker.partyId, externalId: picker.externalId }))
    .filter((picker: any) => keywords.every((keyword: string) => `${picker.name} ${picker.id} ${picker.externalId ?? ""}`.toLowerCase().includes(keyword)))
    .slice(0, 50);
});

const isPickerSelected = (id: string) => {
  return selectedPickers.value.some((picker: any) => picker.id == id);
};

const closeModal = (responseData?: any) => {
  modalController.dismiss({ dismissed: true, value: responseData });
};

const selectPicker = (id: string) => {
  const picker = selectedPickers.value.some((picker: any) => picker.id == id);
  if (picker) {
    selectedPickers.value = selectedPickers.value.filter((picker: any) => picker.id != id);
  } else {
    selectedPickers.value.push(pickers.value.find((picker: any) => picker.id == id));
  }
};

const printPicklist = async () => {
  emitter.emit("presentLoader");
  let resp;
  const orderItems = (props.order ? [props.order] : props.orders).flatMap((order: any) => order.items);

  const payload = {
    packageName: "A",
    facilityId: currentFacility.value?.facilityId,
    shipmentMethodTypeId: orderItems[0]?.shipmentMethodTypeId,
    statusId: "PICKLIST_ASSIGNED",
    pickers: selectedPickers.value?.map((selectedPicker: any) => ({
      partyId: selectedPicker.id,
      roleTypeId: "WAREHOUSE_PICKER"
    })) || [],
    orderItems: orderItems.map(({ orderId, orderItemSeqId, shipGroupSeqId, productId, quantity }: any) => ({
      orderId,
      orderItemSeqId,
      shipGroupSeqId,
      productId,
      quantity
    }))
  };

  try {
    resp = await orderStore.createPicklist(payload);
    if (resp.status === 200 && !commonUtil.hasError(resp)) {
      closeModal({ picklistId: resp.data.picklistId, shipmentIds: resp.data.shipmentIds });
      commonUtil.showToast(translate("Picklist created successfully"));
      // Take the picked orders off the list now; the resync confirms against the server.
      removeOpenOrdersLocally(orderItems);
      void refreshLiveOrders([OPEN_ORDERS_DOMAIN]);

      if (resp.data.picklistId) {
        await orderStore.printPicklist(resp.data.picklistId);
      }
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to create picklist for orders", err);
    commonUtil.showToast(translate("Failed to create picklist for orders"));
  }

  emitter.emit("dismissLoader");
};

</script>

<style scoped>
ion-row {
  flex-wrap: nowrap;
  overflow: scroll;
}
ion-chip {
  flex-shrink: 0;
}
</style>
