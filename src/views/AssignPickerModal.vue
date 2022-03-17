<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
    </ion-toolbar>
  </ion-header>

 <ion-content>
   <ion-searchbar />  
   <ion-row>
     <ion-chip><ion-label>Logged in user</ion-label></ion-chip>
     <ion-chip><ion-label>picker 2</ion-label></ion-chip>    
   </ion-row>

   <ion-list>
     <ion-list-header>{{ $t("Staff") }}</ion-list-header>
     <ion-item>
       <ion-label>Name</ion-label>
       <ion-checkbox />
     </ion-item>
     <ion-item>
       <ion-label>Name</ion-label>
       <ion-checkbox />
     </ion-item>
   </ion-list>
  </ion-content>
</template>

<script>
import { 
  IonButtons,
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline } from "ionicons/icons";

export default defineComponent({
  name: "AssignPickerModal",
  components: { 
    IonButtons,
    IonButton,
    IonCheckbox,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    return {
      closeOutline
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