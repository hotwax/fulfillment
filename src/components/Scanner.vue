<template>
  <ion-toolbar>
    <ion-buttons slot="end" @click="closeScanner()" >
      <ion-button >
        <ion-icon :icon="closeOutline" />
      </ion-button>
    </ion-buttons>  
  </ion-toolbar>   
  <div class="scanner">
    <StreamBarcodeReader
      @decode="onDecode"
      @loaded="onLoaded"
    />
  </div> 
</template>

<script setup lang="ts">
import { StreamBarcodeReader } from "vue-barcode-reader";
import { IonButton, IonButtons, IonIcon, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline } from "ionicons/icons";

const onDecode = (result: any) => {
  modalController.dismiss({ dismissed: true }, result);
};

const closeScanner = () => {
  modalController.dismiss({ dismissed: true });
};
</script>
