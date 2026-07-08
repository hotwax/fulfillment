<template>
  <ion-content>
    <ion-list>
      <ion-item v-for="shipmentPackage in shipmentPackages" :key="shipmentPackage" @click="updateBox(shipmentPackage.packageName)" button>
        {{ shipmentPackage.packageName }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import { IonContent, IonItem, IonList, popoverController } from "@ionic/vue";

defineProps(["shipmentPackages"]);

const updateBox = (packageName: string) => {
  popoverController.dismiss(packageName);
};
</script>
