<template>
  <ion-content>
    <ion-list>
      <ion-item button>
        <ion-icon slot="start" :icon="printOutline" />
        Shipping label
      </ion-item>
      <ion-item button>
        <ion-icon slot="start" :icon="printOutline" />
        Customer letter
      </ion-item>
      <ion-item button lines="none">
        <ion-icon slot="start" :icon="lockOpenOutline" />
        Unpack
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList
} from "@ionic/vue";
import { defineComponent } from "vue";
import { printOutline, lockOpenOutline } from 'ionicons/icons'
export default defineComponent({
  name: "ShippingPopover",
  components: { 
    IonContent,
    IonIcon,
    IonItem,
    IonList,
  },
  setup() {
    return {
      printOutline,
      lockOpenOutline    
    }
  }
});
</script> 