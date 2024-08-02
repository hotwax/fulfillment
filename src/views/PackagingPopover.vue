<template>
  <ion-content>
    <ion-list>
      <ion-item button @click="closePopover('editPackaging')">
        <ion-icon slot="start" :icon="pencil" />
        {{ translate("Edit packaging") }}
      </ion-item>
      <ion-item button @click="closePopover('reportIssue')" lines="none">
        <ion-icon slot="start" :icon="warning" />
        {{ translate("Report an issue") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { pencil, warning, refresh } from 'ionicons/icons'
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "PackagingPopover",
  components: { 
    IonContent,
    IonIcon,
    IonItem,
    IonList,
  },
  methods: {
    closePopover(selectedAction: string) {
      popoverController.dismiss({ dismissed: true, selectedAction })
    }
  },
  setup() {
    return {
      pencil,
      warning,
      refresh,
      translate
    }
  }
});
</script>