<template>
  <ion-content>
    <ion-item v-for="reason in rejectReasons" :key="reason.enumId" :value="reason.enumId" lines="none">
      {{ reason.description ? $t(reason.description) : reason.enumId }}  
    </ion-item>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonItem,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { pencil, warning, refresh } from 'ionicons/icons'

export default defineComponent({
  name: "RejectReasonPopover",
  props: ['rejectReasons'],
  components: { 
    IonContent,
    IonItem,
  },
  methods: {
    
  },
  setup() {
    return {
      pencil,
      warning,
      refresh
    }
  }
});
</script>