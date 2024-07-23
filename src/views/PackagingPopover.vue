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
  popoverController
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
  props: ["order"],
  methods: {
    async editPackaging() {
      const editmodal = await modalController.create({
        component: EditPackagingModal
      });
      return editmodal.present();
    },
     async reportIssue() {
      const reportmodal = await modalController.create({
        component: ReportIssueModal,
        componentProps: { order: this.order }
      });

      reportmodal.present();

      reportmodal.onDidDismiss().then((result) => {
        if(result.data?.dismissed) {
          popoverController.dismiss(result.data);
        }
      })
    }
  },
  setup() {
    return {
      pencil,
      warning,
      refresh,
      translate
    }
  }
});
</script>