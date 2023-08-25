<template>
  <ion-content>
    <ion-list>
      <ion-item button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" @click="regenerateShippingLabel(order)">
        <ion-icon slot="start" :icon="printOutline" />
        {{ $t("Shipping label") }}
      </ion-item>
      <ion-item button :disabled="order.hasMissingShipmentInfo || order.hasMissingPackageInfo" @click="printPackingSlip(order)">
        <ion-icon slot="start" :icon="receiptOutline" />
        {{ $t("Customer letter") }}
      </ion-item>
      <ion-item button :disabled="!hasPermission(Actions.APP_UNPACK_ORDER) || order.hasMissingShipmentInfo || order.hasMissingPackageInfo || !hasPackedShipments(order)" lines="none" @click="unpackOrder(order)">
        <ion-icon slot="start" :icon="lockOpenOutline" />
        {{ $t("Unpack") }}
      </ion-item>
      <ion-item button v-if="order.missingLabelImage"  @click="showShippingLabelErrorModal(order)">
        <ion-icon slot="start" :icon="warningOutline" />
        {{ $t("Shipping label error") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonIcon,
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
    IonIcon,
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