<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start"></ion-menu-button>
        <ion-title>10 of 26 orders</ion-title>
        <ion-buttons slot="end">
        <ion-button>
          <ion-icon :icon="options" />
        </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-searchbar></ion-searchbar> 
       <div class="duration">
         <ion-item lines="none">
           <ion-checkbox  slot="start"/>
           <ion-label>
             <h5>Same day</h5>
             <p> 37 orders, 40 items </p>
           </ion-label>
         </ion-item>
         <ion-item lines="none">
           <ion-checkbox  slot="start"/>
           <ion-label>
             <h5>Next day</h5>
             <p> 37 orders, 40 items </p>
           </ion-label>
         </ion-item>
       </div> 
      
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonLabel, IonIcon, IonItem, IonMenuButton, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { options } from 'ionicons/icons'

export default defineComponent({
  name: 'OpenOrders',
  components: {
    IonButton,
    IonButtons,  
    IonCheckbox,
    IonContent,
    IonHeader,
    IonLabel,
    IonIcon,
    IonItem,
    IonMenuButton,
    IonPage,
    IonSearchbar,
    IonTitle,
    IonToolbar
  },
  setup() {
    return{
      options
    }
  }
});
</script>
<style scoped>
.duration {
  display: flex;
}

ion-item {
 margin: 10px;
 border: 0.01px solid black;
 border-radius: 10px;
}
</style>