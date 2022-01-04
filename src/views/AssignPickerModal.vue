<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>Assign Pickers</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar />
    <ion-row>
      <ion-chip v-for="pickerName in pickerSelected" :key="pickerName">
        <ion-label v-if="pickerName">{{ pickerName }}</ion-label>
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>Staff</ion-list-header>
      <ion-item v-for="(picker, index) in pickers" :key="index">
        <ion-label>{{ picker.name }}</ion-label>
        <ion-checkbox @ionChange="pickerChanged(picker.name)" :checked="picker.name === current.partyName"/>
      </ion-item>
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
      current: 'user/getUserProfile'
    })
  },
  data () {
    return {
      pickerSelected: []
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
    }
  },
  mounted() {
    this.store.dispatch('picklist/updateAvailablePickers')
    this.pickerChanged(this.current.partyName)
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