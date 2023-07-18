<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Add custom field") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item lines="full">
        <ion-label position="fixed">{{ $t("Key") }}</ion-label>
        <ion-input :placeholder="$t('Enter key')" name="key" v-model="key" id="key" type="text" required />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ $t("Value") }}</ion-label>
        <ion-input :placeholder="$t('Enter value')" name="value" v-model="value" id="value" type="text" required />
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
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { checkmarkDoneOutline, closeOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { showToast } from "@/utils"
import { translate } from "@/i18n";

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
    IonLabel,
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
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true});
    },
    saveCustomField() {
      if(!this.key.trim()) {
        showToast(translate('Please enter a valid key'))
        return;
      }
      modalController.dismiss({ dismissed: true, value: { key: this.key, value: this.value } });
    }
  },
  setup() {
    const store = useStore();

    return {
      checkmarkDoneOutline,
      closeOutline,
      store
    };
  },
});
</script>
