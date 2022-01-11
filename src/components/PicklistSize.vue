<template>
  <ion-menu type="overlay" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("Picklist Size") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-radio-group v-model="size" @ionChange="setPicklistSize()">
          <ion-item v-for="count in preparePicklistSize()" :key="count">
            <ion-radio slot="start" :value="count * 5"/>
            <ion-label>{{ (count * 5) >= openOrders.total ? openOrders.total : count * 5}} orders</ion-label>
            <ion-note slot="end">10 items</ion-note>
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";

export default defineComponent({
  name: "PicklistMenu",
  components: {
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonTitle,
    IonToolbar
  },
});
</script>

<style scoped>
ion-menu::part(backdrop) {
  background-color: transparent;
}
</style>