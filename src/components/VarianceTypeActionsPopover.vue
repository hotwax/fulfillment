<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ translate("Variance type") }}
      </ion-list-header>
      <ion-item lines="none" button @click="updateVarianceType(type)" v-for="type in rejectReasonEnumTypes" :key="type.enumTypeId">
        {{ type.enumTypeId }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>
  
<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, popoverController } from "@ionic/vue";
import { computed, defineProps } from "vue";
import { translate } from "@hotwax/dxp-components";
import { useUtilStore } from "@/store/util";
import { UtilService } from "@/services/UtilService";
import logger from "@/logger";
import { hasError } from "@/adapter";
import { commonUtil } from "@/utils/commonUtil";

const props = defineProps(["reason"]);
const rejectReasons = computed(() => useUtilStore().getRejectReasons);
const rejectReasonEnumTypes = computed(() => useUtilStore().getRejectReasonEnumTypes);

const updateVarianceType = async (selectedType: any) => {
  if (props.reason.enumTypeId === selectedType.enumTypeId) {
    popoverController.dismiss();
    return;
  }

  try {
    const resp = await UtilService.updateEnumeration({
      description: props.reason.description,
      enumId: props.reason.enumId,
      enumTypeId: selectedType.enumTypeId
    });

    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Variance type updated successfully."));
      const rejectReason = rejectReasons.value.find((reason: any) => reason.enumId === props.reason.enumId);
      if (rejectReason) {
        rejectReason.enumTypeId = selectedType.enumTypeId;
      }
      await useUtilStore().updateRejectReasons(rejectReasons.value);
    } else {
      throw resp.data;
    }
  } catch (err) {
    commonUtil.showToast(translate("Failed to update variance type."));
    logger.error(err);
  }
  popoverController.dismiss({ isUpdated: true });
};
</script> 
