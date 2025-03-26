<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Edit pickers") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  
  <ion-content class="ion-padding">
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; findPickers()" />
    <ion-row>
      <ion-chip v-for="picker in selectedPickers" :key="picker.id">
        <ion-label>{{ picker.name }}</ion-label>
        <ion-icon :icon="closeCircle" @click="updateSelectedPickers(picker.id)" />
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>{{ translate("Staff") }}</ion-list-header>

      <div v-if="isLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Fetching pickers") }}</ion-label>
      </div>
      <div class="empty-state" v-else-if="!pickers.length">
        {{ 'No picker found' }}
      </div>
      <div v-else>
        <ion-item v-for="(picker, index) in pickers" :key="index" @click="updateSelectedPickers(picker.id)">
          <ion-checkbox :checked="isPickerSelected(picker.id)">
            <ion-label>
              {{ picker.name }}
              <p>{{ picker.externalId ? picker.externalId : picker.id }}</p>
            </ion-label>
          </ion-checkbox>
        </ion-item>
      </div>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="arePickersNotSelected()" @click="confirmSave()">
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
  IonSpinner,
  modalController,
  alertController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close, closeCircle, saveOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { hasError, showToast } from '@/utils';
import logger from "@/logger"
import { UtilService } from "@/services/UtilService";
import { translate } from '@hotwax/dxp-components'

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
    IonSpinner
  },
  data () {
    return {
      selectedPickers: [] as any,
      queryString: '',
      pickers: [] as any,
      editedPicklist: {} as any,
      isLoading: false
    }
  },
  async mounted() {
    await this.findPickers(this.selectedPicklist.pickerIds)
    this.selectAlreadyAssociatedPickers()
  },
  props: ['selectedPicklist'],
  methods: {
    isPickerSelected(id: string) {
      return this.selectedPickers.some((picker: any) => picker.id == id)
    },
    updateSelectedPickers(id: string) {
      const picker = this.isPickerSelected(id)
      if (picker) {
        // if picker is already selected then removing that picker from the list on click
        this.selectedPickers = this.selectedPickers.filter((picker: any) => picker.id != id)
      } else {
        this.selectedPickers.push(this.pickers.find((picker: any) => picker.id == id))
      }
    },
    async findPickers(pickerIds?: Array<any>) {
      this.isLoading = true;
      let partyIdsFilter = ""
      let query = "*:*"
      this.pickers = []

      if (pickerIds?.length) {
        partyIdsFilter = pickerIds.map(id => `${id}`).join(' OR '); 
      } else if (this.queryString.length > 0) {
        let keyword = this.queryString.trim().split(' ')
        query = `(${keyword.map(key => `*${key}*`).join(' OR ')}) OR "${this.queryString}"^100`;
      }

      const payload = {
        "json": {
          "params": {
            "rows": "50",
            "q": query,
            "defType" : "edismax",
            "qf": "firstName lastName groupName partyId externalId",
            "sort": "firstName asc"
          },
          "filter": ["docType:EMPLOYEE", "statusId:PARTY_ENABLED", "WAREHOUSE_PICKER_role:true", partyIdsFilter.length ? `partyId:(${partyIdsFilter})` : ""]
        }
      }

      try {
        const resp = await UtilService.getAvailablePickers(payload);
        if (resp.status === 200 && !hasError(resp)) {
          this.pickers = resp.data.response.docs.map((picker: any) => ({
            name: picker.groupName ? picker.groupName : (picker.firstName || picker.lastName)
                ? (picker.firstName ? picker.firstName : '') + (picker.lastName ? ' ' + picker.lastName : '') : picker.partyId,           
            id: picker.partyId,
            externalId: picker.externalId
          }))
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch the pickers information or there are no pickers available', err)
      }
      this.isLoading = false;
    },
    async confirmSave() {
      const message = translate("Replace current pickers with new selection?");
      const alert = await alertController.create({
        header: translate("Replace pickers"),
        message,
        buttons: [
          {
            text: translate("Cancel"),
          },
          {
            text: translate("Replace"),
            handler: () => {
              this.resetPicker().then(() => {
                this.closeModal()
              })
            }
          }
        ],
      });
      return alert.present();
    },
    async resetPicker() {
      // remove the 'System Generated' entry through filtering based on ID
      let pickersNameArray = [] as any;
      const pickerIds = this.selectedPickers.map((picker: any) => {
        if (picker.id) {
          pickersNameArray.push(picker.name.split(' ')[0])
        }
        return picker.id
      }).filter((id: any) => id)

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
    arePickersNotSelected() {
      // disable the save button if only 'System Generated' entry is there
      // or if no pickers are selected
      return (this.selectedPickers.length === 1
        && !this.selectedPickers[0].id)
        || (!this.selectedPickers.length)
    },
    closeModal() {
      modalController.dismiss({
        dismissed: true,
        editedPicklist: this.editedPicklist
      });
    },
    selectAlreadyAssociatedPickers() {
      // for default selection of pickers already associated with the picklist
      this.selectedPickers = this.pickers.filter((picker: any) => this.selectedPicklist.pickerIds.includes(picker.id))

      // case for 'System Generated' picker -
      // 'System Generated' picker will be visible only if no pickers are associated with the
      // picklist. Hence, either 'System Generated' will be shown or all names will be shown
      // and not both 
      if (!this.selectedPickers.length) {
        // as selectedPickers will be empty, we manually add the entry
        this.selectedPickers = [{
          name: this.selectedPicklist.pickersName,
          id: null
        }]
      }
    }
  },
  setup() {
    const store = useStore();
    return {
      close,
      saveOutline,
      closeCircle,
      store,
      translate
    };
  }
});
</script>