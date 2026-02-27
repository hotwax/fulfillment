<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ reason.enumName ? reason.enumName : reason.enumId }}
      </ion-list-header>
      <ion-item button @click="openEditRejectionReasonModal()">
        {{ translate("Edit name and description") }}
      </ion-item>
      <ion-item button lines="none" @click="removeRejectionReason()">
        {{ translate("Remove reason") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>
  
<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, alertController, modalController, popoverController } from "@ionic/vue";
import { computed, defineProps } from "vue";
import { translate } from "@hotwax/dxp-components";
import EditRejectionReasonModal from "@/components/EditRejectionReasonModal.vue";
import { UtilService } from "@/services/UtilService";
import { hasError } from "@/adapter";
import { commonUtil } from "@/utils/commonUtil";
import logger from "@/logger";
import { useUtilStore } from "@/store/util";

const props = defineProps(["reason"]);
const rejectReasons = computed(() => useUtilStore().getRejectReasons);

const openEditRejectionReasonModal = async () => {
  const editRejectionReasonModal = await modalController.create({ component: EditRejectionReasonModal, componentProps: { reason: props.reason } });
  editRejectionReasonModal.onDidDismiss().then(() => {
    popoverController.dismiss();
  });
  return editRejectionReasonModal.present();
};

const removeRejectionReason = async () => {
  const alert = await alertController.create({
    header: translate("Remove rejection reason"),
    message: translate("Are you sure you want to remove this rejection reason?"),
    buttons: [
      { text: translate("Cancel"), role: "cancel" },
      {
        text: translate("Confirm"),
        handler: async () => {
          try {
            const resp = await UtilService.deleteEnumeration({ enumId: props.reason.enumId });
            if (!hasError(resp)) {
              commonUtil.showToast(translate("Rejection reason removed successfully."));
              const updatedRejectReasons = rejectReasons.value.filter((rejectReason: any) => rejectReason.enumId !== props.reason.enumId);
              await useUtilStore().updateRejectReasons(updatedRejectReasons);
            } else {
              throw resp.data;
            }
          } catch (err) {
            commonUtil.showToast(translate("Failed to remove rejection reason."));
            logger.error(err);
          }
          popoverController.dismiss();
        }
      }
    ]
  });

  return alert.present();
};
</script> 
