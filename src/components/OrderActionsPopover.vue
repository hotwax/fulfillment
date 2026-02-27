<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate('Options') }}</ion-list-header>
      <ion-item button @click="copyInfo">
        <ion-icon slot="end" :icon="copyOutline" />
        {{ translate("Copy ID") }}
      </ion-item>
      <ion-item v-if="category === 'open'" button @click="assignPickers">
        <ion-icon slot="end" :icon="bagCheckOutline" />
        {{ translate("Pick order") }}
      </ion-item>
      <ion-item button lines="none" @click="viewOrder()">
        <ion-icon slot="end" :icon="arrowForwardOutline" />
        {{ translate("View details") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import { IonContent, IonIcon, IonItem, IonList, IonListHeader, modalController, popoverController } from "@ionic/vue";
import { arrowForwardOutline, bagCheckOutline, copyOutline } from "ionicons/icons";
import { commonUtil } from "@/utils/commonUtil";
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import { translate } from "@hotwax/dxp-components";
import { useOrderStore } from "@/store/order";
import emitter from "@/event-bus";
import { useRouter } from "vue-router";

const props = defineProps(["order", "category"]);

const router = useRouter();
const closePopover = () => {
  popoverController.dismiss();
};

const copyInfo = () => {
  commonUtil.copyToClipboard(props.order.orderName, "Copied to clipboard");
  closePopover();
};

const assignPickers = async () => {
  const assignPickerModal = await modalController.create({ component: AssignPickerModal, componentProps: { order: props.order } });
  assignPickerModal.onDidDismiss().finally(() => {
    closePopover();
  });
  return assignPickerModal.present();
};

const viewOrder = async () => {
  emitter.emit("presentLoader");
  useOrderStore().updateCurrent(props.order).then(() => {
    closePopover();
    emitter.emit("dismissLoader");
    if (props.order.category === "open") {
      router.push({ path: `${props.category}/order-detail/${props.order.orderId}/${props.order.shipGroupSeqId}` });
    } else {
      router.push({ path: `${props.category}/shipment-detail/${props.order.orderId}/${props.order.shipmentId}` });
    }
  });
};
</script>
