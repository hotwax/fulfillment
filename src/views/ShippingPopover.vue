<template>
  <ion-content>
    <ion-list>
      <ion-item button>
        <ion-icon slot="start" :icon="printOutline" />
        {{ translate("Shipping label") }}
      </ion-item>
      <ion-item button>
        <ion-icon slot="start" :icon="printOutline" />
        {{ translate("Customer letter") }}
      </ion-item>
      <ion-item button lines="none">
        <ion-icon slot="start" :icon="lockOpenOutline" />
        {{ translate("Unpack") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonItem, IonList } from "@ionic/vue";
import { printOutline, lockOpenOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
</script>
