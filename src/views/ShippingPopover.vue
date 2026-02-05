<template>
  <ion-content>
    <ion-list>
      <!-- TODO: Need to give Shipping Label Error Option -->
      <ion-item data-testid="shipping-popover-shipping-label-item" button>
        <ion-icon slot="start" :icon="printOutline" />
        {{ translate("Shipping label") }}
      </ion-item>
      <ion-item data-testid="shipping-popover-customer-letter-item" button>
        <ion-icon slot="start" :icon="printOutline" />
        {{ translate("Customer letter") }}
      </ion-item>
      <ion-item data-testid="shipping-popover-unpack-item" button lines="none">
        <ion-icon slot="start" :icon="lockOpenOutline" />
        {{ translate("Unpack") }}
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
import { translate } from "@hotwax/dxp-components";

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
      lockOpenOutline,
      translate 
    }
  }
});
</script> 