<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button fill="clear" slot="end" @click="printPicklist(); generatePdf();">Print Picklist</ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="searchPicker()"/>
    <ion-row>
      <ion-chip v-for="pickerName in pickerSelected" :key="pickerName">
        <ion-label v-if="pickerName">{{ pickerName }}</ion-label>
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <!-- TODO: added click event on the item as when using the ionChange event then it's getting
      called every time the v-for loop runs and then removes or adds the currently rendered picker
      -->
      <ion-item v-for="(picker, index) in currentPickers" :key="index" @click="pickerChanged(picker.name)">
        <ion-label>{{ picker.name }}</ion-label>
        <ion-checkbox :checked="pickerSelected.includes(picker.name)"/>
      </ion-item>
    </ion-list>
  </ion-content>
  <OpenOrdersPdf :openOrders="openOrders" v-show="false"/>
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
import OpenOrdersPdf from './OpenOrdersPdf.vue';
import pdfMake from 'pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';

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
    OpenOrdersPdf
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
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    pickerChanged (picker) {
      if (!this.pickerSelected.includes(picker)) {
        this.pickerSelected.push(picker)
      } else {
        this.pickerSelected.splice(this.pickerSelected.indexOf(picker), 1)
      }
    },
    searchPicker () {
      this.currentPickers = []
      if (this.queryString.length > 0) {
        this.pickers.map((picker) => {
          if (picker.name.toLowerCase().includes(this.queryString.toLowerCase())) this.currentPickers.push(picker)
        })
      } else {
        this.currentPickers = this.pickers.map((picker) => picker)
      }
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
    generatePdf(){
      console.log(this.openOrders);
      pdfMake.vfs = pdfFonts.pdfMake.vfs;
      const pdfDocument =  document.getElementById('PDF');
      const html =  htmlToPdfmake(pdfDocument.innerHTML);  
      const docDefinition = {
        content: [html],
        info: {
          title: this.$t("Picklist") // it provides the required title to our pdf
        },
        // styles:{
        //  'yellow':{
        //     background:'yellow' // it will add a yellow background to all elements with class yellow
        //   },
        //   'one':{
        //     background:'blue', // it will add these css properties to all element with class one
        //     color:'pink'
        //   }   
        // } 
      }
      pdfMake.createPdf(docDefinition).open();
    }
  },
  mounted() {
    // getting picker information on initial load
    this.store.dispatch('picklist/updateAvailablePickers', {
      vSize: 50,
      vIndex: 0,
      facilityId: this.currentFacility.facilityId,
      roleTypeId: 'WAREHOUSE_PICKER'
    }).then(() => {
      this.pickerChanged(this.current.partyName)
      this.searchPicker()
    })
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

.one{
  color: aqua;
  background-color: blue;
}
</style>