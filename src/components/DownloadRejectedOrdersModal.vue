<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal" data-testid="download-rejected-orders-modal-close-button"> 
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Download results") }}</ion-title>
      </ion-toolbar>
    </ion-header>
  
    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>{{ translate("Select fields") }}</ion-label>
        </ion-list-header>
        <ion-item v-for="selectedField in selectedFields" :key="selectedField.name">
          <template v-if="selectedField.name === 'primaryProductId'">
            <ion-checkbox justify="start" label-placement="end" v-model="selectedField.value" :checked="selectedField.value" :disabled="selectedField.disabled" data-testid="download-rejected-orders-modal-primary-product-id-checkbox">{{ translate(selectedField.description) }}</ion-checkbox>
            <ion-select aria-label="primaryProduct" interface="popover" value="default" slot="end" v-model="selectedPrimaryProductId" data-testid="download-rejected-orders-modal-primary-product-id-select">
              <ion-select-option :data-testid="`download-rejected-orders-modal-primary-product-id-option-${value}`" v-for="(value, identificationsType) in productIdentifications" :key="identificationsType" :value="value">{{ identificationsType }}</ion-select-option>
            </ion-select>
          </template>
          <template v-else-if="selectedField.name === 'secondaryProductId'">
            <ion-checkbox justify="start" label-placement="end" v-model="selectedField.value" :checked="selectedField.value" :disabled="selectedField.disabled" data-testid="download-rejected-orders-modal-secondary-product-id-checkbox">{{ translate(selectedField.description) }}</ion-checkbox>
            <ion-select aria-label="primaryProduct" interface="popover" value="default" slot="end" v-model="selectedSecondaryProductId" data-testid="download-rejected-orders-modal-secondary-product-id-select">
              <ion-select-option :data-testid="`download-rejected-orders-modal-secondary-product-id-option-${value}`" v-for="(value, identificationsType) in productIdentifications" :key="identificationsType" :value="value">{{ identificationsType }}</ion-select-option>
            </ion-select>
          </template>
          <template v-else-if="selectedField.name === 'rejectedFrom'">
            <ion-checkbox justify="start" label-placement="end" v-model="selectedField.value" :checked="selectedField.value" :disabled="selectedField.disabled" data-testid="download-rejected-orders-modal-facility-checkbox">{{ translate("Facility") }}</ion-checkbox>
            <ion-select aria-label="facilityField" interface="popover" v-model="selectedFacilityId" slot="end" data-testid="download-rejected-orders-modal-facility-select">
              <ion-select-option value="facilityId" data-testid="download-rejected-orders-modal-facility-option-internal-id">Internal ID</ion-select-option>
              <ion-select-option value="externalId" data-testid="download-rejected-orders-modal-facility-option-external-id">External ID</ion-select-option>
            </ion-select>
          </template>
          <template v-else>
            <ion-checkbox justify="start" label-placement="end" @ionChange="selectField(selectedField.name)" :checked="selectedField.value" :disabled="selectedField.disabled" :data-testid="`download-rejected-orders-modal-field-checkbox-${selectedField.name}`">{{ translate(selectedField.description) }}</ion-checkbox>
          </template>
        </ion-item>
      </ion-list>
    </ion-content>
  
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="downloadCSV" data-testid="download-rejected-orders-modal-download-button">
        <ion-icon :icon="cloudDownloadOutline" />
      </ion-fab-button>
    </ion-fab>
  </template>
  
  <script lang="ts">
  import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    modalController,
    alertController
  } from '@ionic/vue';
  import { computed, defineComponent } from 'vue';
  import { closeOutline, cloudDownloadOutline} from 'ionicons/icons';
  import { getProductIdentificationValue,  translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
  import { mapGetters, useStore } from 'vuex';
  import { escapeSolrSpecialChars, prepareSolrQuery } from '@/utils/solrHelper'
  import { RejectionService } from '@/services/RejectionService'
  import { UtilService } from "@/services/UtilService";
  import { hasError } from '@/adapter'
  import logger from '@/logger';
  import emitter from "@/event-bus";
  import { getDateWithOrdinalSuffix, jsonToCsv } from "@/utils";
  import { DateTime } from 'luxon';


  
  export default defineComponent({
    name: 'Rejections',
    components: {
      IonButton,
      IonButtons,
      IonCheckbox,
      IonContent,
      IonFab,
      IonFabButton,
      IonHeader,
      IonIcon,
      IonItem,
      IonLabel,
      IonList,
      IonListHeader,
      IonSelect,
      IonSelectOption,
      IonTitle,
      IonToolbar
    },
    data() {
      return {
        selectedFacilityId: "facilityId",
        selectedPrimaryProductId: "productId",
        selectedSecondaryProductId: "productId",
        selectedFields: [
          {"name": "orderId", "value": true, "description": "Order ID", "disabled": true},
          {"name": "orderItemSeqId", "value": true, "description": "Order item sequence ID", "disabled": true},
          {"name": "itemDescription", "value": true, "description": "Item description", "disabled": false},
          {"name": "rejectedFrom", "value": true, "description": "Rejected from", "disabled": true},
          {"name": "primaryProductId", "value": true, "description": "Primary product ID", "disabled": true},
          {"name": "secondaryProductId", "value": true, "description": "Secondary product ID", "disabled": false},
          {"name": "availableToPromise", "value": true, "description": "Available to promise", "disabled": false},
          {"name": "rejectedBy", "value": true, "description": "Rejected by", "disabled": false},
          {"name": "rejectedAt", "value": true, "description": "Rejected at", "disabled": false},
          {"name": "rejectionReasonId", "value": true, "description": "Rejection reason ID", "disabled": false},
          {"name": "rejectionReasonDesc", "value": true, "description": "Rejection reason description", "disabled": false},
          {"name": "brokeredAt", "value": true, "description": "Brokered at", "disabled": false},
          {"name": "brokeredBy", "value": true, "description": "Brokered by", "disabled": false}
        ],
        productIdentifications: {
          "Internal ID": "productId",
          "Internal Name": "internalName",
          "SKU": "SKU",
          "UPC": "UPCA"
        }
      }
    },
    computed: {
      ...mapGetters({
        getProduct: 'product/getProduct',
        rejectedOrders: 'rejection/getRejectedOrders'
      })
    },
    methods: {
      closeModal() {
        modalController.dismiss({ dismissed: true});
      },
      selectField(fieldName: string) {
        const selectedField = this.selectedFields.find(selectedField => selectedField.name === fieldName);
        if (selectedField) {
          selectedField.value = selectedField.value ? false : true
        }
      },
      async downloadCSV() {
        const alert = await alertController.create({
          header: translate("Download rejected orders"),
          message: translate("Are you sure you want to download the rejected orders?"),
          htmlAttributes: {
            'data-testid': 'download-rejected-orders-modal-alert'
          },
          buttons: [{
            text: translate("Cancel"),
            role: 'cancel',
            htmlAttributes: {
              'data-testid': 'download-rejected-orders-modal-alert-cancel-button'
            }
          }, {
            text: translate("Download"),
            htmlAttributes: {
              'data-testid': 'download-rejected-orders-modal-alert-download-button'
            },
            handler: async () => {
              await modalController.dismiss({ dismissed: true });
              await alert.dismiss();
              emitter.emit("presentLoader", { message: "Preparing file to downlaod...", backdropDismiss: true });

              const selectedFields = this.selectedFields.filter((field) => field.value) as any;
              const rejectedItems = await this.bulkFetchRejectedItems();
              const facilityDetail = await this.fetchFacilityDetail();
              
              const downloadData = await Promise.all(rejectedItems.map(async (item: any) => {
                const product = this.getProduct(item.productId)
            
                if (product) {
                  const rejectedItemDetails = selectedFields.reduce((details: any, field: any) => {
                    if (field.name === 'rejectedAt') {
                      details[field.name] = getDateWithOrdinalSuffix(DateTime.fromISO(item.rejectedAt).toMillis());
                    } else if (field.name === 'primaryProductId') {
                      details[field.name] = getProductIdentificationValue(this.selectedPrimaryProductId, product);
                    } else if (field.name === 'secondaryProductId') {
                      details[field.name] = getProductIdentificationValue(this.selectedSecondaryProductId, product);
                    } else if (field.name === 'rejectedFrom') {
                      details[field.name] = facilityDetail[this.selectedFacilityId];
                    } else {
                      details[field.name] = item[field.name];
                    }
                    return details;
                  }, {});
                
                  return rejectedItemDetails;
                }      
              }));

              const fileName = `RejectedOrders-${this.currentFacility.facilityId}-${DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}.csv`
              await jsonToCsv(downloadData, { download: true, name: fileName });
              emitter.emit("dismissLoader")
            }
          }]
        });
        return alert.present();
      },
      async bulkFetchRejectedItems() {
        const rejectedOrderQuery = this.rejectedOrders.query
        const filters = {
          rejectedFrom_txt_en: { value: escapeSolrSpecialChars(this.currentFacility.facilityId) },
        } as any

        //when user search the rejected results are not bound to time duration
        if (!rejectedOrderQuery.queryString) {
          let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
          if (rejectedOrderQuery.rejectionPeriodId === 'LAST_SEVEN_DAYS') {
            rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
          }
          filters.rejectedAt_dt = {value: rejectionPeriodFilter}
        }
        if (rejectedOrderQuery.rejectionReasons.length) {
          filters.rejectionReasonId_s = {value: rejectedOrderQuery.rejectionReasons}
        }

        const query = prepareSolrQuery({
          coreName: "logInsights",
          docType: "FULFILLMENT_REJECTION",
          queryString: rejectedOrderQuery.queryString,
          queryFields: 'orderId_s itemDescription_txt_en productId_s rejectedFrom_txt_en rejectedBy_txt_en rejectionReasonId_txt_en rejectionReasonDesc_txt_en',
          viewIndex: 0,
          viewSize: 100,
          sort: 'rejectedAt_dt desc',
          isGroupingRequired: true,
          groupBy: 'orderId_s',
          filters
        })

        let allItems = [] as any;
        let resp;

        try {
          do {
            resp = await RejectionService.fetchRejctedOrders(query);
            if (!hasError(resp)) {
              let orders = resp.data.grouped.orderId_s.groups

              orders = orders.map((order: any) => {
                const orderItemDocs = order.doclist.docs.map((doc: any) => {
                  return {
                    orderId: doc.orderId_s,
                    orderItemSeqId: doc.orderItemSeqId_s,
                    itemDescription: doc.itemDescription_txt_en,
                    productId: doc.productId_s,
                    availableToPromise: doc.availableToPromise_d,
                    rejectedFrom: order.rejectedFrom_txt_en,
                    rejectedBy: doc.rejectedBy_txt_en,
                    rejectedAt: doc.rejectedAt_dt,
                    rejectionReasonId: doc.rejectionReasonId_txt_en,
                    rejectionReasonDesc: doc.rejectionReasonDesc_txt_en,
                    brokeredAt: doc.brokeredAt_dt,
                    brokeredBy: doc.brokeredBy_txt_en,
                  };
                });
                allItems = allItems.concat(orderItemDocs);
                this.store.dispatch("product/fetchProducts", { productIds: [... new Set(orderItemDocs.map((item: any) => item.productId))] });
              });
              query.viewIndex++;
            } else {
                throw resp.data;
            }
          } while (resp.data.grouped.orderId_s.groups.length >= query.viewSize);
        } catch (err) {
          logger.error(err);
          return [];
        }
        return allItems
      },
      async fetchFacilityDetail() {
        let facilityDetail  = {} as any;
        try {
          const payload = {
            "facilityId": this.currentFacility.facilityId,
            "fieldsToSelect": ["facilityId", "facilityName", "externalId"],
            "pageSize": 1
          }

          const resp = await UtilService.fetchFacilities(payload)

          if (!hasError(resp)) {
            facilityDetail = resp.data[0]
          } else {
            throw resp.data
          }
        } catch (err) {
          logger.error('Failed to fetch facilities', err)
        }
        return facilityDetail;
      }
    },
    setup() {
      const store = useStore()
      const userStore = useUserStore()
      const productIdentificationStore = useProductIdentificationStore();
      let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
      let currentFacility: any = computed(() => userStore.getCurrentFacility) 
  
  
      return {
        closeOutline,
        cloudDownloadOutline,
        getProductIdentificationValue,
        productIdentificationPref,
        store,
        translate,
        currentFacility
      }
    }
  });
  </script>
