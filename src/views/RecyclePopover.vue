<template>
  <ion-content>
    <ion-list>
      <ion-item button>{{ $t("Recycle all orders") }}</ion-item>
      <ion-item lines="none" button>{{ $t("Turn off fulfillment") }}</ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonItem,
  IonList
} from "@ionic/vue";
import { defineComponent } from "vue";
export default defineComponent({
  name: "RecyclePopover",
  components: { 
    IonContent,
    IonItem,
    IonList,
  }
});
</script>  