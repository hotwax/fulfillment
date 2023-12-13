<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
          <ion-title>{{ virtualProductName }}</ion-title>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <img :src="imageUrl" />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { closeOutline } from "ionicons/icons";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
export default defineComponent({
  name: 'ImageModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonPage,
    IonTitle,
    IonToolbar
  },
  props: {
    imageUrl: String,
    virtualProductName: String
  },
  methods: {
    closeModal() {
      modalController.dismiss({
        dismissed: true
      })
    }
  },
  setup() {
    return {
      closeOutline
    }
  }
});
</script>
