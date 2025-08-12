<template>
  <ion-content>
    <ion-list>
      <ion-list-header>
        <ion-label>{{ translate("Picklist") }}</ion-label>
      </ion-list-header>
      <ion-item @click="closePopover" button>
        <ion-label>{{ translate("View Pick List") }}</ion-label>
      </ion-item>
      <ion-item lines="none" button>
        <ion-label>{{ translate("QR Code") }}</ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import { translate } from '@hotwax/dxp-components';
import { IonContent, IonItem, IonLabel, IonListHeader, popoverController } from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: "PicklistPopover",
  components: { 
    IonContent,
    IonItem,
    IonLabel,
    IonListHeader
  },
  props: {
    onViewPicklist: { type: Function }
  },
  methods:{
    closePopover() {
      if (this.onViewPicklist) this.onViewPicklist();
      popoverController.dismiss();
    }
  },
  setup() {
    return {
      translate
    }
  }
})  
</script>