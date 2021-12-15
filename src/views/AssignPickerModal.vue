<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>Assign Pickers</ion-title>
    </ion-toolbar>
  </ion-header>

 <ion-content class="ion-padding">
   <ion-searchbar />  
   <div class="filters">
     <ion-row class="filter-scroll">
       <ion-chip><ion-label>Logged in user</ion-label></ion-chip>
       <ion-chip><ion-label>picker 2</ion-label></ion-chip>    
     </ion-row>
   </div>

   <ion-list>
     <ion-list-header> Staff</ion-list-header>
     <ion-item>
       <ion-label> Name</ion-label>
       <ion-checkbox />
     </ion-item>
     <ion-item>
       <ion-label> Name</ion-label>
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
  IonRow,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { close } from "ionicons/icons";

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
    IonRow,
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
      close
    };
  },
});
</script>