<template>
  <ion-content>
    <ion-list>
      <ion-item button @click="editPackaging">
        <ion-icon slot="start" :icon="pencil" />
        {{ translate("Edit packaging") }}
      </ion-item>
      <ion-item button @click="reportIssue" lines="none">
        <ion-icon slot="start" :icon="warning" />
        {{ translate("Report an issue") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  modalController,
} from "@ionic/vue";
import { defineComponent } from "vue";
import EditPackagingModal from '@/views/EditPackagingModal.vue'
import ReportIssueModal from '@/views/ReportIssueModal.vue'
import { pencil, warning, refresh } from 'ionicons/icons'
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "PackagingPopover",
  components: { 
    IonContent,
    IonIcon,
    IonItem,
    IonList,
  },
  methods: {
    async editPackaging() {
      const editmodal = await modalController.create({
        component: EditPackagingModal,
        componentProps: {
          addingBoxForOrderIds: this.addingBoxForOrderIds,
          addShipmentBox: this.addShipmentBox,
          order: this.order,
          updateBox: this.updateBox,
          save: this.save
        }
      });
      return editmodal.present();
    },
    async reportIssue() {
      const reportmodal = await modalController.create({
        component: ReportIssueModal,
        componentProps: {
          order: this.order,
          save: this.save,
          updateRejectReason: this.updateRejectReason
        }
      });
      return reportmodal.present();
    }
  },
  props: ['addingBoxForOrderIds', 'addShipmentBox', 'order',  'save', 'updateBox', 'updateRejectReason'],
  setup() {
    return {
      pencil,
      refresh,
      translate,
      warning
    }
  }
});
</script>