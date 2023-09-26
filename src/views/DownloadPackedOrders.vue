<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/exim" />
        <ion-title>{{ $t("Export packed orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-list>
          <ion-list-header>{{ $t("Saved mappings") }}</ion-list-header>
          <div>
            <ion-chip :disabled="!content.length" :outline=true @click="addFieldMapping()">
              <ion-icon :icon="addOutline" />
              <ion-label>{{ $t("New mapping") }}</ion-label>
            </ion-chip>
            <ion-chip :disabled="!content.length" v-for="(mapping, index) in fieldMappings('EXPORD') ?? []" :key="index" @click="mapFields(mapping)" :outline=true>
              {{ mapping.name }}
            </ion-chip>
          </div>
        </ion-list>

        <ion-list>
          <!-- TODO: check if we can have button inside header and if yes how to move the button to end -->
          <ion-list-header>{{ $t('Selected Fields: ') }} {{ Object.keys(selectedFieldMappings).length }}
            <ion-button fill="clear" @click="addCustomField()" :disabled="!Object.keys(fieldMapping).length">{{ $t('Add custom field') }}</ion-button>
          </ion-list-header>
          <ion-reorder-group @ionItemReorder="doReorder($event)" :disabled="false">
            <ion-item :key="field" v-for="(value, field) in selectedFieldMappings">
              <ion-icon v-if="!customFields[field]" @click="updateSelectedData(field)" slot="start" color="danger" :icon="removeCircleOutline"/>
              <ion-label>{{ fields[field] ? fields[field].label : field }}</ion-label>
              <ion-button v-if="!customFields[field] && value === field" fill="outline" @click="addCustomLabel(field)">{{ $t('Custom Label') }}</ion-button>
              <!-- Using multiple if's instead of wrapping in a single parent div, to style the component properly without adding any extra css -->
              <ion-label v-if="!customFields[field] && value !== field" slot="end">{{ value }}</ion-label>
              <ion-button v-if="!customFields[field] && value !== field" slot="end" fill="clear" @click="addCustomLabel(field)">
                <ion-icon :icon="pencilOutline" />
              </ion-button>
              <ion-label v-if="customFields[field]" slot="end">{{ value }}</ion-label>
              <ion-button v-if="customFields[field]" slot="end" fill="clear" @click="removeCustomField(field)">
                <ion-icon :icon="trashOutline" />
              </ion-button>
              <ion-reorder slot="end"/>
            </ion-item>
          </ion-reorder-group>
        </ion-list>

        <ion-list>
          <ion-list-header>{{ $t("Select the fields you want to include in your export") }}</ion-list-header>
          <ion-button fill="clear" @click="selectAll" :disabled="!Object.keys(fieldMapping).length">{{ $t('Select all') }}</ion-button>

          <ion-item :key="field" v-for="(value, field) in fieldMapping" v-show="!selectedData[field]">
            <ion-icon @click="updateSelectedData(field)" slot="start" color="success" :icon="addCircleOutline"/>
            <ion-label>{{ fields[field] ? fields[field].label : field }}</ion-label>
          </ion-item>
        </ion-list>
      </main>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="download" :disabled="!content.length">
          <ion-icon :icon="cloudDownloadOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapGetters } from "vuex";
import { alertController, IonBackButton, IonButton, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonPage, IonReorder, IonReorderGroup, IonTitle, IonToolbar, modalController } from '@ionic/vue'
import { addCircleOutline, addOutline, cloudDownloadOutline, pencilOutline, removeCircleOutline, trashOutline } from 'ionicons/icons'
import { parseCsv, jsonToCsv, showToast } from '@/utils';
import { translate } from "@/i18n";
import logger from '@/logger';
import { DateTime } from 'luxon';
import { useRouter } from 'vue-router';
import CreateMappingModal from "@/components/CreateMappingModal.vue";
import { UploadService } from '@/services/UploadService';
import CustomFieldModal from '@/components/CustomFieldModal.vue'

export default defineComponent({
  name: 'UploadImportOrders',
  components: {
    IonBackButton,
    IonButton,
    IonChip,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonPage,
    IonReorder,
    IonReorderGroup,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      content: [] as any,
      fieldMapping: {} as any,
      dataColumns: [] as Array<string>,
      selectedData: {} as any,
      fields: process.env["VUE_APP_MAPPING_EXPORD"] ? JSON.parse(process.env["VUE_APP_MAPPING_EXPORD"]) : {},
      customFields: {} as any,
      selectedFieldMappings: {} as any
    }
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      fieldMappings: 'user/getFieldMappings'
    })
  },
  async ionViewDidEnter() {
    this.content = []
    await this.fetchPackedOrders();
  },
  methods: {
    async fetchPackedOrders() {
      // TODO: need to set a timeout, as when the orders size gets big then the api might take long time to return the information

      const payload = {
        params: {
          configId: 'MDM_PACKED_SHIPMENT',
          mimeTypeId: 'application/octet',
          facilityId: this.currentFacility.facilityId
        }
      }

      try {
        const resp = await UploadService.fetchPackedOrders(payload);

        if(resp.status == 200 && resp.data) {
          await this.parse(resp.data)
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Failed to get packed orders information'))
        logger.error('Failed to get packed orders', err)
      }
    },
    generateFieldMapping() {
      this.fieldMapping = Object.keys(this.fields).reduce((fieldMapping: any, field: string) => {
        fieldMapping[field] = field
        return fieldMapping;
      }, {})
    },
    async parse(data: any) {
      try {
        this.content = await parseCsv(data).then(res => res);
        // get the column names from the data
        this.dataColumns = Object.keys(this.content[0]);
        // generating mapping only when we get the packed orders information and parsing of data is successfull
        this.generateFieldMapping();
      } catch {
        this.content = []
        logger.error("Failed to parse the data");
      }
    },
    async addCustomLabel(field: any) {
      const alert = await alertController.create({
        header: this.$t('Define custom label for', { label: this.fields[field].label }),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        }, {
          text: translate('Save'),
          handler: (data) => {
            const value = data.customLabel.trim();

            // check if the provided label is already mapped to some value, if yes then ask user to provide unique label
            if(Object.values(this.fieldMapping).includes(value) && this.fieldMapping[field] != value) {
              showToast(translate('Please provide unique labels'))
              return false;
            }

            this.fieldMapping[field] = value ? value : field;
            // selecting the field value when the label for the field is changed
            this.selectedData[field] = this.fieldMapping[field]
            this.selectedFieldMappings[field] = this.fieldMapping[field]
          }
        }],
        inputs: [{
          name: 'customLabel',
          type: 'text',
          placeholder: translate('Custom Label'),
          value: this.fieldMapping[field]
        }]
      });

      await alert.present();
    },
    updateSelectedData(field: any) {
      if(this.selectedData[field]) {
        delete this.selectedData[field]
        delete this.selectedFieldMappings[field]
      } else {
        this.selectedData[field] = this.fieldMapping[field]
        this.selectedFieldMappings[field] = this.fieldMapping[field]
      }
    },
    async download() {
      if(!Object.keys(this.selectedData).length) {
        showToast(translate('Please select at least one field to generate CSV'))
        return;
      }

      const downloadData = [] as any

      this.content.map((order: any) => {
        downloadData.push(Object.keys(this.selectedFieldMappings).reduce((orderInfo: any, property: string) => {
          const isCustomField = !order[property]

          if(isCustomField) {
            orderInfo[property] = this.selectedFieldMappings[property]
          } else {
            orderInfo[this.selectedFieldMappings[property]] = order[property]
          }
          return orderInfo
        }, {}))
      })

      const alert = await alertController.create({
        header: this.$t("Download packed orders"),
        message: this.$t("Make sure all the labels provided are correct."),
        buttons: [{
          text: this.$t("Cancel"),
          role: 'cancel',
        }, {
          text: this.$t("Download"),
          handler: async () => {
            const fileName = `HCPackedOrders-${this.currentFacility.facilityId}-${DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}.csv`
            await jsonToCsv(downloadData, { download: true, name: fileName })
            this.router.back();
          }
        }]
      });
      return alert.present();
    },
    selectAll() {
      const fields = JSON.parse(JSON.stringify(this.fieldMapping))

      const unselectedFields = Object.keys(fields).reduce((unselectedFields: any, field) => {
        if(!this.selectedFieldMappings[field]) {
          unselectedFields[field] = fields[field]
        }

        return unselectedFields
      }, {})

      this.selectedData = {
        ...this.selectedFieldMappings,
        ...unselectedFields
      }
      this.selectedFieldMappings = {
        ...this.selectedFieldMappings,
        ...unselectedFields
      }
    },
    async addFieldMapping() {
      let mappings: any = {};

      // added the support to loop on selectedFieldMappings as to save the order of fields, if changed on reordering
      Object.keys(this.selectedFieldMappings).map((mapping) => {
        let isSelected = false;

        if(this.customFields[mapping]) {
          mappings[mapping] = {
            value: this.customFields[mapping].value,
            label: mapping,
            isSelected: true,
            isCustomField: true
          }
        } else if(this.selectedFieldMappings[mapping]) {
          isSelected = true
          mappings[mapping] = { value: this.fieldMapping[mapping], isSelected, label: this.fields[mapping].label }
        }
      })

      Object.keys(this.fieldMapping).map((mapping) => {
        if(!mappings[mapping]) {
          mappings[mapping] = { value: this.fieldMapping[mapping], isSelected: false, label: this.fields[mapping].label }
        }
      })

      const createMappingModal = await modalController.create({
        component: CreateMappingModal,
        componentProps: { content: this.content, mappings: { ...mappings }, mappingType: 'EXPORD'}
      });
      return createMappingModal.present();
    },
    mapFields(mapping: any) {
      const fieldMapping = JSON.parse(JSON.stringify(mapping));
      const mappingValue = fieldMapping.value

      this.fieldMapping = {}
      this.customFields = {}
      this.selectedData = {}
      this.selectedFieldMappings = {}

      Object.keys(mappingValue).map((mapping) => {
        if(mappingValue[mapping].isCustomField) {
          this.customFields[mapping] = {
            value: mappingValue[mapping].value,
            label: mapping,
            isSelected: true,
            isCustomField: true
          }
          this.selectedFieldMappings[mapping] = mappingValue[mapping].value
        } else {
          this.fieldMapping[mapping] = mappingValue[mapping].value
        }

        if(mappingValue[mapping].isSelected && !mappingValue[mapping].isCustomField) {
          this.selectedData[mapping] = mappingValue[mapping].value
          this.selectedFieldMappings[mapping] = mappingValue[mapping].value
        }
      })
    },
    async addCustomField() {
      const customFieldModal = await modalController.create({
        component: CustomFieldModal,
        componentProps: { customFields: this.customFields }
      });

      customFieldModal.onDidDismiss().then((result) => {
        if(result.data && result.data.value) {
          this.customFields[result.data.value.key] = {
            value: result.data.value.value,
            label: result.data.value.key,
            isSelected: true,
            isCustomField: true
          }

          this.selectedFieldMappings[result.data.value.key] = result.data.value.value
        }
      })

      return customFieldModal.present();
    },
    removeCustomField(key: any) {
      delete this.customFields[key];
      delete this.selectedFieldMappings[key];
    },
    doReorder(event: CustomEvent) {
      // making the item reorder action as complete
      let updatedSeq = event.detail.complete(JSON.parse(JSON.stringify(Object.keys(this.selectedFieldMappings))));

      this.selectedFieldMappings = updatedSeq.reduce((updatedData: any, field: string) => {
        updatedData[field] = this.selectedFieldMappings[field]

        return updatedData
      }, {})
    },
  },
  setup() {
    const router = useRouter();

    return {
      addCircleOutline,
      addOutline,
      cloudDownloadOutline,
      pencilOutline,
      removeCircleOutline,
      trashOutline,
      router
    }
  }
});

</script>

<style scoped>
main {
  max-width: 732px;
  margin: var(--spacer-sm) auto 0;
}
</style>