<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/exim" />
        <ion-title>{{ $t("Import shipped orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-item>
          <ion-label>{{ $t("Shipped orders") }}</ion-label>
          <ion-label class="ion-text-right ion-padding-end">{{ file.name }}</ion-label>
          <input :placeholder="$t('Select CSV')" @change="parse" ref="file" class="ion-hide" type="file" id="orderInputFile"/>
          <label for="orderInputFile">{{ $t("Upload") }}</label>
        </ion-item>

        <ion-list>
          <ion-list-header>{{ $t("Select the column for the following information in the uploaded CSV.") }}</ion-list-header>

          <ion-item :key="field" v-for="(fieldValues, field) in fields">
            <ion-label>{{ $t(fieldValues.label) }}</ion-label>
            <ion-select interface="popover" v-if="content.length" :placeholder="$t('Select')" v-model="fieldMapping[field]">
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-button :disabled="!content.length" color="medium" @click="save" expand="block">
          {{ $t("Save") }}
        </ion-button>

      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonSelect, IonSelectOption, IonHeader, IonList, IonListHeader, IonToolbar, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonButton, alertController } from '@ionic/vue'
import { parseCsv, showToast } from '@/utils';
import { translate } from "@/i18n";
import { UploadService } from "@/services/UploadService"
import { hasError } from '@/adapter';
import logger from '@/logger';

export default defineComponent({
  name: 'UploadImportOrders',
  components: {
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
      fieldMapping: {} as any,
      fileColumns: [] as Array<string>,
      fields: process.env["VUE_APP_UPLD_IMP_ORD"] ? JSON.parse(process.env["VUE_APP_UPLD_IMP_ORD"]) : {}
    }
  },
  ionViewDidEnter() {
    this.file = {}
    this.content = []
    this.generateFieldMapping();
    // this.$refs.file.value = null;
  },
  methods: {
    generateFieldMapping() {
      this.fieldMapping = Object.keys(this.fields).reduce((fieldMapping: any, field: string) => {
        fieldMapping[field] = ""
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
      const areAllFieldsSelected = Object.values(this.fieldMapping).every(field => field !== "");
      
      if (!areAllFieldsSelected) {
        showToast(translate("Select all the fields to continue"));
        return;
      }

      const uploadData = this.content.map((order: any) => ({
        'order-id': '',
        'order-id-type': 'SHOPIFY_ORD_NAME',
        'order-id-value': order[this.fieldMapping.orderId],
        'facility-id': '',
        'external-facility-id': order[this.fieldMapping.facilityId],
        'tracking-number': order[this.fieldMapping.trackingCode]
      }))

      const fileName = this.file.name.replace(".csv", ".json");
      const params = {
        "configId": "IMP_TRACK_NUM"
      }
      const alert = await alertController.create({
        header: this.$t("Import shipped orders"),
        message: this.$t("Make sure all the mappings you have selected is correct."),
        buttons: [{
          text: this.$t("Cancel"),
          role: 'cancel',
        }, {
          text: this.$t("Upload"),
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
    }
  },
  setup() {
    const router = useRouter();
    
    return {
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

ion-button{
  margin: var(--spacer-base) var(--spacer-sm);
}

label {
  cursor: pointer;
}
</style>