<template>
  <ion-content>
    <ion-list>
      <!-- If getting reject reasons in props, then use the same otherwise get the reasons from the util state -->
      <ion-item v-for="reason in (rejectReasons?.length ? rejectReasons : rejectReasonOptions)" :key="reason.enumId" @click="updateIssue(reason.enumId)" button>
        {{ reason.enumDescription ? translate(reason.enumDescription) : reason.description ? translate(reason.description) : reason.enumId  }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, popoverController } from "@ionic/vue";
import { computed, defineProps } from "vue";
import { translate } from "@hotwax/dxp-components";
import { useUtilStore } from "@/store/util";

defineProps(["rejectReasons"]);
const rejectReasonOptions = computed(() => useUtilStore().getRejectReasonOptions);

const updateIssue = (enumId: string) => {
  popoverController.dismiss(enumId);
};
</script>
