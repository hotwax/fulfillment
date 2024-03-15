<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Create rejection reason") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <form>
      <ion-list>
        <ion-item>
          <ion-label>{{ translate("Name") }}</ion-label>
          <ion-input @ionBlur="setEnumId($event)" v-model="formData.enumName" />
        </ion-item>
        <ion-item ref="enumId">
          <ion-label>{{ translate("ID") }}</ion-label>
          <ion-input v-model="formData.enumId" @ionChange="validateEnumId" @ionBlur="markEnumIdTouched" />
          <ion-note slot="error">
            {{ translate("ID cannot be more than 20 characters.") }}
          </ion-note>
        </ion-item>
        <ion-item>
          <ion-label>{{ translate("Description") }}</ion-label>
          <ion-input v-model="formData.description" />
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-item>
          <ion-label>{{ translate("Variance type") }}</ion-label>
          <ion-select interface="popover" v-model="formData.enumTypeId">
            <ion-select-option v-for="type in rejectReasonEnumTypes" :key="type.enumTypeId" :value="type.enumTypeId">{{ type.enumTypeId }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-label>
            <p>{{ getDescription() }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createReason()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </form>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { checkmarkDoneOutline, closeOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components'
import { generateInternalId, showToast } from "@/utils";
import { mapGetters, useStore } from "vuex";
import { UtilService } from "@/services/UtilService";
import { hasError } from "@/adapter";
import logger from "@/logger";

export default defineComponent({
  name: "CreateRejectionReasonModal",
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
    IonLabel,
    IonList,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      formData: {
        description: "",
        enumId: "",
        enumName: "",
        enumTypeId: ""
      } as any
    }
  },
  computed: {
    ...mapGetters({
      rejectReasons: 'util/getRejectReasons',
      rejectReasonEnumTypes: 'util/getRejectReasonEnumTypes',
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss()
    },
    setEnumId(event: any) {
      this.formData.enumId = generateInternalId(event.target.value)
    },
    async createReason() {
      if(!this.formData.description?.trim()) {
        showToast(translate("Rejection reason description is required."))
        return
      }

      if(this.formData.enumId.length > 20) {
        showToast(translate("ID cannot be more than 20 characters."))
        return
      }

      if(!this.formData.enumTypeId) {
        showToast(translate("Variance type is required."))
        return
      }

      // In case the user does not lose focus from the name input
      // and click on create the button, we need to set the id manually
      if (!this.formData.enumId) {
        this.formData.enumId = generateInternalId(this.formData.enumName)
      }

      const sequenceNum = this.rejectReasons[this.rejectReasons.length - 1].sequenceNum
      this.formData['sequenceNum'] = sequenceNum ? sequenceNum + 5 : 5;

      try {
        const resp = await UtilService.createEnumeration(this.formData)

        if(!hasError(resp)) {
          showToast(translate("Rejection reason created successfully."))
          this.rejectReasons.push(this.formData)
          await this.store.dispatch('util/updateRejectReasons', this.rejectReasons)
          modalController.dismiss({ isUpdated: true })
        } else {
          throw resp.data
        }
      } catch(err) {
        showToast(translate("Failed to create rejection reason."))
        logger.error(err)
      }
    },
    validateEnumId(event: any) {
      const value = event.target.value;
      (this as any).$refs.enumId.$el.classList.remove('ion-valid');
      (this as any).$refs.enumId.$el.classList.remove('ion-invalid');

      if (value === '') return;

      this.formData.enumId.length <= 20
        ? (this as any).$refs.enumId.$el.classList.add('ion-valid')
        : (this as any).$refs.enumId.$el.classList.add('ion-invalid');
    },
    markEnumIdTouched() {
      (this as any).$refs.enumId.$el.classList.add('ion-touched');
    },
    getDescription() {
      return this.rejectReasonEnumTypes.find((type: any) => type.enumTypeId === this.formData.enumTypeId)?.description
    }
  },
  setup() {
    const store = useStore();

    return {
      checkmarkDoneOutline,
      closeOutline,
      store,
      translate
    };
  },
});
</script>