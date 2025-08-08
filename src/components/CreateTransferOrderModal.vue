<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Create transfer order") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="full">
      <ion-input :label="translate('Transfer name')" :placeholder="translate('Add a name')" />
    </ion-item>

    <ion-searchbar :placeholder="translate('Search facilites')"/>
    <ion-list>
      <ion-list-header>{{ translate("Select destination facility") }}</ion-list-header>
      <ion-item>
        <ion-radio label-placement="end" justify="start">
          <ion-label>
            Facility name
            <p>Facility Id</p>
          </ion-label>
        </ion-radio>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button>
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent, IonInput, IonSearchbar, IonList, IonListHeader, IonItem, IonRadio, IonLabel, IonFab, IonFabButton, modalController } from '@ionic/vue';
import { closeOutline, saveOutline } from 'ionicons/icons'
import { translate } from '@hotwax/dxp-components';

function closeModal() {
  modalController.dismiss({ dismissed: true });
}
</script>