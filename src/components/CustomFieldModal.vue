<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Add Custom Field") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item lines="full">
        <ion-label position="fixed">{{ $t("Key") }}</ion-label>
        <ion-input name="key" v-model="key" id="key" type="text" required />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ $t("Value") }}</ion-label>
        <ion-input name="value" v-model="value" id="value" type="text" required />
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

<style scoped>
ion-row {
  flex-wrap: nowrap;
  overflow: scroll;
}

ion-chip {
  flex-shrink: 0;
}
</style>
