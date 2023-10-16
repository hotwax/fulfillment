<template>
  <ion-content>
    <ion-list>
      <ion-item button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" @click="closeModal('regenerateShippingLabel')">
        {{ translate("Regenerate shipping label") }}
      </ion-item>
      <ion-item button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" @click="closeModal('printPackingSlip')">
        {{ translate("Print customer letter") }}
      </ion-item>
      <ion-item button :disabled="!hasPermission(Actions.APP_UNPACK_ORDER) || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments" @click="closeModal('unpackOrder')">
        {{ translate("Unpack") }}
      </ion-item>
      <ion-item button :disabled="!order.missingLabelImage" lines="none" @click="closeModal('showShippingLabelErrorModal')">
        {{ translate("Shipping label error") }}
      </ion-item>
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
import { lockOpenOutline, printOutline, receiptOutline, warningOutline } from 'ionicons/icons'
import { Actions, hasPermission } from '@/authorization'
import { popoverController } from "@ionic/core";
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "ShippingPopover",
  components: { 
    IonContent,
    IonItem,
    IonList,
  },
  props: ['hasPackedShipments', 'order'],
  methods: {
    closeModal(selectedMethod: string) {
      // Sending function name to be called after popover dismiss.
      popoverController.dismiss({selectedMethod})
    }
  },
  setup() {
    return {
      Actions,
      hasPermission,
      lockOpenOutline,
      printOutline,
      receiptOutline,
      warningOutline,
      translate 
    }
  }
});
</script> 