<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Create rejection reason") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <form>
      <ion-list>
        <ion-item>
          <ion-label>{{ translate("Name") }}</ion-label>
          <ion-input />
        </ion-item>
        <ion-item>
          <ion-label>{{ translate("ID") }}</ion-label>
          <ion-input />
        </ion-item>
        <ion-item>
          <ion-label>{{ translate("Description") }}</ion-label>
          <ion-input />
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-item>
          <ion-label>{{ translate("Variance type") }}</ion-label>
          <ion-select interface="popover" value="">
            <ion-select-option value="">{{ "No variance" }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-label>
            <p>{{ "< Variance type desc >" }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </form>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { checkmarkDoneOutline, closeOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components'
import { mapGetters, useStore } from 'vuex'

export default defineComponent({
  name: "CreateRejectReasonModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
  },
  computed: {
    ...mapGetters({
      currentFacility: 'facility/getCurrent'
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss()
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