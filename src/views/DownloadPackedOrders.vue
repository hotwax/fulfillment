<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/exim" />
        <ion-title>{{ $t("Download packed orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <input :placeholder="$t('Select CSV')" @change="parse" ref="file" class="ion-hide" type="file" id="downloadPackedOrders"/>
      <label for="downloadPackedOrders">{{ $t("Upload") }}</label>
      <main>
        <ion-list>
          <ion-list-header>{{ $t("Select the fields you want to include in your export") }}</ion-list-header>

          <ion-item :key="field" v-for="(value, field) in fieldMapping">
            <ion-checkbox @ionChange="updateDownloadData(field)" slot="start"/>
            <ion-label>{{ field }}</ion-label>
            <ion-button v-if="value === field" fill="outline" @click="addCustomLabel(field)">{{ $t('Custom Label') }}</ion-button>
            <!-- Using multiple if's instead of wrapping in a single parent div, to style the component properly without adding any extra css -->
            <ion-label v-if="value !== field" slot="end">{{ value }}</ion-label>
            <ion-icon v-if="value !== field" slot="end" :icon="pencilOutline" @click="addCustomLabel(field)" />
          </ion-item>
        </ion-list>

        <ion-button size="large" :disabled="!content.length" color="medium" @click="download" expand="block">
          {{ $t("Download") }}
        </ion-button>

      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapGetters, useStore } from "vuex";
import { useRouter } from 'vue-router';
import { IonCheckbox, IonPage, IonHeader, IonList, IonListHeader, IonToolbar, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonButton, alertController, IonIcon } from '@ionic/vue'
import { pencilOutline } from 'ionicons/icons'
import { parseCsv, jsonToCsv, showToast } from '@/utils';
import { translate } from "@/i18n";
import logger from '@/logger';
import { DateTime } from 'luxon';

export default defineComponent({
  name: 'UploadImportOrders',
  components: {
    IonCheckbox,
    IonPage,
    IonHeader,
    IonToolbar,
    IonBackButton,
    IonList,
    IonListHeader,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon
  },
  data() {
    return {
      file: {} as any,
      content: [] as any,
      fieldMapping: {} as any,
      fileColumns: [] as Array<string>,
      downloadData: {} as any
    }
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility'
    })
  },
  ionViewDidEnter() {
    // TODO: make api call to get the CSV file, instead of upload file option
    this.file = {}
    this.content = []
  },
  methods: {
    async parse(event: any) {
      const file = event.target.files[0];
      try {
        if (file) {
          this.content = await parseCsv(file).then(res => res);
          // get the column names from the file
          this.fileColumns = Object.keys(this.content[0]);
          this.fieldMapping = this.fileColumns.reduce((fieldMapping: any, field: string) => {
            fieldMapping[field] = field
            return fieldMapping;
          }, {})
        } else {
          logger.error("No file upload. Please try again");
        }
      } catch {
        this.content = []
        logger.error("Please upload a valid csv to continue");
      }
    },
    async addCustomLabel(field: any) {
      const alert = await alertController.create({
        header: this.$t('Define custom label for', { field }),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        }, {
          text: translate('Save'),
          handler: (data) => {
            const value = data.customLabel.trim();

            // check if the provided label is already mapped to some value, if yes then ask user to provide unique label
            if(Object.values(this.fieldMapping).includes(value)) {
              showToast(translate('Please provide unique labels'))
              return false;
            }

            this.fieldMapping[field] = value ? value : field;
          }
        }],
        inputs: [{
          name: 'customLabel',
          type: 'text',
          placeholder: translate('Custom Label')
        }]
      });

      await alert.present();
    },
    updateDownloadData(field: any) {
      if(this.downloadData[field] && this.downloadData[field].length >= 0) {
        delete this.downloadData[field]
      } else {
        this.downloadData[field] = this.fieldMapping[field]
      }
    },
    async download() {
      if(!Object.keys(this.downloadData).length) {
        showToast(translate('Please select at least one field to generate CSV'))
        return;
      }

      const uploadData = [] as any

      this.content.map((order: any) => {
        uploadData.push(Object.keys(this.downloadData).reduce((orderInfo: any, property: string) => {
          orderInfo[this.downloadData[property]] = order[property]
          return orderInfo
        }, {}))
      })

      const alert = await alertController.create({
        header: this.$t("Download packed orders"),
        message: this.$t("Make sure all the label provided are correct."),
        buttons: [{
          text: this.$t("Cancel"),
          role: 'cancel',
        }, {
          text: this.$t("Download"),
          handler: async () => {
            const fileName = `PackedOrders-${this.currentFacility.facilityId}-${DateTime.now().toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)}.csv`
            await jsonToCsv(uploadData, { download: true, name: fileName })
          }
        }]
      });
      return alert.present();
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();

    return {
      pencilOutline,
      router,
      store,
    }
  }
});

</script>

<style scoped>
main {
  max-width: 732px;
  margin: var(--spacer-sm) auto 0;
}

label {
  cursor: pointer;
}
</style>