<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Rejection reasons") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div v-if="filteredReasons.length">
          <ion-reorder-group @ionItemReorder="doReorder($event)" :disabled="false">
            <div class="list-item" v-for="reason in filteredReasons" :key="reason.enumId">
              <ion-item lines="none">
                <ion-label>
                  <p class="overline">{{ reason.enumId }}</p>
                  {{ reason.enumName ? reason.enumName : reason.enumId }}
                  <p>{{ reason.description }}</p>
                </ion-label>
              </ion-item>

              <div class="tablet">
                <ion-chip outline @click="openVarianceTypeActionsPopover($event, reason)">
                  <ion-label>{{ reason.enumTypeId }}</ion-label>
                  <ion-icon :icon="caretDownOutline" />
                </ion-chip>
              </div>

              <div class="tablet">
                <ion-toggle :checked="fulfillmentRejectReasons[reason.enumId]" @click.prevent="updateFulfillmentRejectReasonAssocStatus($event, reason)" />
              </div>

              <ion-reorder />

              <ion-button fill="clear" color="medium" @click="openRejectionReasonActionsPopover($event, reason)">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </div>
          </ion-reorder-group>
        </div>
        <div class="empty-state" v-else>
          <p>{{ translate("No rejection reasons found.") }}</p>
        </div>
      </main>

      <ion-fab @click="openCreateRejectionReasonModal()" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonChip, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonPage, IonReorder, IonReorderGroup, IonTitle, IonToggle, IonToolbar, alertController, modalController, onIonViewWillEnter, popoverController } from "@ionic/vue";
import { computed, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { addOutline, caretDownOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import CreateRejectionReasonModal from "@/components/CreateRejectionReasonModal.vue";
import RejectReasonActionsPopver from "@/components/RejectReasonActionsPopver.vue";
import VarianceTypeActionsPopover from "@/components/VarianceTypeActionsPopover.vue";
import { useUtilStore } from "@/store/util";
import { UtilService } from "@/services/UtilService";
import { commonUtil } from "@/utils/commonUtil";
import { DateTime } from "luxon";
import { hasError } from "@hotwax/oms-api";
import logger from "@/logger";

const filteredReasons = ref([] as any);
const toast = ref(null as any);

const rejectReasons = computed(() => useUtilStore().getRejectReasons);
const fulfillmentRejectReasons = computed(() => useUtilStore().getFulfillmentRejectReasons);

const openCreateRejectionReasonModal = async () => {
  const createRejectionReasonModal = await modalController.create({
    component: CreateRejectionReasonModal
  });

  createRejectionReasonModal.onDidDismiss().then((result) => {
    if (result.data?.isUpdated) {
      filteredReasons.value = JSON.parse(JSON.stringify(rejectReasons.value));
    }
  });

  createRejectionReasonModal.present();
};

const openRejectionReasonActionsPopover = async (event: Event, reason: any) => {
  const popover = await popoverController.create({
    component: RejectReasonActionsPopver,
    componentProps: { reason },
    showBackdrop: false,
    event
  });

  popover.onDidDismiss().then(() => {
    filteredReasons.value = JSON.parse(JSON.stringify(rejectReasons.value));
  });

  return popover.present();
};

const openVarianceTypeActionsPopover = async (event: Event, reason: any) => {
  const varianceTypeActionsPopover = await popoverController.create({
    component: VarianceTypeActionsPopover,
    componentProps: { reason },
    showBackdrop: false,
    event
  });

  varianceTypeActionsPopover.onDidDismiss().then((result) => {
    if (result.data?.isUpdated) {
      filteredReasons.value = JSON.parse(JSON.stringify(rejectReasons.value));
    }
  });

  return varianceTypeActionsPopover.present();
};

const doReorder = async (event: CustomEvent) => {
  const previousSeq = JSON.parse(JSON.stringify(filteredReasons.value));

  const updatedSeq = event.detail.complete(JSON.parse(JSON.stringify(filteredReasons.value)));

  let diffSeq = findReasonsDiff(previousSeq, updatedSeq);

  const updatedSeqenceNum = previousSeq.map((rejectionReason: any) => rejectionReason.sequenceNum);
  Object.keys(diffSeq).map((key: any) => {
    diffSeq[key].sequenceNum = updatedSeqenceNum[key];
  });

  diffSeq = Object.keys(diffSeq).map((key) => diffSeq[key]);
  filteredReasons.value = updatedSeq;

  if (diffSeq.length && !toast.value) {
    toast.value = await commonUtil.showToast(translate("Rejection reasons order has been change. Click save button to update them."), {
      buttons: [{
        text: translate("Save"),
        handler: () => {
          toast.value = null;
          saveReasonsOrder();
        }
      }],
      manualDismiss: true
    }) as any;

    toast.value.present();
  }
};

const findReasonsDiff = (previousSeq: any, updatedSeq: any) => {
  const diffSeq: any = Object.keys(previousSeq).reduce((diff, key) => {
    if (updatedSeq[key].enumId === previousSeq[key].enumId && updatedSeq[key].sequenceNum === previousSeq[key].sequenceNum) return diff;
    return {
      ...diff,
      [key]: updatedSeq[key]
    };
  }, {});
  return diffSeq;
};

const saveReasonsOrder = async () => {
  const diffReasons = filteredReasons.value.filter((reason: any) => rejectReasons.value.some((rejectReason: any) => rejectReason.enumId === reason.enumId && rejectReason.sequenceNum !== reason.sequenceNum));

  const responses = await Promise.allSettled(diffReasons.map(async (reason: any) => {
    await UtilService.updateEnumeration(reason);
  }));

  const isFailedToUpdateSomeReason = responses.some((response) => response.status === "rejected");
  if (isFailedToUpdateSomeReason) {
    commonUtil.showToast(translate("Failed to update sequence for some rejection reasons."));
  } else {
    commonUtil.showToast(translate("Sequence for rejection reasons updated successfully."));
  }
};

const updateFulfillmentRejectReasonAssocStatus = async (event: any, reason: any) => {
  event.stopImmediatePropagation();
  let resp;

  const payload = {
    enumerationId: reason.enumId,
    enumerationGroupId: "FF_REJ_RSN_GRP",
    sequenceNum: reason.sequenceNum
  };

  try {
    if (fulfillmentRejectReasons.value[reason.enumId]?.fromDate) {
      resp = await UtilService.updateEnumerationGroupMember({
        ...payload,
        fromDate: fulfillmentRejectReasons.value[reason.enumId]?.fromDate,
        thruDate: DateTime.now().toMillis()
      });
    } else {
      resp = await UtilService.createEnumerationGroupMember({
        ...payload,
        fromDate: DateTime.now().toMillis()
      });
    }

    if (!hasError(resp)) {
      await useUtilStore().fetchFulfillmentRejectReasons();
    } else {
      throw resp.data;
    }
  } catch (error: any) {
    logger.error(error);
    commonUtil.showToast(translate("Failed to update reason association with fulfillment group."));
  }
};

onIonViewWillEnter(async () => {
  await Promise.all([useUtilStore().fetchRejectReasons(), useUtilStore().fetchFulfillmentRejectReasons(), useUtilStore().fetchRejectReasonEnumTypes()]);
  filteredReasons.value = rejectReasons.value ? JSON.parse(JSON.stringify(rejectReasons.value)) : [];
});

onBeforeRouteLeave(async () => {
  if (!toast.value) return true;

  let canLeave = false;
  const alert = await alertController.create({
    header: translate("Leave page"),
    message: translate("Any edits made on this page will be lost."),
    buttons: [
      {
        text: translate("STAY"),
        handler: () => {
          canLeave = false;
        }
      },
      {
        text: translate("LEAVE"),
        handler: () => {
          canLeave = true;
          toast.value.dismiss();
        }
      }
    ]
  });

  alert.present();
  await alert.onDidDismiss();
  return canLeave;
});
</script>

<style scoped>
.list-item {
  --columns-desktop: 5;
}

.list-item:hover {
  cursor: default;
}

ion-content {
  --padding-bottom: 80px;
}
</style>
