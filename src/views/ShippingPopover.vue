<template>
  <ion-content>
    <ion-list>
      <ion-item button>
        <ion-icon slot="start" :icon="print" />
        Shipping label
      </ion-item>
      <ion-item button>
        <ion-icon slot="start" :icon="print" />
        Customer letter
      </ion-item>
      <ion-item button lines="none">
        <ion-icon slot="start" :icon="lockOpen" />
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
import { print, lockOpen } from 'ionicons/icons'
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
      print,
      lockOpen    
    }
  }
});
</script> 