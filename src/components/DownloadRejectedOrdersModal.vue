<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal"> 
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
            <ion-checkbox justify="start" label-placement="end" v-model="selectedField.value" :checked="selectedField.value" :disabled="selectedField.disabled">{{ translate(selectedField.description) }}</ion-checkbox>
            <ion-select aria-label="primaryProduct" interface="popover" value="default" slot="end" v-model="selectedPrimaryProductId">
              <ion-select-option v-for="(value, identificationsType) in productIdentifications" :key="identificationsType" :value="value">{{ identificationsType }}</ion-select-option>
            </ion-select>
          </template>
          <template v-else-if="selectedField.name === 'secondaryProductId'">
            <ion-checkbox justify="start" label-placement="end" v-model="selectedField.value" :checked="selectedField.value" :disabled="selectedField.disabled">{{ translate(selectedField.description) }}</ion-checkbox>
            <ion-select aria-label="primaryProduct" interface="popover" value="default" slot="end" v-model="selectedSecondaryProductId">
              <ion-select-option v-for="(value, identificationsType) in productIdentifications" :key="identificationsType" :value="value">{{ identificationsType }}</ion-select-option>
            </ion-select>
          </template>
          <template v-else-if="selectedField.name === 'rejectedFrom'">
            <ion-checkbox justify="start" label-placement="end" v-model="selectedField.value" :checked="selectedField.value" :disabled="selectedField.disabled">{{ translate("Facility") }}</ion-checkbox>
            <ion-select aria-label="facilityField" interface="popover" v-model="selectedFacilityId" slot="end">
              <ion-select-option value="facilityId">Internal ID</ion-select-option>
              <ion-select-option value="externalId">External ID</ion-select-option>
            </ion-select>
          </template>
          <template v-else>
            <ion-checkbox justify="start" label-placement="end" @ionChange="selectField(selectedField.name)" :checked="selectedField.value" :disabled="selectedField.disabled">{{ translate(selectedField.description) }}</ion-checkbox>
          </template>
        </ion-item>
      </ion-list>
    </ion-content>
  
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="downloadCSV">
        <ion-icon :icon="cloudDownloadOutline" />
      </ion-fab-button>
    </ion-fab>
  </template>
  
  <script setup lang="ts">
  import { IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonSelect, IonSelectOption, IonTitle, IonToolbar, modalController, alertController } from "@ionic/vue";
  import { computed, ref } from "vue";
  import { closeOutline, cloudDownloadOutline } from "ionicons/icons";
  import { getProductIdentificationValue, translate, useUserStore as useDxpUserStore } from "@hotwax/dxp-components";
  import { escapeSolrSpecialChars, prepareSolrQuery } from "@/utils/solrHelper";
  import { RejectionService } from "@/services/RejectionService";
  import { UtilService } from "@/services/UtilService";
  import { hasError } from "@/adapter";
  import logger from "@/logger";
  import emitter from "@/event-bus";
  import { getDateWithOrdinalSuffix, jsonToCsv } from "@/utils";
  import { DateTime } from "luxon";
  import { useProductStore } from "@/store/product";
  import { useRejectionStore } from "@/store/rejection";
  const currentFacility = computed(() => useDxpUserStore().getCurrentFacility);
  const rejectedOrders = computed(() => useRejectionStore().getRejectedOrders);
  const getProduct = (productId: string) => useProductStore().getProduct(productId);
  
  const selectedFacilityId = ref("facilityId");
  const selectedPrimaryProductId = ref("productId");
  const selectedSecondaryProductId = ref("productId");
  const selectedFields = ref([
    { name: "orderId", value: true, description: "Order ID", disabled: true },
    { name: "orderItemSeqId", value: true, description: "Order item sequence ID", disabled: true },
    { name: "itemDescription", value: true, description: "Item description", disabled: false },
    { name: "rejectedFrom", value: true, description: "Rejected from", disabled: true },
    { name: "primaryProductId", value: true, description: "Primary product ID", disabled: true },
    { name: "secondaryProductId", value: true, description: "Secondary product ID", disabled: false },
    { name: "availableToPromise", value: true, description: "Available to promise", disabled: false },
    { name: "rejectedBy", value: true, description: "Rejected by", disabled: false },
    { name: "rejectedAt", value: true, description: "Rejected at", disabled: false },
    { name: "rejectionReasonId", value: true, description: "Rejection reason ID", disabled: false },
    { name: "rejectionReasonDesc", value: true, description: "Rejection reason description", disabled: false },
    { name: "brokeredAt", value: true, description: "Brokered at", disabled: false },
    { name: "brokeredBy", value: true, description: "Brokered by", disabled: false }
  ]);
  const productIdentifications = ref({
    "Internal ID": "productId",
    "Internal Name": "internalName",
    "SKU": "SKU",
    "UPC": "UPCA"
  });
  
  const closeModal = () => {
    modalController.dismiss({ dismissed: true });
  };
  
  const selectField = (fieldName: string) => {
    const selectedField = selectedFields.value.find((field) => field.name === fieldName);
    if (selectedField) {
      selectedField.value = selectedField.value ? false : true;
    }
  };
  
  const fetchFacilityDetail = async () => {
    let facilityDetail = {} as any;
    try {
      const payload = {
        facilityId: currentFacility.value.facilityId,
        fieldsToSelect: ["facilityId", "facilityName", "externalId"],
        pageSize: 1
      };
  
      const resp = await UtilService.fetchFacilities(payload);
  
      if (!hasError(resp)) {
        facilityDetail = resp.data[0];
      } else {
        throw resp.data;
      }
    } catch (err) {
      logger.error("Failed to fetch facilities", err);
    }
    return facilityDetail;
  };
  
  const bulkFetchRejectedItems = async () => {
    const rejectedOrderQuery = rejectedOrders.value.query;
    const filters = {
      rejectedFrom_txt_en: { value: escapeSolrSpecialChars(currentFacility.value.facilityId) }
    } as any;
  
    if (!rejectedOrderQuery.queryString) {
      let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]";
      if (rejectedOrderQuery.rejectionPeriodId === "LAST_SEVEN_DAYS") {
        rejectionPeriodFilter = "[NOW-7DAYS TO NOW]";
      }
      filters.rejectedAt_dt = { value: rejectionPeriodFilter };
    }
    if (rejectedOrderQuery.rejectionReasons.length) {
      filters.rejectionReasonId_s = { value: rejectedOrderQuery.rejectionReasons };
    }
  
    const query = prepareSolrQuery({
      coreName: "logInsights",
      docType: "FULFILLMENT_REJECTION",
      queryString: rejectedOrderQuery.queryString,
      queryFields: "orderId_s itemDescription_txt_en productId_s rejectedFrom_txt_en rejectedBy_txt_en rejectionReasonId_txt_en rejectionReasonDesc_txt_en",
      viewIndex: 0,
      viewSize: 100,
      sort: "rejectedAt_dt desc",
      isGroupingRequired: true,
      groupBy: "orderId_s",
      filters
    });
  
    let allItems = [] as any;
    let resp;
  
    try {
      do {
        resp = await RejectionService.fetchRejctedOrders(query);
        if (!hasError(resp)) {
          let orders = resp.data.grouped.orderId_s.groups;
  
          await Promise.all(orders.map(async (order: any) => {
            const orderItemDocs = order.doclist.docs.map((doc: any) => ({
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
              brokeredBy: doc.brokeredBy_txt_en
            }));
            allItems = allItems.concat(orderItemDocs);
            await useProductStore().fetchProducts({ productIds: [...new Set(orderItemDocs.map((item: any) => item.productId))] });
          }));
          query.viewIndex++;
        } else {
          throw resp.data;
        }
      } while (resp.data.grouped.orderId_s.groups.length >= query.viewSize);
    } catch (err) {
      logger.error(err);
      return [];
    }
    return allItems;
  };
  
  const downloadCSV = async () => {
    const alert = await alertController.create({
      header: translate("Download rejected orders"),
      message: translate("Are you sure you want to download the rejected orders?"),
      buttons: [
        { text: translate("Cancel"), role: "cancel" },
        {
          text: translate("Download"),
          handler: async () => {
            await modalController.dismiss({ dismissed: true });
            await alert.dismiss();
            emitter.emit("presentLoader", { message: "Preparing file to downlaod...", backdropDismiss: true });
  
            const selected = selectedFields.value.filter((field) => field.value) as any;
            const rejectedItems = await bulkFetchRejectedItems();
            const facilityDetail = await fetchFacilityDetail();
  
            const downloadData = await Promise.all(rejectedItems.map(async (item: any) => {
              const product = getProduct(item.productId);
  
              if (product) {
                const rejectedItemDetails = selected.reduce((details: any, field: any) => {
                  if (field.name === "rejectedAt") {
                    details[field.name] = getDateWithOrdinalSuffix(DateTime.fromISO(item.rejectedAt).toMillis());
                  } else if (field.name === "primaryProductId") {
                    details[field.name] = getProductIdentificationValue(selectedPrimaryProductId.value, product);
                  } else if (field.name === "secondaryProductId") {
                    details[field.name] = getProductIdentificationValue(selectedSecondaryProductId.value, product);
                  } else if (field.name === "rejectedFrom") {
                    details[field.name] = facilityDetail[selectedFacilityId.value];
                  } else {
                    details[field.name] = item[field.name];
                  }
                  return details;
                }, {});
  
                return rejectedItemDetails;
              }
            }));
  
            const fileName = `RejectedOrders-${currentFacility.value.facilityId}-${DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}.csv`;
            await jsonToCsv(downloadData, { download: true, name: fileName });
            emitter.emit("dismissLoader");
          }
        }
      ]
    });
    return alert.present();
  };
  </script>
