<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/exim" />
        <ion-title>{{ translate("Import shipped orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-item>
          <ion-label>{{ translate("Shipped orders") }}</ion-label>
          <ion-label class="ion-text-right ion-padding-end">{{ file.name }}</ion-label>
          <input :placeholder="translate('Select CSV')" @change="parse" ref="file" class="ion-hide" type="file" id="orderInputFile"/>
          <label for="orderInputFile">{{ translate("Upload") }}</label>
        </ion-item>

        <ion-list>
          <ion-list-header>{{ translate("Saved mappings") }}</ion-list-header>
          <div>
            <ion-chip :disabled="!content.length" :outline=true @click="addFieldMapping()">
              <ion-icon :icon="addOutline" />
              <ion-label>{{ translate("New mapping") }}</ion-label>
            </ion-chip>
            <ion-chip :disabled="!content.length" v-for="(mapping, index) in fieldMappings('IMPORD') ?? []" :key="index" @click="mapFields(mapping.value, index)" :outline="selectedMappingId == index ? false : true">
              {{ mapping.name }}
            </ion-chip>
          </div>
        </ion-list>

        <ion-list>
          <ion-list-header>{{ translate("Select the column for the following information in the uploaded CSV.") }}</ion-list-header>

          <ion-item :key="field" v-for="(fieldValues, field) in fields">
            <ion-select :label="translate(fieldValues.label)" interface="popover" :disabled="!content.length || !fieldMapping[field]" :placeholder="translate('Select')" v-model="fieldMapping[field].value">
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-button :disabled="!content.length" color="medium" @click="save" expand="block">
          {{ translate("Save") }}
        </ion-button>

      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { IonChip, IonIcon, IonPage, IonSelect, IonSelectOption, IonHeader, IonList, IonListHeader, IonToolbar, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonButton, alertController, modalController } from '@ionic/vue'
import { parseCsv, showToast } from '@/utils';
import { translate } from "@hotwax/dxp-components";
import { UploadService } from "@/services/UploadService"
import { hasError } from '@/adapter';
import logger from '@/logger';
import { addOutline } from "ionicons/icons"
import CreateMappingModal from "@/components/CreateMappingModal.vue";
import { mapGetters, useStore } from 'vuex';

export default defineComponent({
  name: 'UploadImportOrders',
  components: {
    IonChip,
    IonIcon,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonHeader,
    IonToolbar,
    IonBackButton,
    IonList,
    IonListHeader,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonButton
  },
  data() {
    return {
      file: {} as any,
      content: [] as any,
      fieldMapping: {
        'orderId': {},
        'facilityId': {},
        'trackingCode': {}
      } as any,
      fileColumns: [] as Array<string>,
      fields: process.env["VUE_APP_MAPPING_IMPORD"] ? JSON.parse(process.env["VUE_APP_MAPPING_IMPORD"]) : {},
      selectedMappingId: "" as any
    }
  },
  computed: {
    ...mapGetters({
      fieldMappings: 'user/getFieldMappings',
      currentFacility: 'user/getCurrentFacility',
    })
  },
  ionViewDidEnter() {
    this.file = {}
    this.content = []
    this.generateFieldMapping();
    this.store.dispatch('user/getFieldMappings')
    // this.$refs.file.value = null;
  },
  methods: {
    generateFieldMapping() {
      this.fieldMapping = Object.keys(this.fields).reduce((fieldMapping: any, field: string) => {
        fieldMapping[field] = {}
        return fieldMapping;
      }, {})
    },
    async parse(event: any) {
      const file = event.target.files[0];
      try {
        if (file) {
          // recreate fieldMapping object when the file is changed
          this.generateFieldMapping();

          this.file = file;
          this.content = await parseCsv(file).then(res => res);
          this.fileColumns = Object.keys(this.content[0]);
          showToast(translate("File uploaded successfully"));
        } else {
          showToast(translate("No new file upload. Please try again"));
        }
      } catch {
        this.content = []
        showToast(translate("Please upload a valid csv to continue"));
      }
    },
    async save() {
      // Added check to allow uploading CSV even when user has not mapped the facilityID
      const areAllFieldsSelected = Object.keys(this.fieldMapping).every((field: any) => field === "facilityId" || this.fieldMapping[field]?.value); 
      
      if (!areAllFieldsSelected) {
        showToast(translate("Select orderId and tracking code to continue"));
        return;
      }

      const uploadData = this.content.map((order: any) => {
        const externalFacilityId = order[this.fieldMapping['facilityId'].value];
        const data = {
          'orderId': order[this.fieldMapping['orderId'].value],
          'trackingNumber': order[this.fieldMapping['trackingCode'].value]
        } as any;
        if (externalFacilityId) {
          data['externalFacilityId'] = externalFacilityId;
        } else {
          data['facilityId'] = this.currentFacility?.facilityId;
        }
        return data;
      });
      
      const fileName = this.file.name.replace(".csv", ".json");
      const params = {
        "configId": "IMP_TRACK_NUM"
      }
      const alert = await alertController.create({
        header: translate("Import shipped orders"),
        message: translate("Make sure all the mappings you have selected is correct."),
        buttons: [{
          text: translate("Cancel"),
          role: 'cancel',
        }, {
          text: translate("Upload"),
          handler: async () => {
            try {
              const resp = await UploadService.uploadJsonFile(UploadService.prepareUploadJsonPayload({
                uploadData,
                fileName,
                params
              }))

              if(hasError(resp)) {
                logger.error(resp.data)
                showToast('Configuration Missing')
                return;
              }

              showToast(translate("The import orders has been uploaded successfully"))
              this.router.back(); // go back to previous route
            } catch(err) {
              logger.error(err)
              showToast(translate("Something went wrong, please try again"));
            }
          }
        }]
      });
      return alert.present();
    },
    mapFields(mapping: any, mappingId: any) {
      const fieldMapping = JSON.parse(JSON.stringify(mapping));

      // TODO: Store an object in this.content variable, so everytime when accessing it, we don't need to use 0th index
      const csvFields = Object.keys(this.content[0]);

      const missingFields: Array<string> = []

      Object.values(fieldMapping).map((field: any) => {
        if(!csvFields.includes(field.value)) missingFields.push(field.value);
      });

      if(missingFields.length) showToast(translate("Some of the mapping fields are missing in the CSV: ", { missingFields: missingFields.join(", ") }))

      Object.keys(fieldMapping).map((key) => {
        if(!csvFields.includes(fieldMapping[key].value)){
          fieldMapping[key].value = "";
        }
      })

      this.fieldMapping = fieldMapping;
      this.selectedMappingId = mappingId
    },
    async addFieldMapping() {
      let mappings: any = {};

      Object.keys(this.fieldMapping).map((mapping) => {
        mappings[mapping] = { value: this.fieldMapping[mapping].value, label: this.fields[mapping].label }
      })

      const createMappingModal = await modalController.create({
        component: CreateMappingModal,
        componentProps: { content: this.content, mappings, mappingType: 'IMPORD'}
      });

      createMappingModal.onDidDismiss().then((result: any) => {
        if(result.data?.mappingId) {
          this.selectedMappingId = result.data.mappingId
        }
      })

      return createMappingModal.present();
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    
    return {
      addOutline,
      router,
      store,
      translate
    }
  }
});

</script>

<style scoped>
main {
  max-width: 732px;
  margin: var(--spacer-sm) auto 0; 
}

ion-button{
  margin: var(--spacer-base) var(--spacer-sm);
}

label {
  cursor: pointer;
}
</style>