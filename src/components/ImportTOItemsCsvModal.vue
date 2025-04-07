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

<script lang="ts">
import {
  IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
  IonItem, IonList, IonListHeader, IonSelect, IonSelectOption, IonTitle, IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { showToast } from "@/utils";

export default defineComponent({
  name: "ImportTOItemsCsvModal",
  components: {
    IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
    IonItem, IonList, IonListHeader, IonSelect, IonSelectOption, IonTitle, IonToolbar
  },
  props: {
    fileColumns: {
      type: Array,
      required: true
    },
    content: {
      type: Array,
      required: true
    },
    countId: {
      type: String,
      required: false
    }
  },
  data() {
    return {
      productIdentifications: [],
      selectedIdentifier: '',
      selectedIdentifierColumn: '',
      selectedQuantityColumn: ''
    };
  },
  mounted() {
    this.prepareIdentifiers();
  },
  methods: {
    async prepareIdentifiers() {
      await useProductIdentificationStore().prepareProductIdentifierOptions();
      const options = useProductIdentificationStore().getGoodIdentificationOptions;
      this.productIdentifications = options ? options : [];
    },
    closeModal(identifierData = {}) {
      modalController.dismiss({ identifierData });
    },
    saveImportData() {
      if (!this.selectedIdentifier) {
        return showToast(translate("Please select a Product identifier"));
      }
      if (!this.selectedIdentifierColumn) {
        return showToast(translate("Please select the index for the product identifier column"));
      }

      const idValues: Record<string, any> = {};
      this.content.forEach((row: any) => {
        const key = row[this.selectedIdentifierColumn];
        const value = row[this.selectedQuantityColumn];
        if (key) {
          idValues[key] = value;
        }
      });

      const identifierData = {
        productField: this.selectedIdentifierColumn,
        quantityField: this.selectedQuantityColumn,
        idType: this.selectedIdentifier,
        idValue: idValues
      };

      this.closeModal(identifierData);
    },
  },
  setup() {
    return {
      translate,
      closeOutline,
      saveOutline
    }
  }
});
</script>

<style scoped>
ion-content {
  --padding-bottom: 70px;
}
</style>
