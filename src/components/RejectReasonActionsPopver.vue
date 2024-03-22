<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ reason.enumName ? reason.enumName : reason.description }}
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
  
<script lang="ts">
import {
  IonContent,
  IonItem,
  IonList,
  IonListHeader,
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

      editRejectionReasonModal.present()
    },
    async removeRejectionReason() {
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