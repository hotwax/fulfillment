<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button fill="clear" slot="end" @click="printPicklist()">Print Picklist</ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchPicker()"/>
    <ion-row>
      <ion-chip v-for="picker in pickerSelected" :key="picker.partyId">
        <ion-label>{{ picker.name }}</ion-label>
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <!-- TODO: added click event on the item as when using the ionChange event then it's getting
      called every time the v-for loop runs and then removes or adds the currently rendered picker
      -->
      <div v-if="!currentPickers.length">{{ 'No picker found' }}</div>
      <div v-else>
        <ion-item v-for="(picker, index) in currentPickers" :key="index" @click="pickerChanged(picker.partyId)">
          <ion-label>{{ picker.name }}</ion-label>
          <ion-checkbox :checked="isPickerSelected(picker.partyId)"/>
        </ion-item>
      </div>
    </ion-list>
  </ion-content>
</template>

<script>
import { 
  IonButtons,
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRow,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { showToast } from "@/utils";
import { translate } from "@/i18n";

export default defineComponent({
  name: "AssignPickerModal",
  components: { 
    IonButtons,
    IonButton,
    IonCheckbox,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonRow,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      pickers: 'picklist/getAvailablePickers',
      current: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      openOrders: 'order/getOpenOrders'
    })
  },
  data () {
    return {
      pickerSelected: [],
      queryString: '',
      currentPickers: []
    }
  },
  methods: {
    isPickerSelected(pickerId) {
      return this.pickerSelected.some((picker) => picker.partyId == pickerId)
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    pickerChanged(pickerId) {
      const picker = this.pickerSelected.some((picker) => picker.partyId == pickerId)
      if (picker) {
        // if picker is already selected then removing that picker from the list on click
        this.pickerSelected = this.pickerSelected.filter((picker) => picker.partyId != pickerId)
      } else {
        this.pickerSelected.push(this.pickers.find((picker) => picker.partyId == pickerId))
      }
    },
    async searchPicker () {
      this.currentPickers = []
      this.fetchPickers()
    },
    printPicklist () {
      // TODO: update API support to create a picklist
      const payload = this.openOrders;
      if (this.pickerSelected.length) {
        this.store.dispatch('picklist/createPicklist', payload)
      } else {
        showToast(translate('Select a picker'))
      }
    },
    async fetchPickers() {
      let filters = {}
      if(this.queryString.length > 0) {
        // TODO: enable searching on pickerName as well, currently the entity used in warehouse-party api does not
        // support searching on name
        filters['partyId'] = this.queryString
        filters['partyId_op'] = 'contains'
      }

      const payload = {
        vSize: 50,
        vIndex: 0,
        facilityId: this.currentFacility.facilityId,
        roleTypeId: 'WAREHOUSE_PICKER',
        filters
      }

      await this.store.dispatch('picklist/updateAvailablePickers', payload)
      this.currentPickers = this.pickers
    }
  },
  async mounted() {
    // getting picker information on initial load
    await this.fetchPickers()
    if(this.pickers.length) {
      // making the current user as a picker by default
      this.pickerChanged(this.current.partyId)
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      store
    };
  },
});
</script>

<style scoped>
ion-row {
  flex-wrap: nowrap;
  overflow: scroll;
}

ion-chip {
  flex-shrink: 0;
}
</style>