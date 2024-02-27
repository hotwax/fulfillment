<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ translate("Variance type") }}
      </ion-list-header>
      <ion-item lines="none" button v-for="type in rejectReasonEnumTypes" :key="type.enumTypeId">
        {{ type.description }}
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
import { computed, defineComponent } from "vue";
import { translate } from '@hotwax/dxp-components'
import { mapGetters } from "vuex";

export default defineComponent({
  name: "RejectReasonActionsPopover",
  components: {
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  computed: {
    ...mapGetters({
      rejectReasonEnumTypes: 'util/getRejectReasonEnumTypes'
    })
  },
  setup() {
    return {
      translate
    }
  },
});
</script> 