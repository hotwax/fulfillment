<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  </ion-page>
</template>
<script>
import { IonButtons, IonHeader, IonMenuButton, IonPage, IonToolbar } from "@ionic/vue";
export default {
    name: "Orders",
    components: {
        IonButtons,
        IonHeader,
        IonMenuButton,
        IonPage,
        IonToolbar
    }
}
</script>
