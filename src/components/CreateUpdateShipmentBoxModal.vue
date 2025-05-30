<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate(isBoxUpdating ? "Edit dimensions" : "Create a box") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  
  <ion-content>
    <ion-item lines="full" v-if="!isBoxUpdating" class="ion-margin-top">
      <ion-input label-placement="floating" v-model="formData.description" @ionBlur="setShipmentBoxTypeId($event.target.value)">
        <div slot="label">{{ translate("Name") }} <ion-text color="danger">*</ion-text></div>
      </ion-input>
    </ion-item>
    <ion-item lines="none" v-if="!isBoxUpdating">
      <ion-input label-placement="floating" v-model="formData.shipmentBoxTypeId" ref="shipmentBoxTypeId" @ionChange="validateShipmentBoxTypeId" @ionBlur="markshipmentBoxTypeIdTouched" :error-text="translate('Shipment box ID cannot be more than 20 characters.')">
        <div slot="label">{{ translate("ID") }} <ion-text color="danger">*</ion-text></div>
      </ion-input>
    </ion-item>

    <ion-list>
      <ion-list-header color="light">
        {{ translate("Dimensions") }}
      </ion-list-header>
      <ion-item>
        <ion-select interface="popover" :label="translate('Unit of measurement')" :placeholder="translate('Select')" :interfaceOptions="{ header: translate('Unit of measurement') }" v-model="formData.dimensionUomId">
          <ion-select-option value="LEN_cm">{{ translate(uomById["LEN_cm"].description) }}</ion-select-option>
          <ion-select-option value="LEN_in">{{ translate(uomById["LEN_in"].description) }} {{ boxUomConversions["inToCm"] ? `(${boxUomConversions["inToCm"]} cm)` : "" }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="full">
        <ion-input :label="translate('Length')" placeholder="0.00" v-model="formData.boxLength" :class="getErrorClass('boxLength')" :error-text="getFieldError('boxLength')" />
      </ion-item>
      <ion-item lines="full">
        <ion-input :label="translate('Width')" placeholder="0.00" v-model="formData.boxWidth" :class="getErrorClass('boxWidth')" :error-text="getFieldError('boxWidth')" />
      </ion-item>
      <ion-item lines="full">
        <ion-input :label="translate('Height')" placeholder="0.00" v-model="formData.boxHeight" :class="getErrorClass('boxHeight')" :error-text="getFieldError('boxHeight')" />
      </ion-item>
    </ion-list>

    <ion-list>
      <ion-list-header color="light">
        {{ translate("Weight") }}
      </ion-list-header>
      <ion-item>
        <ion-select interface="popover" :label="translate('Unit of measurement')" :placeholder="translate('Select')" :interfaceOptions="{ header: translate('Unit of measurement') }" v-model="formData.weigthUomId">
          <ion-select-option value="WT_lb">{{ translate(uomById["WT_lb"].description) }}</ion-select-option>
          <ion-select-option value="WT_kg">{{ translate(uomById["WT_kg"].description) }} {{ boxUomConversions["kgToLb"] ? `(${boxUomConversions["kgToLb"]} lb)` : "" }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="full">
        <ion-input :label="translate('Weight')" placeholder="0.00" v-model="formData.boxWeight" :class="getErrorClass('boxWeight')" :error-text="getFieldError('boxWeight')" />
      </ion-item>
    </ion-list>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="isBoxUpdating ? !isBoxUpdated() : false" @click="isBoxUpdating ? updateShipmentBoxDimensions() : createShipmentBox()">
        <ion-icon :icon="checkmarkDoneOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonList, IonListHeader, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { checkmarkDoneOutline, closeOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex';
import { translate } from '@hotwax/dxp-components';
import { generateInternalId, showToast } from "@/utils";
import logger from "@/logger";
import { CarrierService } from "@/services/CarrierService";
import { hasError } from "@/adapter";
import { useFormValidator } from "@hotwax/dxp-components";

export default defineComponent({
  name: "CreateUpdateShipmentBoxModal",
  components: { 
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonListHeader,
    IonSelect,
    IonSelectOption,
    IonText,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      formData: {
        description: "",
        shipmentBoxTypeId: "",
        dimensionUomId: "",
        boxLength: "",
        boxWidth: "",
        boxHeight: "",
        weigthUomId: "",
        boxWeight: ""
      },
      uomById: process.env.VUE_APP_UOM_MEASURES ? JSON.parse(process.env.VUE_APP_UOM_MEASURES) : {},
      isBoxUpdating: false,
      validator: {} as any
    }
  },
  props: ["currentBox"],
  computed: {
    ...mapGetters({
      boxUomConversions: "util/getShipmentBoxUomConversions",
      shipmentBoxes: "carrier/getShipmentBoxes"
    }),
  },
  async mounted() {
    await this.store.dispatch("util/fetchShipmentBoxUomConversions");
    if(this.currentBox?.shipmentBoxTypeId) {
      this.isBoxUpdating = true;
      this.formData = JSON.parse(JSON.stringify(this.currentBox))
    }

    const validator = await useFormValidator({
      boxLength: ["number"],
      boxHeight: ["number"],
      boxWidth: ["number"],
      boxWeight: ["number"]
    }, this.formData)
    this.formData = validator.values
    this.validator = validator
  },
  methods: {
    getFieldError(field: string) {
      return this.validator?.errors ? this.validator.errors[field] : ""
    },
    getErrorClass(field: string) {
      return this.getFieldError(field) ? "ion-touched ion-invalid" : ""
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async createShipmentBox() {
      const isFormValid = await this.validator?.isFormValid()
      if(!isFormValid) {
        console.log(this.validator)
        showToast(translate("Some of the form fields are invalid"))
        return;
      }

      if(!this.formData.description.trim()) {
        showToast(translate("Please fill all the required fields."))
        return;
      }

      this.setShipmentBoxTypeId(this.formData.description)

      if (this.formData.shipmentBoxTypeId.length > 20) {
        showToast(translate("Shipment box ID cannot be more than 20 characters."))
        return
      }

      try {
        const resp = await CarrierService.createShipmentBox(this.formData)

        if(!hasError(resp)) {
          const boxes = JSON.parse(JSON.stringify(this.shipmentBoxes))
          boxes.push({ ...this.formData, isChecked: false })
          await this.store.dispatch("carrier/updateShipmentBoxTypes", boxes);
          showToast(translate("Shipment box created successfully."))
          this.closeModal()
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
        showToast(translate("Failed to create shipment box."))
      }
    },
    async updateShipmentBoxDimensions() {
      const isFormValid = await this.validator?.isFormValid()
      if(!isFormValid) {
        console.log(this.validator)
        showToast(translate("Some of the form fields are invalid"))
        return;
      }

      try {
        const resp = await CarrierService.updateShipmentBox(this.formData)

        if(!hasError(resp)) {
          let boxes = JSON.parse(JSON.stringify(this.shipmentBoxes))
          boxes = boxes.map((box: any) => box.shipmentBoxTypeId === this.formData.shipmentBoxTypeId ? this.formData : box);
          await this.store.dispatch("carrier/updateShipmentBoxTypes", boxes);
          showToast(translate("Shipment box dimensions updated successfully."))
          this.closeModal()
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error)
        showToast(translate("Failed to update shipment box dimensions."))
      }
      
    },
    isBoxUpdated() {
      return JSON.stringify(this.currentBox) !== JSON.stringify(this.formData)
    },
    setShipmentBoxTypeId(value: any) {
      if(!this.formData.shipmentBoxTypeId) {
        this.formData.shipmentBoxTypeId = generateInternalId(value)
      }
    },
    validateShipmentBoxTypeId(event: any) {
      const value = event.target.value;
      (this as any).$refs.shipmentBoxTypeId.$el.classList.remove('ion-valid');
      (this as any).$refs.shipmentBoxTypeId.$el.classList.remove('ion-invalid');

      if (value === '') return;

      this.formData.shipmentBoxTypeId.length <= 20
        ? (this as any).$refs.shipmentBoxTypeId.$el.classList.add('ion-valid')
        : (this as any).$refs.shipmentBoxTypeId.$el.classList.add('ion-invalid');
    },
    markshipmentBoxTypeIdTouched() {
      (this as any).$refs.shipmentBoxTypeId.$el.classList.add('ion-touched');
    },
  },
  setup() {
    const store = useStore();

    return {
      checkmarkDoneOutline,
      closeOutline,
      store,
      translate
    };
  }
});
</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}
</style>