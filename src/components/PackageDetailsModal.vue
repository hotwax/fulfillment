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

  <ion-content class="ion-padding">
    <ion-select
      v-model="shipmentBoxTypeId"
      data-testid="package-box-select"
      fill="outline"
      interface="popover"
      label-placement="floating"
      :label="translate('Box')"
      :placeholder="translate('Select')"
    >
      <ion-select-option v-for="boxType in boxTypes" :key="boxType.shipmentBoxTypeId" :value="boxType.shipmentBoxTypeId">
        {{ boxLabel(boxType) }}
      </ion-select-option>
    </ion-select>

    <section class="weight">
      <ion-list v-if="breakdown.rows.length" lines="full" data-testid="weight-breakdown">
        <ion-list-header>{{ translate("Estimated weight by product") }}</ion-list-header>
        <ion-item v-for="row in breakdown.rows" :key="row.key" data-testid="weight-breakdown-row">
          <ion-thumbnail slot="start">
            <Image :key="row.imageUrl" :src="row.imageUrl" />
          </ion-thumbnail>
          <ion-label class="ion-text-wrap">
            {{ row.name }}
            <p v-if="row.detail">
              {{ row.detail }}
            </p>
          </ion-label>
          <div slot="end" class="item-weight">
            <ion-note :color="row.contributionText ? undefined : 'warning'" data-testid="weight-breakdown-total">
              {{ row.contributionText || "-" }}
            </ion-note>
            <ion-note class="math" data-testid="weight-breakdown-math">
              {{ row.unitText ? translate("{quantity} × {weight}", { quantity: row.quantity, weight: row.unitText }) : translate("{quantity} units, no weight on file", { quantity: row.quantity }) }}
            </ion-note>
          </div>
        </ion-item>
        <ion-item lines="none">
          <ion-label>{{ translate("Estimated total") }}</ion-label>
          <ion-note slot="end" color="dark" data-testid="weight-estimate">
            {{ breakdown.estimateText || "-" }}
          </ion-note>
        </ion-item>
        <p v-if="breakdown.missingCount" class="missing-note" data-testid="weight-missing">
          {{ translate("{count} items have no weight on file and count as nothing in the estimate.", { count: breakdown.missingCount }) }}
        </p>
      </ion-list>

      <ion-item lines="none" class="override">
        <ion-toggle v-model="isOverride" data-testid="weight-override-toggle" justify="space-between">
          {{ translate("Set the weight manually") }}
        </ion-toggle>
      </ion-item>

      <ion-input
        v-model="weight"
        data-testid="package-weight-input"
        fill="outline"
        inputmode="decimal"
        label-placement="floating"
        min="0"
        type="number"
        :disabled="!isOverride"
        :helper-text="isOverride ? translate('The weight the carrier is asked to price') : translate('Estimated from the weight of each product')"
        :label="translate('Weight')"
      >
        <ion-note slot="end">
          {{ unit }}
        </ion-note>
      </ion-input>
    </section>

    <ion-item v-if="isOverLimit" lines="none">
      <ion-icon slot="start" :icon="warningOutline" color="warning" />
      <ion-label class="ion-text-wrap" color="warning" data-testid="package-modal-over-limit">
        {{ translate("Over the {limit} lb limit of a FedEx package. FedEx refuses a package this heavy.", { limit: CARRIER_PACKAGE_WEIGHT_LIMIT_LB }) }}
      </ion-label>
    </ion-item>
  </ion-content>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToggle, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline, warningOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import Image from "@/components/Image.vue";
import { CARRIER_PACKAGE_WEIGHT_LIMIT_LB, type PackageView, type WeightRow, formatBoxSize, isOverCarrierLimit, packageChanges, weightUnitLabel } from "@/utils/packageDetails";

// packageView: the package as it is. boxTypes: the boxes to choose from, each with a length, width and height.
// breakdown: what each product adds to the weight (weightBreakdown), and the sum of it, the estimate.
const props = defineProps<{
  title: string;
  packageView: PackageView;
  boxTypes: any[];
  breakdown: { rows: WeightRow[]; estimate?: number; estimateText: string; missingCount: number };
}>();

const estimate = props.breakdown.estimate;
const shipmentBoxTypeId = ref(props.packageView.shipmentBoxTypeId ?? "");
// The weight is the estimate until the user sets it: from the start when the package holds another weight than the estimate (it was
// set before), or when there is no estimate because no product has a weight.
const isOverride = ref(estimate === undefined || (props.packageView.weight !== undefined && Math.abs(props.packageView.weight - estimate) > 0.005));
const weight = ref(props.packageView.weight !== undefined ? `${props.packageView.weight}` : "");

// Turning the override off puts the estimate back.
watch(isOverride, (isOn) => {
  if(!isOn && estimate !== undefined) {weight.value = `${estimate}`;}
});

const unit = computed(() => weightUnitLabel(props.packageView.weightUomId));
const effectiveWeight = computed(() => isOverride.value ? weight.value : (estimate !== undefined ? `${estimate}` : ""));
const changes = computed(() => packageChanges(props.packageView, { shipmentBoxTypeId: shipmentBoxTypeId.value, weight: effectiveWeight.value }));
// A weight that was typed but is not above zero cannot be saved.
const isWeightValid = computed(() => `${effectiveWeight.value ?? ""}`.trim() === "" || Number(effectiveWeight.value) > 0);
const canSave = computed(() => Object.keys(changes.value).length > 0 && isWeightValid.value);
const isOverLimit = computed(() => isOverCarrierLimit(effectiveWeight.value === "" ? undefined : Number(effectiveWeight.value), props.packageView.weightUomId));

const boxLabel = (boxType: any) => [boxType.description || boxType.shipmentBoxTypeId, formatBoxSize(boxType.boxLength, boxType.boxWidth, boxType.boxHeight, boxType.dimensionUomId)].filter(Boolean).join(" · ");

const closeModal = () => modalController.dismiss(undefined, "cancel");
const save = () => modalController.dismiss(changes.value, "save");
</script>

<style scoped>
ion-select,
ion-input {
  margin-bottom: var(--spacer-sm);
}

.weight {
  margin-top: var(--spacer-sm);
}

.override {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.item-weight {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: end;
}

.item-weight .math {
  font-size: 0.8em;
}

.missing-note {
  margin: 0;
  padding: var(--spacer-xs) var(--spacer-sm);
  color: var(--ion-color-warning-shade);
  font-size: 0.85em;
}
</style>
