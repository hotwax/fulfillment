<template>
  <ion-content>
    <ion-list>
      <ion-item v-for="shipmentPackage in shipmentPackages" :key="shipmentPackage" @click="updateBox(shipmentPackage.packageName)" button>
        {{ shipmentPackage.packageName }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonItem,
  IonList,
  popoverController,
} from "@ionic/vue";
import { defineComponent } from "vue";

export default defineComponent({
  name: "ShipmentBoxTypePopover",
  components: { 
    IonContent,
    IonItem,
    IonList
  },
  props: ["shipmentPackages"],
  methods: {
    closePopover() {
      popoverController.dismiss();
    },
    updateBox(packageName: string) {
      popoverController.dismiss(packageName);
    },
  }
});
</script>