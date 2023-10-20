<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate('Options') }}</ion-list-header>
      <ion-item button @click="copyInfo">
        <ion-icon slot="end" :icon="copyOutline" />
        {{ translate("Copy ID") }}
      </ion-item>
      <ion-item button lines="none" @click="assignPickers">
        <ion-icon slot="end" :icon="bagCheckOutline" />
        {{ translate("Pick order") }}
      </ion-item>
      <ion-item button lines="none" @click="viewOrder">
        <ion-icon slot="end" :icon="arrowForwardOutline" />
        {{ translate("Order details") }}
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
import { useRouter } from 'vue-router'
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
  props: ["order"],
  methods: {
    closePopover() {
      popoverController.dismiss();
    },
    copyInfo() {
      this.copyToClipboard(this.order.doclist.docs[0].orderName, 'Copied to clipboard')
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
      await this.store.dispatch('order/setCurrentOrder', { order: this.order }).then(() => {
        if (this.order) {
          this.closePopover();
          this.router.push({ path: `/orders/${this.order.orderId}` });
        }
      });
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    
    return {
      arrowForwardOutline,
      bagCheckOutline,
      copyOutline,
      copyToClipboard,
      translate,
      router,
      store
    }
  }
});
</script>