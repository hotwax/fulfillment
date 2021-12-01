<template>
  <ion-page>
    <!-- Page Header -->
    <ion-header>
      <ion-toolbar>
        <!-- Menu Toogle -->
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <!-- Main content of application Page -->
    <ion-content :fullscreen="true">
    In progress, the application
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButtons, IonHeader, IonMenuButton, IonPage, IonToolbar, IonContent } from "@ionic/vue";
export default {
  name: "InProgress",
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonContent,
  },
};
</script>

<style scoped>
</style>