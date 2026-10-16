<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ title }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item>
      <ion-select label-placement="floating" interface="popover" v-model="formData.weightUomId">
        <div slot="label">{{ translate("Weight UOM") }}</div>
        <ion-select-option v-for="uom in weightUoms" :key="uom.uomId" :value="uom.uomId">{{ uom.description || uom.uomId }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item>
      <ion-input label-placement="floating" v-model="formData.packagingType">
        <div slot="label">{{ translate("Packaging type") }}</div>
      </ion-input>
    </ion-item>
    <ion-note class="ion-padding-start">{{ translate('e.g. YOUR_PACKAGING') }}</ion-note>
    <ion-item>
      <ion-input label-placement="floating" v-model="formData.dropoffType">
        <div slot="label">{{ translate("Dropoff type") }}</div>
      </ion-input>
    </ion-item>
    <ion-note class="ion-padding-start">{{ translate('e.g. USE_SCHEDULED_PICKUP, DropOff') }}</ion-note>
    <ion-item>
      <ion-input label-placement="floating" v-model="formData.labelSize">
        <div slot="label">{{ translate("Label size") }}</div>
      </ion-input>
    </ion-item>
    <ion-note class="ion-padding-start">{{ translate('e.g. PAPER_4X6') }}</ion-note>
    <ion-item>
      <ion-input label-placement="floating" v-model="formData.labelImageType">
        <div slot="label">{{ translate("Label image type") }}</div>
      </ion-input>
    </ion-item>
    <ion-note class="ion-padding-start">{{ translate('e.g. PNG') }}</ion-note>
    <ion-item>
      <ion-input label-placement="floating" v-model="formData.carrierAccountId">
        <div slot="label">{{ translate("Carrier account ID") }}</div>
      </ion-input>
    </ion-item>
    <ion-item>
      <ion-input label-placement="floating" v-model="formData.customerNumber">
        <div slot="label">{{ translate("Customer number") }}</div>
      </ion-input>
    </ion-item>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="saveConfig()">
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonNote, IonSelect, IonSelectOption, IonTitle, IonToolbar, modalController, onIonViewWillEnter } from "@ionic/vue";
import { computed, ref } from "vue";
import { close, saveOutline } from "ionicons/icons";
import { commonUtil, logger, translate } from "@common";
import { useCarrierStore } from "@/store/carrier";

const props = defineProps({
  config: {
    type: Object,
    default: () => ({})
  },
  productStoreId: {
    type: String,
    required: true
  },
  carrierPartyId: {
    type: String,
    required: true
  },
  facilityId: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: ""
  }
});

const carrierStore = useCarrierStore();
const weightUoms = computed(() => carrierStore.getWeightUoms);

const formData = ref({
  weightUomId: (props.config as any).weightUomId || "",
  packagingType: (props.config as any).packagingType || "",
  dropoffType: (props.config as any).dropoffType || "",
  labelSize: (props.config as any).labelSize || "",
  labelImageType: (props.config as any).labelImageType || "",
  carrierAccountId: (props.config as any).carrierAccountId || "",
  customerNumber: (props.config as any).customerNumber || ""
});

onIonViewWillEnter(() => {
  if (!weightUoms.value?.length) carrierStore.fetchWeightUoms();
});

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const saveConfig = async () => {
  const payload: any = {
    ...formData.value,
    productStoreId: props.productStoreId,
    carrierPartyId: props.carrierPartyId,
    facilityId: props.facilityId || undefined
  };
  if ((props.config as any).carrierConfigId) payload.carrierConfigId = (props.config as any).carrierConfigId;

  try {
    await carrierStore.saveCarrierConfig(payload);
    commonUtil.showToast(translate("Carrier configuration saved successfully."));
    modalController.dismiss({ isUpdated: true });
  } catch (err) {
    commonUtil.showToast(translate("Failed to save carrier configuration."));
    logger.error(err);
  }
};
</script>
