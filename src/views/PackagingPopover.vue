<template>
  <ion-content>
    <ion-list>
      <ion-item button @click="editPackaging">
        <ion-icon slot="start" :icon="pencil" />
        {{ $t("Edit packaging") }}
      </ion-item>
      <ion-item button @click="reportIssue" lines="none">
        <ion-icon slot="start" :icon="warning" />
        {{ $t("Report an issue") }}
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
          order: this.order,
          updateBox: this.updateBox,
          addingBoxForOrderIds: this.addingBoxForOrderIds,
          addShipmentBox: this.addShipmentBox,
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
  props: ['order', 'updateBox', 'addingBoxForOrderIds', 'addShipmentBox', 'save', 'updateRejectReason'],
  setup() {
    return {
        pencil,
        warning,
        refresh
    }
  }
});
</script>