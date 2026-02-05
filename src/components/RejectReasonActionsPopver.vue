<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ reason.enumName ? reason.enumName : reason.enumId }}
      </ion-list-header>
      <ion-item data-testid="reject-reason-actions-popover-edit-item" button @click="openEditRejectionReasonModal()">
        {{ translate("Edit name and description") }}
      </ion-item>
      <ion-item data-testid="reject-reason-actions-popover-remove-item" button lines="none" @click="removeRejectionReason()">
        {{ translate("Remove reason") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>
  
<script lang="ts">
import {
  IonContent,
  IonItem,
  IonList,
  IonListHeader,
  alertController,
  modalController,
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { translate } from '@hotwax/dxp-components'
import EditRejectionReasonModal from "@/components/EditRejectionReasonModal.vue";
import { UtilService } from "@/services/UtilService";
import { hasError } from "@/adapter";
import { showToast } from "@/utils";
import logger from "@/logger";
import { mapGetters, useStore } from "vuex";

export default defineComponent({
  name: "RejectReasonActionsPopover",
  components: {
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  props: ["reason"],
  computed: {
    ...mapGetters({
      rejectReasons: 'util/getRejectReasons',
      rejectReasonEnumTypes: 'util/getRejectReasonEnumTypes',
    })
  },
  methods: {
    async openEditRejectionReasonModal() {
      const editRejectionReasonModal = await modalController.create({
        component: EditRejectionReasonModal,
        componentProps: { reason: this.reason }
      })

      editRejectionReasonModal.onDidDismiss().then(() => {
        popoverController.dismiss()
      })

      return editRejectionReasonModal.present()
    },
    async removeRejectionReason() {
      const alert = await alertController.create({
        header: translate("Remove rejection reason"),
        message: translate("Are you sure you want to remove this rejection reason?"),
        buttons: [{
          text: translate("Cancel"),
          role: 'cancel'
        }, {
          text: translate("Confirm"),
          handler: async () => {
            try {
              const resp = await UtilService.deleteEnumeration({
                enumId: this.reason.enumId
              })

              if(!hasError(resp)) {
                showToast(translate("Rejection reason removed successfully."))
                const updatedRejectReasons = this.rejectReasons.filter((rejectReason: any) => rejectReason.enumId !== this.reason.enumId)
                await this.store.dispatch('util/updateRejectReasons', updatedRejectReasons)
              } else {
                throw resp.data
              }
            } catch(err) {
              showToast(translate("Failed to remove rejection reason."))
              logger.error(err)
            }

            popoverController.dismiss()
          }
        }]
      });

      return alert.present();
    }
  },
  setup() {
    const store = useStore()

    return {
      store,
      translate
    }
  },
});
</script> 