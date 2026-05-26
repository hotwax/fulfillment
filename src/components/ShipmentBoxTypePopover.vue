<template>
  <ion-content>
    <ion-list>
      <ion-item v-for="boxType in shipmentBoxTypes" :key="boxType.shipmentBoxTypeId" @click="updateBoxType(boxType.shipmentBoxTypeId)" button>
        {{ boxType.description ? boxType.description : boxType.shipmentBoxTypeId }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import { IonContent, IonItem, IonList, popoverController } from "@ionic/vue";

defineProps(["shipmentBoxTypes"]);

const updateBoxType = (boxType: string) => {
  popoverController.dismiss(boxType);
};
</script>
