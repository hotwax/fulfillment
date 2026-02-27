<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Edit pickers") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  
  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; findPickers()" />
    <ion-row>
      <ion-chip v-for="picker in selectedPickers" :key="picker.id">
        <ion-label>{{ picker.name }}</ion-label>
        <ion-icon :icon="closeCircle" @click="updateSelectedPickers(picker.id)" />
      </ion-chip>
    </ion-row>

    <ion-list>

      <ion-list-header>{{ translate("Staff") }}</ion-list-header>

      <div v-if="isLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Fetching pickers") }}</ion-label>
      </div>
      <div class="empty-state" v-else-if="!pickers.length">
        {{ 'No picker found' }}
      </div>
      <div v-else>
        <ion-item v-for="(picker, index) in pickers" :key="index" @click="updateSelectedPickers(picker.id)">
          <ion-checkbox :checked="isPickerSelected(picker.id)">
            <ion-label>
              {{ picker.name }}
              <p>{{ picker.externalId ? picker.externalId : picker.id }}</p>
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="arePickersNotSelected()" @click="confirmSave()">
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonCheckbox, IonChip, IonContent, IonHeader, IonIcon, IonFab, IonFabButton, IonTitle, IonToolbar, IonLabel, IonItem, IonList, IonListHeader, IonRow, IonSearchbar, IonSpinner, modalController, alertController } from "@ionic/vue";
import { computed, defineProps, onMounted, ref } from "vue";
import { close, closeCircle, saveOutline } from "ionicons/icons";
import { commonUtil } from "@/utils/commonUtil";
import logger from "@/logger";
import { OrderService } from "@/services/OrderService";
import { UtilService } from "@/services/UtilService";
import { translate, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
import { Actions, hasPermission } from "@/authorization";
import { DateTime } from "luxon";

const props = defineProps(["selectedPicklist"]);
const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);

const selectedPickers = ref([] as any[]);
const queryString = ref("");
const pickers = ref([] as any[]);
const editedPicklist = ref({} as any);
const isLoading = ref(false);

const isPickerSelected = (id: string) => {
  return selectedPickers.value.some((picker: any) => picker.id == id);
};

const updateSelectedPickers = (id: string) => {
  const picker = isPickerSelected(id);
  if (picker) {
    selectedPickers.value = selectedPickers.value.filter((picker: any) => picker.id != id);
  } else {
    selectedPickers.value.push(pickers.value.find((picker: any) => picker.id == id));
  }
};

const findPickers = async (pickerIds?: Array<any>) => {
  isLoading.value = true;
  let partyIdsFilter = "";
  let query = "*:*";
  pickers.value = [];

  if (pickerIds?.length) {
    partyIdsFilter = pickerIds.map((id) => `${id}`).join(" OR ");
  } else if (queryString.value.length > 0) {
    const keyword = queryString.value.trim().split(" ");
    query = `(${keyword.map((key) => `*${key}*`).join(" OR ")}) OR "${queryString.value}"^100`;
  }

  const facilityFilter = [];

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
      filter: ["docType:EMPLOYEE", "statusId:PARTY_ENABLED", "WAREHOUSE_PICKER_role:true", ...facilityFilter, partyIdsFilter.length ? `partyId:(${partyIdsFilter})` : ""]
    }
  };

  try {
    const resp = await UtilService.getAvailablePickers(payload);
    if (resp.status === 200 && !commonUtil.hasError(resp)) {
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

const confirmSave = async () => {
  const message = translate("Replace current pickers with new selection?");
  const alert = await alertController.create({
    header: translate("Replace pickers"),
    message,
    buttons: [
      { text: translate("Cancel") },
      {
        text: translate("Replace"),
        handler: () => {
          resetPicker().then(() => {
            closeModal();
          });
        }
      }
    ]
  });
  return alert.present();
};

const resetPicker = async () => {
  const pickersNameArray = [] as any;
  const pickerIds = selectedPickers.value.map((picker: any) => {
    if (picker.id) {
      pickersNameArray.push(picker.name.split(" ")[0]);
    }
    return picker.id;
  }).filter((id: any) => id);

  try {
    let roles = props.selectedPicklist.roles.map((role: any) => {
      if (!pickerIds.includes(role.partyId)) {
        return { ...role, thruDate: DateTime.now().toMillis() };
      }
      return role;
    });

    pickerIds.forEach((pickerId: any) => {
      if (!roles.some((role: any) => role.partyId === pickerId)) {
        roles.push({
          picklistId: props.selectedPicklist.picklistId,
          partyId: pickerId,
          roleTypeId: "WAREHOUSE_PICKER",
          fromDate: DateTime.now().toMillis()
        });
      }
    });

    const resp = await OrderService.resetPicker({ picklistId: props.selectedPicklist.id, roles });
    if (resp.status === 200 && !commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Pickers successfully replaced in the picklist with the new selections."));
      editedPicklist.value = {
        ...props.selectedPicklist,
        roles: roles.filter((role: any) => !role.thruDate),
        pickerIds,
        pickersName: pickersNameArray.join(", ")
      };
    } else {
      throw resp.data;
    }
  } catch (err) {
    commonUtil.showToast(translate("Something went wrong, could not edit picker(s)"));
    logger.error("Something went wrong, could not edit picker(s)");
  }
};

const arePickersNotSelected = () => {
  return (selectedPickers.value.length === 1 && !selectedPickers.value[0].id) || (!selectedPickers.value.length);
};

const closeModal = () => {
  modalController.dismiss({ dismissed: true, editedPicklist: editedPicklist.value });
};

const selectAlreadyAssociatedPickers = () => {
  selectedPickers.value = pickers.value.filter((picker: any) => props.selectedPicklist.pickerIds.includes(picker.id));
  if (!selectedPickers.value.length) {
    selectedPickers.value = [{ name: props.selectedPicklist.pickersName, id: null }];
  }
};

onMounted(async () => {
  await findPickers();
  selectAlreadyAssociatedPickers();
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
