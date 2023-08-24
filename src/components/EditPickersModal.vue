<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Edit pickers") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  
  <ion-content class="ion-padding">
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; findPickers()" />
    <ion-row>
      <ion-chip v-for="picker in selectedPickers" :key="picker.id">
        <ion-label>{{ picker.name }}</ion-label>
        <ion-icon :icon="closeCircle" @click="removePicker(picker.id)" />
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <div class="ion-padding" v-if="!pickers.length">
        {{ 'No picker found' }}
      </div>
      <div v-else>
        <ion-item v-for="(picker, index) in pickers" :key="index" @click="selectPicker(picker.id)">
          <ion-label>
            {{ picker.name }}
            <p>{{ picker.externalId ? picker.externalId : picker.id }}</p>
          </ion-label>
          <ion-checkbox :checked="isPickerSelected(picker.id)"/>
        </ion-item>
      </div>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="evaluateSelectedPickers()" @click="confirmSave()">
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonFab,
  IonFabButton,
  IonTitle,
  IonToolbar,
  IonLabel,
  IonItem,
  IonList,
  IonListHeader,
  IonRow,
  IonSearchbar,
  modalController,
alertController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close, closeCircle, saveOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { hasError, showToast } from '@/utils';
import logger from "@/logger"
import { UtilService } from "@/services/UtilService";
import { translate } from "@/i18n";

export default defineComponent({
  name: "EditPickersModal",
  components: { 
    IonButtons,
    IonButton,
    IonCheckbox,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonFab,
    IonFabButton,
    IonTitle,
    IonToolbar,
    IonLabel,
    IonItem,
    IonList,
    IonListHeader,
    IonRow,
    IonSearchbar,
  },
  data () {
    return {
      selectedPickers: [] as any,
      queryString: '',
      pickers: [] as any,
      editedPicklist: {} as any
    }
  },
  mounted() {
    this.findPickers()
  },
  props: ['selectedPicklist'],
  methods: {
    isPickerSelected(id: string) {
      return this.selectedPickers.some((picker: any) => picker.id == id)
    },
    selectPicker(id: string) {
      const picker = this.selectedPickers.some((picker: any) => picker.id == id)
      if (picker) {
        // if picker is already selected then removing that picker from the list on click
        this.selectedPickers = this.selectedPickers.filter((picker: any) => picker.id != id)
      } else {
        this.selectedPickers.push(this.pickers.find((picker: any) => picker.id == id))
      }
    },
    removePicker(id: string) {
      this.selectedPickers = this.selectedPickers.filter((picker: any) => picker.id != id)
    },
    async findPickers() {
      let inputFields = {}
      this.pickers = []

      if (this.queryString.length > 0) {
        inputFields = {
          firstName_value: this.queryString,
          firstName_op: 'contains',
          firstName_ic: 'Y',
          firstName_grp: '1',
          externalId_value: this.queryString,
          externalId_op: 'contains',
          externalId_ic: 'Y',
          externalId_grp: '2',
          lastName_value: this.queryString,
          lastName_op: 'contains',
          lastName_ic: 'Y',
          lastName_grp: '3',
          partyId_value: this.queryString,
          partyId_op: 'contains',
          partyId_ic: 'Y',
          partyId_grp: '4',
        }
      }

      const payload = {
        inputFields: {
          ...inputFields,
          roleTypeIdTo: 'WAREHOUSE_PICKER'
        },
        viewSize: 50,
        entityName: 'PartyRelationshipAndDetail',
        noConditionFind: 'Y',
        orderBy: "firstName ASC",
        filterByDate: "Y",
        distinct: "Y",
        fieldList: ["firstName", "lastName", "partyId", "externalId"]
      }

      try {
        const resp = await UtilService.getAvailablePickers(payload);
        if (resp.status === 200 && !hasError(resp)) {
          this.pickers = resp.data.docs.map((picker: any) => ({
            name: picker.firstName + ' ' + picker.lastName,
            id: picker.partyId,
            externalId: picker.externalId
          }))
          // for default selection of pickers already associated with the picklist
          this.selectedPickers = this.pickers.filter((picker: any) => this.selectedPicklist.pickerIds.includes(picker.id))

          // case for 'System Generated' picker
          if (!this.selectedPickers.length) {
            // as selectedPickers will be empty, we manually add the entry
            this.selectedPickers = [{
              name: this.selectedPicklist.pickersName,
              id: null
            }]
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch the pickers information or there are no pickers available', err)
      }
    },
    async confirmSave() {
      const message = this.$t("Are you sure you want to remove the current pickers from the picklist and replace them with new pickers?");
      const alert = await alertController.create({
        header: this.$t("Edit pickers"),
        message,
        buttons: [
          {
            text: this.$t("Cancel"),
          },
          {
            text: this.$t("Replace"),
            handler: () => {
              this.save();
            }
          }
        ],
      });
      return alert.present();
    },
    save() {
      this.resetPicker().then(() => {
        this.closeModal()
      })
    },
    async resetPicker() {
      // remove the 'System Generated' entry through filtering based on ID
      const pickerIds = this.selectedPickers.map((picker: any) => picker.id).filter((id: any) => id !== null)
      const pickersNameArray = this.selectedPickers.filter((picker: any) => pickerIds.includes(picker.id)).map((picker: any) => picker.name.split(' ')[0])

      try {
        const resp = await UtilService.resetPicker({
          pickerIds,
          picklistId: this.selectedPicklist.id
        });
        if (resp.status === 200 && !hasError(resp)) {
          showToast(translate("Pickers successfully replaced in the picklist with the new selections."))
          // editedPicklist will be passed through modal to in-progress page for manually
          // upading the UI due to solr issue
          this.editedPicklist = {
            ...this.selectedPicklist,
            pickerIds,
            pickersName: pickersNameArray.join(', ')
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Something went wrong, could not edit picker(s)'))
        logger.error('Something went wrong, could not edit picker(s)')
      }
    },
    evaluateSelectedPickers() {
      // disable the save button if only 'System Generate' entry is there
      // or if no pickers are selected
      return (this.selectedPickers.length === 1
        && this.selectedPickers[0].name === 'System Generated')
        || (!this.selectedPickers.length)
    },
    closeModal() {
      modalController.dismiss({
        dismissed: true,
        editedPicklist: this.editedPicklist
      });
    },
  },
  setup() {
    const store = useStore();
    return {
      close,
      saveOutline,
      closeCircle,
      store
    };
  }
});
</script>