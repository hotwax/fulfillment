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
      <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; findPickers()" />
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
      <div v-if="isLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Fetching pickers") }}</ion-label>
      </div>
      <div class="empty-state" v-else-if="!pickers.length">{{ "No picker found" }}</div>
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
import { computed, defineProps, onMounted, ref } from "vue";
import { closeOutline, closeCircle, saveOutline } from "ionicons/icons";
import { showToast } from "@/utils";
import { hasError } from "@/adapter";
import { translate, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import { UtilService } from "@/services/UtilService";
import emitter from "@/event-bus";
import logger from "@/logger";
import { OrderService } from "@/services/OrderService";
import { Actions, hasPermission } from "@/authorization";
import { useOrderStore } from "@/store/order";

const props = defineProps(["order"]);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);
const openOrders = computed(() => useOrderStore().getOpenOrders);
const selectedPickers = ref([]) as any;
const queryString = ref("");
const pickers = ref([]) as any;
const isLoading = ref(false);

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
  const orderIdsToPick = [] as any;
  const orderItems = [] as any;

  if (props.order) {
    props.order.items.map((item: any) => orderItems.push(item));
    orderIdsToPick.push(props.order.orderId);
  } else {
    openOrders.value.list.map((order: any) => {
      order.items.map((item: any) => orderItems.push(item));
      orderIdsToPick.push(order.orderId);
    });
  }

  const payload = {
    packageName: "A",
    facilityId: currentFacility.value?.facilityId,
    shipmentMethodTypeId: orderItems[0]?.shipmentMethodTypeId,
    statusId: "PICKLIST_ASSIGNED",
    pickers: selectedPickers.value?.map((selectedPicker: any) => ({
      partyId: selectedPicker.id,
      roleTypeId: "WAREHOUSE_PICKER"
    })) || [],
    orderItems: orderItems.map(({ orderId, orderItemSeqId, shipGroupSeqId, productId, quantity }) => ({
      orderId,
      orderItemSeqId,
      shipGroupSeqId,
      productId,
      quantity
    }))
  };

  try {
    resp = await OrderService.createPicklist(payload);
    if (resp.status === 200 && !hasError(resp)) {
      closeModal({ picklistId: resp.data.picklistId, shipmentIds: resp.data.shipmentIds });
      showToast(translate("Picklist created successfully"));

      if (resp.data.picklistId) {
        await OrderService.printPicklist(resp.data.picklistId);
      }

      await useOrderStore().findOpenOrders();
      if (orderIdsToPick.length) {
        const updatedOpenOrders = openOrders.value?.list.filter((openOrder: any) => !orderIdsToPick.includes(openOrder.orderId));
        const outdatedOpenOrderCount = openOrders.value.list.reduce((count: number, openOrder: any) => orderIdsToPick.includes(openOrder.orderId) ? count + 1 : count, 0);
        await useOrderStore().updateOpenOrderQuery({ ...openOrders.value.query, viewSize: updatedOpenOrders.length });
        await useOrderStore().updateOpenOrders({ orders: updatedOpenOrders, total: openOrders.value.total - outdatedOpenOrderCount });
      }
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to create picklist for orders", err);
    showToast(translate("Failed to create picklist for orders"));
  }

  emitter.emit("dismissLoader");
};

const findPickers = async () => {
  isLoading.value = true;
  let query: any = {};
  pickers.value = [];

  if (queryString.value.length > 0) {
    const keyword = queryString.value.trim().split(" ");
    query = `(${keyword.map((key) => `*${key}*`).join(" OR ")}) OR "${queryString.value}"^100`;
  } else {
    query = `*:*`;
  }

  const facilityFilter: string[] = [];
  if (!hasPermission(Actions.APP_SHOW_ALL_PICKERS)) {
    facilityFilter.push(`facilityIds:${currentFacility.value.facilityId}`);
  }

  const payload = {
    json: {
      params: {
        rows: "50",
        q: query,
        defType: "edismax",
        qf: "firstName lastName groupName partyId externalId",
        sort: "firstName asc"
      },
      filter: ["docType:EMPLOYEE", "statusId:PARTY_ENABLED", "WAREHOUSE_PICKER_role:true", ...facilityFilter]
    }
  };

  try {
    const resp = await UtilService.getAvailablePickers(payload);
    if (resp.status === 200 && !hasError(resp)) {
      pickers.value = resp.data.response.docs.map((picker: any) => ({
        name: picker.groupName ? picker.groupName : (picker.firstName || picker.lastName) ? (picker.firstName ? picker.firstName : "") + (picker.lastName ? " " + picker.lastName : "") : picker.partyId,
        id: picker.partyId,
        externalId: picker.externalId
      }));
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch the pickers information or there are no pickers available", err);
  }
  isLoading.value = false;
};

onMounted(async () => {
  await findPickers();
});
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
