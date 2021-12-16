<template>
  <ion-content>
    <ion-list>
      <ion-item button @click="editPackaging">
        <ion-icon slot="start" :icon="pencil" />
        Edit packaging
      </ion-item>
      <ion-item button @click="reportIssue">
        <ion-icon slot="start" :icon="warning" />
        Report issue
      </ion-item>
      <ion-item button lines="none">
        <ion-icon slot="start" :icon="refresh" />
        Recycle order
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
      const bgjobmodal = await modalController.create({
        component: EditPackagingModal
      });
      return bgjobmodal.present();
    },
     async reportIssue() {
      const bgjobmodal = await modalController.create({
        component: ReportIssueModal
      });
      return bgjobmodal.present();
    }
  },
  setup() {
    return {
        pencil,
        warning,
        refresh    
    }
  }
});
</script>