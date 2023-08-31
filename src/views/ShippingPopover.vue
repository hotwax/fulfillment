<template>
  <ion-content>
    <ion-list>
      <ion-item button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" @click="regenerateShippingLabel(order)">
        {{ $t("Regenerate Shipping Label") }}
      </ion-item>
      <ion-item button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" @click="printPackingSlip(order)">
        {{ $t("Print Customer Letter") }}
      </ion-item>
      <ion-item button :disabled="!hasPermission(Actions.APP_UNPACK_ORDER) || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" @click="unpackOrder(order)">
        {{ $t("Unpack") }}
      </ion-item>
      <ion-item button v-if="order.missingLabelImage" lines="none" @click="showShippingLabelErrorModal(order)">
        {{ $t("Shipping label error") }}
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
import { printOutline, lockOpenOutline, receiptOutline, warningOutline } from 'ionicons/icons'
import { Actions, hasPermission } from '@/authorization'
export default defineComponent({
  name: "ShippingPopover",
  components: { 
    IonContent,
    IonItem,
    IonList,
  },
  setup() {
    return {
      printOutline,
      lockOpenOutline,
      receiptOutline,
      warningOutline,
      hasPermission,
      Actions
    }
  },
  props: [
    'order',
    'printPackingSlip',
    'regenerateShippingLabel',
    'unpackOrder',
    'showShippingLabelErrorModal',
    'hasPackedShipments'
  ]
});
</script> 