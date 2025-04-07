<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Import CSV") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item>
      <ion-select :label="translate('Product identifier')" interface="popover" :placeholder="translate('Select')" v-model="selectedIdentifier">
        <ion-select-option v-for="identification in productIdentifications" :key="identification">{{ identification }}</ion-select-option>
      </ion-select>
    </ion-item>
    
    <ion-list>
      <ion-list-header>{{ translate("Select the column index for the following information in the uploaded CSV.") }}</ion-list-header>
      <ion-item>
        <ion-select :label="translate('Identifier')" interface="popover" :placeholder="translate('Select')" v-model="selectedIdentifierColumn">
          <ion-select-option v-for="column in fileColumns" :key="column">{{ column }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-select :label="translate('Quantity')" interface="popover" :placeholder="translate('Select')" v-model="selectedQuantityColumn">
          <ion-select-option v-for="column in fileColumns" :key="column">{{ column }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="saveImportData">
        <ion-icon :icon="saveOutline"/>  
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>
  
<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonList, IonListHeader, IonSelect, IonSelectOption, IonTitle, IonToolbar,modalController } from "@ionic/vue";
import { defineProps, onMounted, ref } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { showToast } from "@/utils";

const props = defineProps(["fileColumns", "content", "countId"])
const productIdentifications = ref([]) as any;

const selectedIdentifier = ref('')
const selectedIdentifierColumn = ref('')
const selectedQuantityColumn = ref('')

onMounted(async () => {
  await useProductIdentificationStore().prepareProductIdentifierOptions();
  productIdentifications.value = useProductIdentificationStore()?.getGoodIdentificationOptions ? useProductIdentificationStore().getGoodIdentificationOptions : []
})

function closeModal(identifierData = {}) {
  modalController.dismiss({ identifierData });
}

function saveImportData() {
  if (!selectedIdentifier.value) {
    return showToast(translate("Please select a Product identifier"));
  }

  if (!selectedIdentifierColumn.value) {
    return showToast(translate("Please select the index for the product identifier column"));
  }

  const idType = selectedIdentifier.value;
  let idValues = {} as any;

  props.content.map((row: any) => {
    if(row[selectedIdentifierColumn.value]) {
      idValues[row[selectedIdentifierColumn.value]] = row[selectedQuantityColumn.value];
    }
  })

  let identifierData = {
    productField: selectedIdentifierColumn.value,
    quantityField: selectedQuantityColumn.value,
    idType: idType,
    idValue: idValues
  };

  closeModal(identifierData);
}
</script>
    
<style scoped>
ion-content {
  --padding-bottom: 70px;
}
</style>