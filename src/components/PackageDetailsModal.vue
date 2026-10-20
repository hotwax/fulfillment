<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="package-modal-close-btn" @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ title }}</ion-title>
      <ion-buttons slot="end">
        <ion-button data-testid="package-modal-save-btn" color="primary" :disabled="!canSave" @click="save()">
          {{ translate("Save") }}
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item>
        <ion-select v-model="shipmentBoxTypeId" data-testid="package-box-select" interface="popover" :label="translate('Box')" label-placement="floating" :placeholder="translate('Select')">
          <ion-select-option v-for="boxType in boxTypes" :key="boxType.shipmentBoxTypeId" :value="boxType.shipmentBoxTypeId">
            {{ boxLabel(boxType) }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input v-model="weight" data-testid="package-weight-input" type="number" inputmode="decimal" min="0" :label="translate('Weight')" label-placement="floating" :helper-text="translate('Estimated from the weight of each item')">
          <ion-note slot="end">
            {{ unit }}
          </ion-note>
        </ion-input>
      </ion-item>
      <ion-item v-if="isOverLimit" lines="none">
        <ion-icon slot="start" :icon="warningOutline" color="warning" />
        <ion-label class="ion-text-wrap" color="warning" data-testid="package-modal-over-limit">
          {{ translate("Over the {limit} lb limit of a FedEx package. FedEx refuses a package this heavy.", { limit: CARRIER_PACKAGE_WEIGHT_LIMIT_LB }) }}
        </ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonSelect, IonSelectOption, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline, warningOutline } from "ionicons/icons";
import { computed, ref } from "vue";
import { CARRIER_PACKAGE_WEIGHT_LIMIT_LB, type PackageView, formatBoxSize, isOverCarrierLimit, packageChanges, weightUnitLabel } from "@/utils/packageDetails";

// packageView: the package as it is. boxTypes: the boxes to choose from, each with a length, width and height.
const props = defineProps<{ title: string; packageView: PackageView; boxTypes: any[] }>();

const shipmentBoxTypeId = ref(props.packageView.shipmentBoxTypeId ?? "");
const weight = ref(props.packageView.weight !== undefined ? `${props.packageView.weight}` : "");

const unit = computed(() => weightUnitLabel(props.packageView.weightUomId));
const changes = computed(() => packageChanges(props.packageView, { shipmentBoxTypeId: shipmentBoxTypeId.value, weight: weight.value }));
// A weight that was typed but is not above zero cannot be saved.
const isWeightValid = computed(() => `${weight.value ?? ""}`.trim() === "" || Number(weight.value) > 0);
const canSave = computed(() => Object.keys(changes.value).length > 0 && isWeightValid.value);
const isOverLimit = computed(() => isOverCarrierLimit(weight.value === "" ? undefined : Number(weight.value), props.packageView.weightUomId));

const boxLabel = (boxType: any) => [boxType.description || boxType.shipmentBoxTypeId, formatBoxSize(boxType.boxLength, boxType.boxWidth, boxType.boxHeight, boxType.dimensionUomId)].filter(Boolean).join(" · ");

const closeModal = () => modalController.dismiss(undefined, "cancel");
const save = () => modalController.dismiss(changes.value, "save");
</script>
