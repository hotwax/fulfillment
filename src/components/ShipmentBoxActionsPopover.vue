<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ box.description ? box.description : box.shipmentBoxTypeId }}</ion-list-header>
      <ion-item button @click="renameShipmentBox()">
        {{ translate("Edit name") }}
      </ion-item>
      <ion-item lines="none" button @click="openEditBoxDimensionModal()">
        {{ translate("Edit dimensions") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, popoverController, alertController, modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { pencilOutline, calendarClearOutline, codeWorkingOutline, listOutline, unlinkOutline} from 'ionicons/icons'
import { translate } from "@hotwax/dxp-components";
import { mapGetters, useStore } from "vuex";
import logger from "@/logger";
import { showToast } from "@/utils";
import { CarrierService } from "@/services/CarrierService";
import { hasError } from "@/adapter";
import CreateUpdateShipmentBoxModal from "./CreateUpdateShipmentBoxModal.vue";

export default defineComponent({
  name: "ShipmentBoxActionsPopover",
  components: { 
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  computed: {
    ...mapGetters({
      shipmentBoxes: "carrier/getShipmentBoxes"
    })
  },
  props: ["box"],
  methods: {
    closePopover() {
      popoverController.dismiss();
    },
    async renameShipmentBox() {
      const alert = await alertController.create({
        header: translate('Rename shipment box'),
        inputs: [{
          name: "shipmentBoxName",
          value: this.box.description
        }],
        buttons: [{
          text: translate('Cancel'),
          role: "cancel"
        },
        {
          text: translate('Apply'),
          handler: async (data) => {
            const updatedName = data.shipmentBoxName.trim()
            if(!updatedName) {
              showToast(translate("Shipment box name can't be empty."))
              return false;         
            }
            if(updatedName === this.box.description) return true;

            try {
              const resp = await CarrierService.updateShipmentBox({
                shipmentBoxTypeId: this.box.shipmentBoxTypeId,
                description: updatedName
              })

              if(!hasError(resp)) {
                const boxes = JSON.parse(JSON.stringify(this.shipmentBoxes))
                boxes.find((currentBox: any) => {
                  if(currentBox.shipmentBoxTypeId === this.box.shipmentBoxTypeId) {
                    currentBox.description = updatedName
                    return true;
                  }
                })
                await this.store.dispatch("carrier/updateShipmentBoxTypes", boxes);
                showToast(translate("Shipment box renamed succesfully."))
                return true;
              } else {
                throw resp.data;
              }
            } catch(error: any) {
              logger.error(error)
              showToast(translate("Failed to rename shipment box."))
              return false;
            }
          }
        }]
      })

      alert.onDidDismiss().then(() => {
        this.closePopover()
      })

      await alert.present()
    },

    async openEditBoxDimensionModal() {
      const createShipmentBoxModal = await modalController.create({
        component: CreateUpdateShipmentBoxModal,
        componentProps: { currentBox: this.box }
      });

      createShipmentBoxModal.onDidDismiss().then(() => {
        this.closePopover();
      })

      await createShipmentBoxModal.present();
    }
  },
  setup() {
    const store = useStore();

    return {
      calendarClearOutline,
      codeWorkingOutline,
      listOutline,
      pencilOutline,
      unlinkOutline,
      store,
      translate
    }
  }
});
</script>