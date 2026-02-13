<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        {{ translate("Fulfillment capacity") }}
      </ion-list-header>
      <ion-item button @click="updateOrderLimitType('unlimited')">
        <ion-icon slot="end" :icon="lockOpenOutline" />
        {{ translate("Unlimited Capacity") }}
      </ion-item>
      <ion-item button @click="updateOrderLimitType('no-capacity')">
        {{ translate("No Capacity") }}
        <ion-icon slot="end" :icon="lockClosedOutline" />
      </ion-item>
      <ion-item button lines="none" @click="updateOrderLimitType('custom')">
        {{ translate("Custom") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>
  
<script setup lang="ts">
import { IonContent, IonIcon, IonItem, IonList, IonListHeader, alertController, popoverController } from "@ionic/vue";
import { defineProps, ref } from "vue";
import { lockClosedOutline, lockOpenOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { showToast } from "@/utils";

const props = defineProps(["fulfillmentOrderLimit"]);

const setLimit = ref(props.fulfillmentOrderLimit as any);

const showOrderLimitAlert = async (header: string, message: string, showInput: boolean) => {
  const alert = await alertController.create({
    header: translate(header),
    message: translate(message, { space: "</br></br>" }),
    inputs: showInput ? [{
      name: "setLimit",
      placeholder: translate("Order fulfillment capacity"),
      type: "number",
      value: props.fulfillmentOrderLimit?.toString(),
      min: 0
    }] : [],
    buttons: [
      { text: translate("Cancel"), role: "cancel" },
      {
        text: translate("Apply"),
        handler: (data) => {
          let updatedLimit = setLimit.value as any;

          if (data) {
            if (data.setLimit === "") {
              showToast(translate("Please provide a value"));
              return false;
            } else if (data.setLimit <= 0) {
              showToast(translate("Provide a value greater than 0"));
              return false;
            } else {
              updatedLimit = data.setLimit;
            }
          }

          popoverController.dismiss(updatedLimit);
        }
      }
    ]
  });
  await alert.present();
};

const updateOrderLimitType = async (orderLimitType: string) => {
  let header = "Unlimited fulfillment capacity";
  let message = "Unlimited capacity removes the fulfillment capacity limit entirely. To add a fulfillment capacity to this facility, use the custom option.";
  let showInput = false;

  if (orderLimitType === "custom") {
    header = "Custom fulfillment capacity";
    message = "";
    showInput = true;
  } else if (orderLimitType === "no-capacity") {
    setLimit.value = 0;
    header = "No fulfillment capacity";
    message = "No capacity sets the fulfillment capacity to 0, preventing any new orders from being allocated to this facility. Use the \"Reject all orders\" option in the fulfillment pages to clear your facilities fulfillment queue. To add a fulfillment capacity to this facility, use the custom option.";
  } else if (orderLimitType === "unlimited") {
    setLimit.value = "";
  }

  showOrderLimitAlert(header, message, showInput);
};
</script> 
