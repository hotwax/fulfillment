<template>
  <ion-content>
    <ion-list>
      <!-- TODO: Need to give Shipping Label Error Option -->
      <ion-item button>
        <ion-icon slot="start" :icon="printOutline" />
        {{ $t("Shipping label") }}
      </ion-item>
      <ion-item button>
        <ion-icon slot="start" :icon="printOutline" />
        {{ $t("Customer letter") }}
      </ion-item>
      <ion-item button lines="none">
        <ion-icon slot="start" :icon="lockOpenOutline" />
        {{ $t("Unpack") }}
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