<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Create rejection reason") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <form>
      <ion-list>
        <ion-item>
          <ion-input @ionBlur="formData.enumId ? null : setEnumId(formData.enumName)" v-model="formData.enumName">
            <div slot="label">{{ translate('Name') }} <ion-text color="danger">*</ion-text></div>
          </ion-input>
        </ion-item>
        <ion-item lines="none">
          <ion-input :label="translate('ID')" v-model="formData.enumId" @ionChange="validateEnumId" @ionBlur="markEnumIdTouched" :errorText="translate('ID cannot be more than 20 characters.')" />
        </ion-item>
        <ion-item>
          <ion-input :label="translate('Description')" v-model="formData.description" />
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-item>
          <ion-select :label="translate('Variance type')" interface="popover" v-model="formData.enumTypeId">
            <ion-select-option v-for="type in rejectReasonEnumTypes" :key="type.enumTypeId" :value="type.enumTypeId">{{ type.enumTypeId }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-label>
            <p>{{ getDescription() }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createReason()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </form>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { computed, ref } from "vue";
import { checkmarkDoneOutline, closeOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { generateInternalId, showToast } from "@/utils";
import { useUtilStore } from "@/store/util";
import { UtilService } from "@/services/UtilService";
import { hasError } from "@/adapter";
import logger from "@/logger";

const rejectReasons = computed(() => useUtilStore().getRejectReasons);
const rejectReasonEnumTypes = computed(() => useUtilStore().getRejectReasonEnumTypes);

const formData = ref({
  description: "",
  enumId: "",
  enumName: "",
  enumTypeId: ""
} as any);

const closeModal = () => {
  modalController.dismiss();
};

const setEnumId = (enumName: any) => {
  formData.value.enumId = generateInternalId(enumName);
};

const createReason = async () => {
  if (!formData.value.enumName?.trim()) {
    showToast(translate("Rejection reason name is required."));
    return;
  }

  if (formData.value.enumId.length > 20) {
    showToast(translate("ID cannot be more than 20 characters."));
    return;
  }

  if (!formData.value.enumTypeId) {
    showToast(translate("Variance type is required."));
    return;
  }

  if (!formData.value.enumId) {
    formData.value.enumId = generateInternalId(formData.value.enumName);
  }

  const sequenceNum = rejectReasons.value[rejectReasons.value.length - 1].sequenceNum;
  formData.value["sequenceNum"] = sequenceNum ? sequenceNum + 5 : 5;

  try {
    const resp = await UtilService.createEnumeration(formData.value);
    if (!hasError(resp)) {
      showToast(translate("Rejection reason created successfully."));
      rejectReasons.value.push(formData.value);
      await useUtilStore().updateRejectReasons(rejectReasons.value);
      modalController.dismiss({ isUpdated: true });
    } else {
      throw resp.data;
    }
  } catch (err) {
    showToast(translate("Failed to create rejection reason."));
    logger.error(err);
  }
};

const validateEnumId = (event: any) => {
  const input = event.target;
  const value = input.value;
  input.classList.remove("ion-valid");
  input.classList.remove("ion-invalid");

  if (value === "") return;

  formData.value.enumId.length <= 20 ? input.classList.add("ion-valid") : input.classList.add("ion-invalid");
};

const markEnumIdTouched = (event: any) => {
  event.target.classList.add("ion-touched");
};

const getDescription = () => {
  return rejectReasonEnumTypes.value.find((type: any) => type.enumTypeId === formData.value.enumTypeId)?.description;
};
</script>
