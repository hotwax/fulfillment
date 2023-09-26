<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("CSV Mapping") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-item>
    <ion-label>{{ $t("Mapping name") }}</ion-label>
    <ion-input :placeholder="$t('Field mapping name')" v-model="mappingName" />
  </ion-item>

  <ion-content class="ion-padding">
    <div>
      <ion-list>
        <ion-item :key="field" v-for="(fieldValues, field) in fieldMapping">
          <ion-label>{{ $t(fieldValues.label) }}</ion-label>
          <ion-input v-if="mappingType === 'EXPORD'" slot="end" v-model="fieldValues.value"></ion-input>
          <ion-select v-else interface="popover" :placeholder = "$t('Select')" v-model="fieldValues.value">
            <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
    </div>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="saveMapping">
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonFab,
  IonFabButton,
  IonInput,
  IonTitle,
  IonToolbar,
  IonLabel,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close, save, saveOutline } from "ionicons/icons";
import { useStore, mapGetters } from "vuex";
import { showToast } from '@/utils';
import { translate } from "@/i18n";

export default defineComponent({
  name: "CreateMappingModal",
  components: { 
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    IonLabel,
    IonItem,
    IonList
  },
  data() {
    return {
      mappingName: "",
      fieldMapping: {} as any,
      fileColumns: [] as any
    }
  },
  props: ["content", "mappings", "mappingType"],
  mounted() {
    // mappings needs to be in format { <key>: { value: <value>, label: <label>, isSelected | optional: <boolean> }}
    this.fieldMapping = JSON.parse(JSON.stringify(this.mappings));
    this.fileColumns = Object.keys(this.content[0]);
  },
  computed: {
    ...mapGetters({
      fieldMappings: 'user/getFieldMappings'
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async saveMapping() {
      if(!this.mappingName) {
        showToast(translate("Enter mapping name"));
        return
      }
      if (!this.areAllFieldsSelected()) {
        showToast(translate("Map all fields"));
        return
      }
      const id = this.generateUniqueMappingPrefId();
      const mappings = {} as any;

      // removing label from mappings as we don't need to save label with the mappings as it will just increase the size of the value
      Object.keys(this.fieldMapping).map((mapping) => {
        mappings[mapping] = this.fieldMapping[mapping].isCustomField ? {
          value: this.fieldMapping[mapping].value,
          isSelected: this.fieldMapping[mapping].isSelected,
          isCustomField: this.fieldMapping[mapping].isCustomField
        } : {
          value: this.fieldMapping[mapping].value,
          isSelected: this.fieldMapping[mapping].isSelected
        }
      })

      await this.store.dispatch("user/createFieldMapping", { id, name: this.mappingName, value: mappings, mappingType: this.mappingType })
      this.closeModal();
    },
    areAllFieldsSelected() {
      return Object.values(this.fieldMapping).every((field: any) => field.value !== "");
    },
    //Todo: Generating unique identifiers as we are currently storing in local storage. Need to remove it as we will be storing data on server.
    generateUniqueMappingPrefId(): any {
      const id = Math.floor(Math.random() * 1000);
      return !this.fieldMappings[id] ? id : this.generateUniqueMappingPrefId();
    }
  },
  setup() {
    const store = useStore();
    return {
      close,
      save,
      saveOutline,
      store
    };
  }
});
</script>