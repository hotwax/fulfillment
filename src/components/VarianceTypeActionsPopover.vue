<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ translate("Variance type") }}
      </ion-list-header>
      <ion-item button>
        {{ translate("No variance") }}
      </ion-item>
      <ion-item button>
        {{ translate("Single variance") }}
      </ion-item>
      <ion-item button lines="none">
        {{ translate("All variance") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>
  
<script lang="ts">
import {
  IonContent,
  IonItem,
  IonList,
  IonListHeader,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { translate } from '@hotwax/dxp-components'
export default defineComponent({
  name: "RejectReasonActionsPopover",
  components: {
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  setup() {
    return {
      translate
    }
  },
});
</script> 