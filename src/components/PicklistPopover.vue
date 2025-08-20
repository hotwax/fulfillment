<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        <ion-label>{{ translate("Picklist") }}</ion-label>
      </ion-list-header>
      <ion-item @click="printPicklist" button>
        <ion-label>{{ translate("View picklist") }}</ion-label>
      </ion-item>
      <ion-item lines="none" @click="openQRCodeModal(picklistId)" button>
        <ion-label>{{ translate("QR Code") }}</ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import { translate, useAuthStore } from '@hotwax/dxp-components';
import { IonContent, IonItem, IonLabel, IonList, IonListHeader, modalController, popoverController } from '@ionic/vue';
import { defineComponent } from 'vue';
import QRCodeModal from './QRCodeModal.vue';

export default defineComponent({
  name: "PicklistPopover",
  components: { 
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonListHeader
  },
  props: {
    onViewPicklist: { type: Function },
    picklistId: { type: String }
  },
  methods:{
    printPicklist() {
      if (this.onViewPicklist) this.onViewPicklist();
      popoverController.dismiss();
    },
    async openQRCodeModal(picklistId: any) {
      const link = `${process.env.VUE_APP_PICKING_LOGIN_URL}?oms=${this.authStore.oms}&token=${this.authStore.token.value}&expirationTime=${this.authStore.token.expiration}&picklistId=${picklistId}`
      const qrCodeModal = await modalController.create({
        component: QRCodeModal,
        componentProps: { picklistId, link }
      });
      popoverController.dismiss()
      return qrCodeModal.present();
    },
  },
  setup() {
    const authStore = useAuthStore()

    return {
      translate,
      authStore,
    }
  }
})  
</script>