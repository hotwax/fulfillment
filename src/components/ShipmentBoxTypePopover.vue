<template>
  <ion-content>
    <ion-list>
      <ion-item v-for="boxType in shipmentBoxTypes" :key="boxTypeDesc(boxType)" @click="updateBoxType(boxType)" button>
        {{ boxTypeDesc(boxType) }}
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
import { mapGetters } from 'vuex';

export default defineComponent({
  name: "ShipmentBoxTypePopover",
  components: { 
    IonContent,
    IonItem,
    IonList
  },
  computed: {
    ...mapGetters({
      boxTypeDesc: 'util/getShipmentBoxDesc',
    })
  },
  props: ["shipmentBoxTypes"],
  methods: {
    closePopover() {
      popoverController.dismiss();
    },
    updateBoxType(boxType: string) {
      popoverController.dismiss(boxType);
    },
  }
});
</script>