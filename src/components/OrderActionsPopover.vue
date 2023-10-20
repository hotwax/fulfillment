<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate('Options') }}</ion-list-header>
      <ion-item button @click="copyInfo">
        <ion-icon slot="end" :icon="copyOutline" />
        {{ translate("Copy ID") }}
      </ion-item>
      <ion-item v-if="category === 'open'" button lines="none" @click="assignPickers">
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

<script lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  IonListHeader,
  modalController,
  popoverController,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { arrowForwardOutline, bagCheckOutline, copyOutline } from 'ionicons/icons'
import { copyToClipboard } from "@/utils";
import AssignPickerModal from '@/views/AssignPickerModal.vue';
import { translate } from "@hotwax/dxp-components";
import { useStore } from 'vuex';

export default defineComponent({
  name: "OrderActionsPopover",
  components: { 
    IonContent,
    IonIcon,
    IonItem,
    IonList,
    IonListHeader
  },
  props: ["order", "category"],
  methods: {
    closePopover() {
      popoverController.dismiss();
    },
    copyInfo() {
      this.copyToClipboard(this.order.orderName, 'Copied to clipboard')
      // closing the popover after copy action
      this.closePopover();
    },
    async assignPickers() {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order: this.order }
      });

      // dismissing the popover once the picker modal is closed
      assignPickerModal.onDidDismiss().finally(() => {
        this.closePopover();
      });

      return assignPickerModal.present();
    },
    async viewOrder() {
      this.store.dispatch('order/updateCurrent', this.order).then(() => {
        this.closePopover();
        this.$router.push({ path: `/order-detail/${this.order.orderId}` })
      })
    },
  },
  setup() {
    const store = useStore();

    return {
      arrowForwardOutline,
      bagCheckOutline,
      copyOutline,
      copyToClipboard,
      store,
      translate
    }
  }
});
</script>