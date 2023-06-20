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
import { defineComponent, ref } from 'vue';
import { mapGetters, useStore } from "vuex";
import { useRouter } from 'vue-router';
import { IonPage, IonSelect, IonSelectOption, IonHeader, IonList, IonListHeader, IonToolbar, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonButton } from '@ionic/vue'
import { ellipsisVerticalOutline, businessOutline, shirtOutline, sendOutline, checkboxOutline, calculatorOutline, cloudUploadOutline, arrowUndoOutline, chevronForwardOutline, timeOutline } from 'ionicons/icons'
import { parseCsv, showToast } from '@/utils';
import { translate } from "@/i18n";

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
  computed: {
    ...mapGetters({
      facilities: 'util/getFacilities',
      purchaseOrders: 'order/getPurchaseOrders',
      getProduct: 'product/getProduct',
      instanceUrl: 'user/getInstanceUrl',
      dateTimeFormat : 'user/getPreferredDateTimeFormat',
      fileName: 'order/getFileName'
    })
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
    this.fieldMapping = Object.keys(this.fields).reduce((fieldMapping: any, field: string) => {
      fieldMapping[field] = ""
      return fieldMapping;
    }, {})
    // this.$refs.file.value = null;
  },
  methods: {
    async parseCsv(file: any) {
      // TODO: check if we need this check as this method is only called when we have file
      if (file) {
        // TODO: check what happens when parseCSV rejects
        const csvData = await parseCsv(file).then(res => {
          return res;
        })
        // TODO: check why we have multiple toast on success
        showToast(translate("File uploaded successfully"));
        return csvData;
      }
      showToast(translate("Something went wrong, Please try again")); 
    },
    mapFields(mapping: any) {
      const fieldMapping = JSON.parse(JSON.stringify(mapping));

      // TODO: Store an object in this.content variable, so everytime when accessing it, we don't need to use 0th index
      const csvFields = Object.keys(this.content[0]);

      // const missingFields = Object.values(fieldMapping.value).filter((field: string) => {
      //   if(!csvFields.includes(field)) return field;
      // });

      // if(missingFields.length) showToast(translate("Some of the mapping fields are missing in the CSV: ", { missingFields: missingFields.join(", ") }))

      Object.keys(fieldMapping.value).map((key) => {
        if(!csvFields.includes(fieldMapping.value[key])){
          fieldMapping.value[key] = "";
        }
      })
      this.fieldMapping = fieldMapping.value;
    },
    async parse(event: any) {
      const file = event.target.files[0];
      try {
        if (file) {
          this.file = file;
          this.content = await this.parseCsv(this.file);
          this.fileColumns = Object.keys(this.content[0]);
          showToast(translate("File uploaded successfully"));
        } else {
          showToast(translate("No new file upload. Please try again"));
        }
      } catch {
        this.content = []
        showToast(translate("Please upload a valid reset inventory csv to continue"));
      }
    },
    save() {
      const areAllFieldsSelected = Object.values(this.fieldMapping).every(field => field !== "");
      
      if (!areAllFieldsSelected) {
        showToast(translate("Select all the fields to continue"));
        return;
      } 

      const stockItems = this.content.map((item: any) => {
        return {
          shopifyProductSKU: item[this.fieldMapping.productSku],
          quantity: item[this.fieldMapping.quantity],
          facilityId: '',
          externalFacilityId: item[this.fieldMapping.facility],
          locationSeqId: item[this.fieldMapping.locationSeqId]
        }
      })
      this.store.dispatch('stock/processUpdateStockItems', stockItems);
      this.router.push({
        name:'InventoryDetail'
      })
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const segmentSelected = ref('all');
    
    return {
      checkboxOutline,
      calculatorOutline,
      ellipsisVerticalOutline,
      sendOutline,
      arrowUndoOutline,
      businessOutline,
      cloudUploadOutline,
      chevronForwardOutline,
      timeOutline,
      shirtOutline,
      segmentSelected,
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

ion-button{
  margin: var(--spacer-base) var(--spacer-sm);
}

label {
  cursor: pointer;
}
</style>