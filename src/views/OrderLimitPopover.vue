<template>
  <ion-content>
    <ion-list>
      <ion-item lines="none">
        <ion-card-subtitle>{{ $t("Fulfillment Capacity") }}</ion-card-subtitle>
      </ion-item>
      <ion-item button @click="updateOrderLimit('unlimited')">
        <ion-icon slot="end" :icon="lockOpenOutline" />
        {{ $t("Unlimited Capacity") }}
      </ion-item>
      <ion-item button @click="updateOrderLimit('no-capacity')">
        {{ $t("No Capacity") }}
        <ion-icon slot="end" :icon="lockClosedOutline" />
      </ion-item>
      <ion-item button lines="none" @click="updateOrderLimit('custom')">
        {{ $t("Custom") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>
  
<script lang="ts">
import {
  IonCardSubtitle,
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  alertController,
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { lockClosedOutline, lockOpenOutline } from 'ionicons/icons'
import { translate } from '@/i18n';
import { showToast } from '@/utils';
export default defineComponent({
  name: "orderLimitPopver",
  components: {
    IonContent,
    IonIcon,
    IonItem,
    IonList,
    IonCardSubtitle
  },
  setup() {
    return {
      lockClosedOutline,
      lockOpenOutline
    }
  },
  props: ['fulfillmentOrderLimit'],
  data() {
    return {
      setLimit: this.fulfillmentOrderLimit as any
    }
  },
  methods: {
    async updateOrderLimit(limit: any) {
      if (limit === 'custom') {
        this.showOrderLimitAlert("Custom fulfillment capacity", "", true)
      } else if (limit === 'no-capacity') {
        this.setLimit = 0
        this.showOrderLimitAlert("No fulfillment capacity", "No capacity removes sets the fulfillment capacity to 0, preventing any new orders from being allocated to this facility. Use the \"Reject all orders\" option in the fulfillment pages to clear your facilities fulfillment queue. To add a fulfillment capacity to this facility, use the custom option.", false)
      } else if (limit === 'unlimited') {
        this.setLimit = ""
        this.showOrderLimitAlert("Unlimited fulfillment capacity", "Unlimited capacity removes the fulfillment capacity limit entirely. To add a fulfillment capacity to this facility, use the custom option.", false)
      }
    },
    async showOrderLimitAlert(header: any, message: any, showInput = false) {
      const alert = await alertController.create({
        header: translate(header),
        message: translate(message, {space: '</br></br>'}),
        inputs: showInput ? [{
          name: "setLimit",
          placeholder: "Order fulfillment capacity",
          type: "number",
          min: 0
        }] : [],
        buttons: showInput ? [{
          text: translate('Cancel'),
          role: "cancel"
        },
        {
          text: translate('Apply'),
          handler: (data) => {
            if (data.setLimit <= 0) {
              showToast(translate('Provide a value greater than 0'))
              return;
            }
            this.onDismiss(data.setLimit)
          }
        }] : [{
          text: translate('Cancel'),
          role: 'cancel'
        }, {
          text: translate('Apply'),
          handler: () => {
            this.onDismiss(this.setLimit)
          }
        }]
      })
      await alert.present()
    },
    onDismiss(setLimit: any) {
      popoverController.dismiss(setLimit);
    }
  }
});
</script> 