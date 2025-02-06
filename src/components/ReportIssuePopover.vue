<template>
  <ion-content>
    <ion-list>
      <!-- If getting reject reasons in props, then use the same otherwise get the reasons from the util state -->
      <ion-item v-for="reason in (rejectReasons?.length ? rejectReasons : rejectReasonOptions)" :key="reason.enumId" @click="updateIssue(reason.enumId)" button>
        {{ reason.description ? translate(reason.description) : reason.enumDescription ? translate(reason.enumDescription) : reason.enumId  }}
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
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "ReportIssuePopover",
  components: { 
    IonContent,
    IonItem,
    IonList
  },
  computed: {
    ...mapGetters({
      rejectReasonOptions: 'util/getRejectReasonOptions'
    })
  },
  props: ["rejectReasons"],
  methods: {
    closePopover() {
      popoverController.dismiss();
    },
    updateIssue(enumId: string) {
      popoverController.dismiss(enumId);
    },
  },
  setup() {
    return {
      translate
    }
  }
});
</script>