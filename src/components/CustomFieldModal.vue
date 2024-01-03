<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add custom field") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item lines="full">
        <ion-input :label="translate('Key')" label-placement="fixed" :placeholder="translate('Enter key')" name="key" v-model="key" id="key" type="text" required />
      </ion-item>
      <ion-item>
        <ion-input :label="translate('Value')" label-placement="fixed" :placeholder="translate('Enter value')" name="value" v-model="value" id="value" type="text" required />
      </ion-item>
    </ion-list>

    <ion-fab @click="saveCustomField()" vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button>
        <ion-icon :icon="checkmarkDoneOutline" />  
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { checkmarkDoneOutline, closeOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { showToast } from "@/utils"
import { translate } from '@hotwax/dxp-components'

export default defineComponent({
  name: "CustomFieldModal",
  components: { 
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonTitle,
    IonToolbar,
  },
  data() {
    return {
      key: '',
      value: ''
    }
  },
  props: ["customFields"],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true});
    },
    saveCustomField() {
      const fieldKey = this.key.trim();
      const errorMessage = fieldKey ? this.customFields[fieldKey] ? 'Please enter a unique key' : '' : 'Please enter a valid key'

      if(errorMessage) {
        showToast(translate(errorMessage))
        return;
      }
      modalController.dismiss({ dismissed: true, value: { key: fieldKey, value: this.value } });
    }
  },
  setup() {
    const store = useStore();

    return {
      checkmarkDoneOutline,
      closeOutline,
      store,
      translate
    };
  },
});
</script>
