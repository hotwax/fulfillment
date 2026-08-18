<template>
  <ion-content>
    <ion-list>
      <ion-item button :disabled="disablePrint" @click="closePopover('printShippingLabel')">
        <ion-icon slot="start" :icon="printOutline" />
        {{ translate("Shipping label") }}
      </ion-item>
      <ion-item button :disabled="disablePrint" @click="closePopover('printPackingSlip')">
        <ion-icon slot="start" :icon="printOutline" />
        {{ translate("Customer letter") }}
      </ion-item>
      <ion-item button lines="none" :disabled="disableUnpack" @click="closePopover('unpack')">
        <ion-icon slot="start" :icon="lockOpenOutline" />
        {{ translate("Unpack") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonItem, IonList, popoverController } from "@ionic/vue";
import { printOutline, lockOpenOutline } from "ionicons/icons";
import { translate } from "@common";
import { defineProps } from "vue";

defineProps(["disablePrint", "disableUnpack"]);

const closePopover = (action: string) => {
  popoverController.dismiss({ action });
};
</script>
