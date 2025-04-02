<template>
  <template v-if="shipmentBoxes?.length">
    <div class="list-item ion-padding" v-for="box in shipmentBoxes" :key="box.shipmentBoxTypeId">
      <ion-item lines="none">
        <ion-label>
          {{ box.description }}
          <p>{{ box.shipmentBoxTypeId }}</p>
        </ion-label>
      </ion-item>
      <ion-label>
        {{ box.boxLength || "-" }} {{ box.boxLength ? uomById[box.dimensionUomId]?.code ? translate(uomById[box.dimensionUomId].code) : "" : "" }}
        <p>{{ translate("length") }}</p>
      </ion-label>
      <ion-label>
        {{ box.boxWidth || "-" }} {{ box.boxWidth ? uomById[box.dimensionUomId]?.code ? translate(uomById[box.dimensionUomId].code) : "" : "" }}
        <p>{{ translate("width") }}</p>
      </ion-label>
      <ion-label>
        {{ box.boxHeight || "-" }} {{ box.boxHeight ? uomById[box.dimensionUomId]?.code ? translate(uomById[box.dimensionUomId].code) : "" : "" }}
        <p>{{ translate("height") }}</p>
      </ion-label>
      <ion-label>
        {{ box.boxWeight || "-" }} {{ box.boxWeight ? uomById[box.weigthUomId]?.code ? translate(uomById[box.weigthUomId].code) : "" : "" }}
        <p>{{ translate("weight") }}</p>
      </ion-label>

      <div class="tablet">
        <ion-spinner name="crescent" size="small" v-if="box.isUpdating"></ion-spinner>
        <ion-checkbox v-else :checked="box.isChecked" @click="updateCarrierShipmentBoxesAssociation(box)" />
      </div>

      <ion-button fill="clear" color="medium" @click="openShipmentBoxActionsPopover($event, box)">
        <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
      </ion-button>
    </div>
  </template>
  <div v-else class="empty-state">
    <p>{{ translate('No data found') }}</p>
  </div>

</template>  
<script lang="ts">
import { IonButton, IonCheckbox, IonIcon, IonItem, IonLabel, IonSpinner, popoverController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { add, checkmarkDone, barcodeOutline, pricetagOutline, addCircleOutline, addOutline, ellipsisVerticalOutline, peopleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import { translate } from '@hotwax/dxp-components';
import ShipmentBoxActionsPopover from '@/components/ShipmentBoxActionsPopover.vue'
import logger from '@/logger';
import { CarrierService } from '@/services/CarrierService';
import { hasError } from '@/adapter';
import { showToast } from '@/utils';


export default defineComponent({
  name: "ShipmentMethods",
  components: {
    IonButton,
    IonCheckbox,
    IonIcon,
    IonItem,
    IonLabel,
    IonSpinner
  },
  computed: {
    ...mapGetters({
      currentCarrier: 'carrier/getCurrent',
      shipmentBoxes: "carrier/getShipmentBoxes"
    }),
  },
  data() {
    return {
      uomById: process.env.VUE_APP_UOM_MEASURES ? JSON.parse(process.env.VUE_APP_UOM_MEASURES) : {}
    }
  },
  methods: {
    async openShipmentBoxActionsPopover(event: Event, box: any) {
      const popover = await popoverController.create({
        component: ShipmentBoxActionsPopover,
        showBackdrop: false,
        componentProps: { box },
        event: event
      });

      popover.present();
    },
    async updateCarrierShipmentBoxesAssociation(shipmentBox: any) {
      shipmentBox.isUpdating = true

      const payload = {
        partyId: this.currentCarrier.partyId,
        shipmentBoxTypeId: shipmentBox.shipmentBoxTypeId
      }

      try {
        const resp = shipmentBox.isChecked ? await CarrierService.removeCarrierShipmentBoxType(payload) : await CarrierService.addCarrierShipmentBoxType(payload);

        if(!hasError(resp)) {
          const boxes = JSON.parse(JSON.stringify(this.shipmentBoxes))
          boxes.find((box: any) => {
            if(box.shipmentBoxTypeId === shipmentBox.shipmentBoxTypeId) {
              box.isChecked = !box.isChecked
              box.isUpdating = false
              return true;
            }
            return false;
          })

          showToast(translate("Carrier and shipment box association updated successfully."))
          await this.store.dispatch("carrier/updateShipmentBoxTypes", boxes);
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
        showToast(translate("Failed to updated carrier and shipment box association."))
      }

      shipmentBox.isUpdating = false
    }
  }, 
  setup() {
    const store = useStore(); 

    return {
      add,
      addCircleOutline,
      addOutline,
      barcodeOutline,
      checkmarkDone,
      ellipsisVerticalOutline,
      pricetagOutline,
      peopleOutline,
      shieldCheckmarkOutline,
      store,
      translate
    };
  },
});
</script>

<style scoped>
.list-item {
  --columns-desktop: 7;
  border-bottom: var(--border-medium);
}
.list-item:hover {
  cursor: default;
}
.tablet {
  display: block;
  text-align: center;
}
.list-item > ion-item {
  width: 100%;
}
</style>
  