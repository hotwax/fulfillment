<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ translate("Variance type") }}
      </ion-list-header>
      <ion-item lines="none" button @click="updateVarianceType(type)" v-for="type in rejectReasonEnumTypes" :key="type.enumTypeId">
        {{ type.enumTypeId }}
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
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { translate } from '@hotwax/dxp-components'
import { mapGetters, useStore } from "vuex";
import { UtilService } from "@/services/UtilService";
import logger from "@/logger";
import { hasError } from "@/adapter";
import { showToast } from "@/utils";

export default defineComponent({
  name: "VarianceTypeActionsPopover",
  components: {
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  computed: {
    ...mapGetters({
      rejectReasons: 'util/getRejectReasons',
      rejectReasonEnumTypes: 'util/getRejectReasonEnumTypes'
    })
  },
  props: ["reason"],
  methods: {
    async updateVarianceType(selectedType: any) {
      try {
        const resp = await UtilService.updateEnumeration({
          description: this.reason.description,
          enumId: this.reason.enumId,
          enumTypeId: selectedType.enumTypeId
        })

        if(!hasError(resp)) {
          showToast(translate("Variance type updated successfully."))
          this.rejectReasons.map((reason: any) => {
            if(reason.enumId === this.reason.enumId) {
              reason.enumTypeId = selectedType.enumTypeId
            }
          })
          await this.store.dispatch('util/updateRejectReasons', this.rejectReasons)
        } else {
          throw resp.data;
        }
      } catch(err) {
        showToast(translate("Failed to update variance type."))
        logger.error(err)
      }
      popoverController.dismiss()
    } 
  },
  setup() {
    const store = useStore()

    return {
      store,
      translate
    }
  },
});
</script> 