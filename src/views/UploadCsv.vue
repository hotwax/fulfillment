<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/" />
        <ion-title>Upload Csv</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <div class="content">
        <ion-item>
           <ion-label>Shipped orders</ion-label>
           <ion-input placeholder="Select CSV" />
           <ion-button fill="outline">Upload</ion-button>
        </ion-item>

        <ion-list>
          <ion-list-header>Select the column index for the following information in the uploaded CSV</ion-list-header>
          <ion-item>
            <ion-label>Order ID</ion-label>
            <ion-select placeholder="select">
              <ion-select-option>1234</ion-select-option>
              <ion-select-option>5678</ion-select-option>
              <ion-select-option>9012</ion-select-option>
            </ion-select>
          </ion-item>
           <ion-item>
            <ion-label>Order Shipment ID</ion-label>
            <ion-select placeholder="select">
              <ion-select-option>1234</ion-select-option>
              <ion-select-option>5678</ion-select-option>
              <ion-select-option>9012</ion-select-option>
            </ion-select>
          </ion-item>
           <ion-item>
            <ion-label>Tracking ID</ion-label>
            <ion-select placeholder="select">
              <ion-select-option>1234</ion-select-option>
              <ion-select-option>5678</ion-select-option>
              <ion-select-option>9012</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-button expand="block">Save</ion-button>

        <ion-item>
          <ion-label>50 shipments ready to ship</ion-label>
          <ion-button slot="end" fill="outline">
            <ion-icon slot="start" :icon="download" />
            Download  
          </ion-button>
        </ion-item>

      </div>
    </ion-content> 
  </ion-page>
</template>

<script lang="ts">
import { 
  IonBackButton,
  IonButton, 
  IonContent, 
  IonHeader, 
  IonInput,
  IonItem, 
  IonLabel, 
  IonPage, 
  IonTitle, 
  IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { download } from 'ionicons/icons'

export default defineComponent({
  name: 'UploadCsv',
  components: {
    IonBackButton,  
    IonButton, 
    IonContent, 
    IonHeader, 
    IonInput,
    IonItem, 
    IonLabel, 
    IonPage, 
    IonTitle, 
    IonToolbar
  },
  setup() {
    return {
      download
    }
  }
});
</script>

<style scoped>
.content {
 max-width: 732px;
 margin-top: 20px;
 margin-right: auto;
 margin-left: auto;
}
</style>