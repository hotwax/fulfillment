<template>
  <ion-menu type="overlay" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("Picklist Size") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-radio-group value="a">
          <ion-item>
            <ion-radio value="a" slot="start" />  
            <ion-label>10 {{ $t("orders") }}</ion-label>
            <ion-note slot="end">10 {{ $t("items") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-radio value="b" slot="start" />  
            <ion-label>15 {{ $t("orders") }}</ion-label>
            <ion-note slot="end">17 {{ $t("items") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-radio value="c" slot="start" />  
            <ion-label>20 {{ $t("orders") }}</ion-label>
            <ion-note slot="end">22 {{ $t("items") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-radio value="d" slot="start" />  
            <ion-label>25 {{ $t("orders") }}</ion-label>
            <ion-note slot="end">28 {{ $t("items") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-radio value="e" slot="start" />  
            <ion-label>30 {{ $t("orders") }}</ion-label>
            <ion-note slot="end">38 {{ $t("items") }}</ion-note>
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