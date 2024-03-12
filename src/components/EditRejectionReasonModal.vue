<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Edit name and description") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <form @keyup.enter="updateRejectionReason()">
      <ion-item>
        <ion-label>{{ translate("Name") }}</ion-label>
        <ion-input v-model="rejectionReason.enumName" />
      </ion-item>
      <ion-item>
        <ion-label>{{ translate("Description") }}</ion-label>
        <ion-textarea v-model="rejectionReason.description" />
      </ion-item>
    </form>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="updateRejectionReason()" :disabled="!isReasonUpdated()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonTextarea,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { closeOutline, saveOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components'
import logger from "@/logger";
import { UtilService } from "@/services/UtilService";
import { hasError } from "@/adapter";
import { showToast } from "@/utils";

export default defineComponent({
  name: "EditRejectionReasonModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonTextarea,
    IonTitle,
    IonToolbar
  },
  computed: {
    ...mapGetters({
      rejectReasons: 'util/getRejectReasons',
    })
  },
  data() {
    return {
      rejectionReason: {} as any,
    }
  },
  props: ['reason'],
  beforeMount() {
    this.rejectionReason = JSON.parse(JSON.stringify(this.reason))
  },
  methods: {
    closeModal() {
      modalController.dismiss()
    },
    isReasonUpdated() {
      return JSON.stringify(this.reason) !== JSON.stringify(this.rejectionReason)
    },
    async updateRejectionReason() {
      try {
        const resp = await UtilService.updateEnumeration(this.rejectionReason)

        if(!hasError(resp)) {
          showToast(translate("Rejection reason updated successfully."))
          const rejectReason = this.rejectReasons.map((reason: any) => reason.enumId === this.rejectionReason.enumId)
          rejectReason.enumName = this.rejectionReason.enumName
          rejectReason.description = this.rejectionReason.description
          await this.store.dispatch('util/updateRejectReasons', this.rejectReasons)
          modalController.dismiss()
        } else {
          throw resp.data;
        }
      } catch(err) {
        logger.error(err)
        showToast(translate("Failed to update rejection reason."))
      }
    }
  },
  setup() {
    const store = useStore()

    return {
      closeOutline,
      saveOutline,
      store,
      translate
    };
  },
});
</script>