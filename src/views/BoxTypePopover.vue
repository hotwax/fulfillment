<template>
    <ion-content>
      <ion-list>
        <ion-item button @click="editPackaging">
          {{ '3' }}
        </ion-item>
        <ion-item button @click="editPackaging">
          {{ '4' }}
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
    name: "BoxTypePopover",
    components: { 
      IonContent,
      IonItem,
      IonList,
    },
    methods: {
      async editPackaging() {
        const editmodal = await modalController.create({
          component: EditPackagingModal
        });
        return editmodal.present();
      },
       async reportIssue() {
        const reportmodal = await modalController.create({
          component: ReportIssueModal
        });
        return reportmodal.present();
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