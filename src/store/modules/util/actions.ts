import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import logger from '@/logger'
import store from '@/store';
import { showToast, getProductStoreId } from '@/utils'
import { translate, useUserStore } from '@hotwax/dxp-components'
import { getCurrentFacilityId } from '@/utils';

const actions: ActionTree<UtilState, RootState> = {
  async fetchRejectReasons({ commit }) {
    let rejectReasons  = [];
    try {
      const payload = {
        parentTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
        parentTypeId_op: "in",
        pageSize: 20, // keeping view size 20 as considering that we will have max 20 reasons
        orderByField: "sequenceNum"
      }

      const resp = await UtilService.fetchRejectReasons(payload)
      if(!hasError(resp)) {
        rejectReasons = resp.data
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch reject reasons', err)
    }

    commit(types.UTIL_REJECT_REASONS_UPDATED, rejectReasons)
  },
  
  async fetchRejectReasonOptions({ commit, dispatch, state }) {
    const permissions = store.getters['user/getUserPermissions'];

    const isAdminUser = permissions.some((permission: any) => permission.action === "APP_STOREFULFILLMENT_ADMIN")
    const isApiSuccess = isAdminUser ? await dispatch("fetchRejectReasons") : await dispatch("fetchFulfillmentRejectReasons", true)

    commit(types.UTIL_REJECT_REASON_OPTIONS_UPDATED, ((!isAdminUser && isApiSuccess) ? Object.values(state.fulfillmentRejectReasons) : state.rejectReasons ));
  },

  // @param fetchRestrictedRejReasons - Defined whether to fetch restricted group enums or not, defined as the same action is used for managing group from rej reasons page
  async fetchFulfillmentRejectReasons({ commit, dispatch }, fetchRestrictedRejReasons = false) {
    let isApiSuccess = true;
    let fulfillmentRejectReasons  = {}  as any;
    try {
      const payload = {
        enumerationGroupId: fetchRestrictedRejReasons ? ["FF_REJ_RSN_GRP", "FF_REJ_RSN_RES_GRP"] : ["FF_REJ_RSN_GRP"],  // FF_REJ_RSN_RES_GRP, Fulfillment restricted rejection reason group
        enumerationGroupId_op: "in",
        pageSize: 200,
        orderByField: "sequenceNum"
      }

      const resp = await UtilService.fetchFulfillmentRejectReasons(payload)

      if(!hasError(resp)) {
        const rejectionsReasons = resp.data.filter((reason: any) => !reason.thruDate).reduce((rejReasons: any, reason: any) => {
          rejReasons[reason.enumerationGroupId][reason.enumId] = reason
          return rejReasons;
        }, {
          FF_REJ_RSN_GRP: {},
          FF_REJ_RSN_RES_GRP: {}
        })

        // If the restricted group has rejection reasons and the facility is not of type warehouse then display restricted rejection reasons otherwise display the reasons from the default rejection reason group
        fulfillmentRejectReasons = (useUserStore().getCurrentFacility as any).facilityTypeId === "WAREHOUSE" && Object.keys(rejectionsReasons["FF_REJ_RSN_RES_GRP"]).length ? rejectionsReasons["FF_REJ_RSN_RES_GRP"] : rejectionsReasons["FF_REJ_RSN_GRP"]
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch fulfillment reject reasons', err)
      // Fetching all rejection reasons if the api fails due to no entity found.
      // Todo: remove this once all the oms are updated.
      await dispatch("fetchRejectReasons");
      isApiSuccess = false;
    }

    commit(types.UTIL_FULFILLMENT_REJECT_REASONS_UPDATED, fulfillmentRejectReasons)
    return isApiSuccess
  },

  async fetchRejectReasonEnumTypes({ commit, state }) {
    if(state.rejectReasonEnumTypes.length) {
      return;
    }

    let rejectReasonEnumTypes = [] as any;

    try {
      const params = {
        parentTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
        parentTypeId_op: "in",
        pageIndex: 0,
        pageSize: 10
      }

      const resp = await UtilService.fetchRejectReasonEnumTypes(params)
      if (!hasError(resp)) {
        rejectReasonEnumTypes = resp.data
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error(err)
    }
    commit(types.UTIL_REJECT_REASON_ENUM_TYPES_UPDATED, rejectReasonEnumTypes)
  },

  async fetchPartyInformation({ commit, state }, partyIds) {
    let partyInformation = JSON.parse(JSON.stringify(state.partyNames))
    const cachedPartyIds = Object.keys(partyInformation);
    const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

    if(!ids.length) return partyInformation;

    try {
      const payload = {
        partyId: ids,
        partyId_op: "in",
        fieldsToSelect: ["firstName", "middleName", "lastName", "groupName", "partyId"],
        pageSize: ids.length
      }

      const resp = await UtilService.fetchPartyInformation(payload);

      if (!hasError(resp)) {
        const partyResp = {} as any
        resp.data.map((partyInformation: any) => {

          let partyName = ''
          if(partyInformation.groupName) {
            partyName = partyInformation.groupName
          } else {
            partyName = [partyInformation.firstName, partyInformation.lastName].join(' ')
          }

          partyResp[partyInformation.partyId] = partyName
        })

        partyInformation = {
          ...partyInformation,
          ...partyResp
        }

        commit(types.UTIL_PARTY_NAMES_UPDATED, partyInformation)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching party information', err)
    }

    return partyInformation;
  },

  async fetchCarrierShipmentBoxTypes({ commit, dispatch }) {
    try {
      const shipmentBoxTypeDesc = {} as any;
      const resp = await UtilService.fetchCarrierShipmentBoxTypes({
        pageIndex: 0,
        pageSize: 100, //considerting there won't be more than 100 carrier shipment box types
        fieldsToSelect: ["shipmentBoxTypeId", "partyId"]
      });

      const shipmentBoxTypeIds = new Set();

      if (!hasError(resp)) {
        const shipmentBoxTypeDetail = resp.data.reduce((shipmentBoxTypes: any, carrierShipmentBoxType: any) => {
          shipmentBoxTypeIds.add(carrierShipmentBoxType.shipmentBoxTypeId)
          if (shipmentBoxTypes[carrierShipmentBoxType.partyId]) {
            shipmentBoxTypeDesc[carrierShipmentBoxType.shipmentBoxTypeId] = carrierShipmentBoxType?.shipmentBoxType?.description
            shipmentBoxTypes[carrierShipmentBoxType.partyId].push({shipmentBoxTypeId: carrierShipmentBoxType.shipmentBoxTypeId, description: carrierShipmentBoxType?.shipmentBoxType?.description})
          } else {
            shipmentBoxTypeDesc[carrierShipmentBoxType.shipmentBoxTypeId] = carrierShipmentBoxType?.shipmentBoxType?.description
            shipmentBoxTypes[carrierShipmentBoxType.partyId] = [{shipmentBoxTypeId: carrierShipmentBoxType.shipmentBoxTypeId, description: carrierShipmentBoxType?.shipmentBoxType?.description}]
          }
          return shipmentBoxTypes
        }, {})

        commit(types.UTIL_SHIPMENT_BOXES_UPDATED, shipmentBoxTypeDesc)
        commit(types.UTIL_CARRIER_SHIPMENT_BOX_TYPES_UPDATED, shipmentBoxTypeDetail)
      } else {
        throw resp.data;
      }
    } catch(err) {
      logger.error('Failed to fetch carrier shipment box type information', err)
    }
  },

  async fetchShipmentMethodTypeDesc({ commit, state }, shipmentMethodTypeIds) {
    let shipmentMethodTypeDesc = JSON.parse(JSON.stringify(state.shipmentMethodTypeDesc))
    const cachedShipmentMethodTypeIds = Object.keys(shipmentMethodTypeDesc);
    const ids = shipmentMethodTypeIds.filter((shipmentMethodTypeId: string) => !cachedShipmentMethodTypeIds.includes(shipmentMethodTypeId))

    if (!ids.length) return shipmentMethodTypeDesc;

    try {
      
      const payload = {
        shipmentMethodTypeId: ids,
        shipmentMethodTypeId_op: "in",
        fieldsToSelect: ["shipmentMethodTypeId", "description"],
        pageSize: ids.length
      }
      
      const resp = await UtilService.fetchShipmentMethodTypeDesc(payload);

      if (!hasError(resp)) {
        const shipmentMethodResp = {} as any
        resp.data.map((shipmentMethodInformation: any) => {
          shipmentMethodResp[shipmentMethodInformation.shipmentMethodTypeId] = shipmentMethodInformation.description
        })

        shipmentMethodTypeDesc = {
          ...shipmentMethodTypeDesc,
          ...shipmentMethodResp
        }

        commit(types.UTIL_SHIPMENT_METHODS_UPDATED, shipmentMethodTypeDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching shipment description', err)
    }

    return shipmentMethodTypeDesc;
  },

  async fetchFacilityTypeInformation({ commit, state }, facilityTypeIds) {
    const facilityTypeDesc = JSON.parse(JSON.stringify(state.facilityTypeDesc))

    const cachedFacilityTypeIds = Object.keys(facilityTypeDesc);
    const facilityTypeIdFilter = [...new Set(facilityTypeIds.filter((facilityTypeId: any) => !cachedFacilityTypeIds.includes(facilityTypeId)))]

    // If there are no facility types to fetch skip the API call
    if (!facilityTypeIdFilter.length) return;

    const payload = {
      facilityTypeId: facilityTypeIds,
      facilityTypeId_op: 'in',
      pageSize: facilityTypeIds.length,
      fieldsToSelect: ["facilityTypeId", "typeDescription"]
    }

    try {
      const resp = await UtilService.fetchFacilityTypeInformation(payload);

      if(!hasError(resp) && resp.data?.length > 0) {
        resp.data.map((facilityType: any) => { 
          facilityTypeDesc[facilityType.facilityTypeId] = facilityType['typeDescription'] 
        })

        commit(types.UTIL_FACILITY_TYPE_UPDATED, facilityTypeDesc)
      } else {
        throw resp.data;
      }
    } catch(err) {
      logger.error('Failed to fetch description for facility types', err)
    }
  },
  async fetchPaymentMethodTypeDesc({ commit, state }, paymentMethodTypeIds) {
    let paymentMethodTypeDesc = JSON.parse(JSON.stringify(state.paymentMethodTypeDesc))
    const cachedPaymentMethodTypeIds = Object.keys(paymentMethodTypeDesc);
    const ids = paymentMethodTypeIds.filter((paymentMethodTypeId: string) => !cachedPaymentMethodTypeIds.includes(paymentMethodTypeId))

    if(!ids.length) return paymentMethodTypeDesc;

    try {
      const payload = {
        paymentMethodTypeId: ids,
        paymentMethodTypeId_op: "in",
        fieldsToSelect: ["paymentMethodTypeId", "description"],
        pageSize: ids.length
      }

      const resp = await UtilService.fetchPaymentMethodTypeDesc(payload);

      if(!hasError(resp)) {
        const paymentMethodResp = {} as any
        resp.data.map((paymentMethodType: any) => {
          paymentMethodResp[paymentMethodType.paymentMethodTypeId] = paymentMethodType.description
        })

        paymentMethodTypeDesc = {
          ...paymentMethodTypeDesc,
          ...paymentMethodResp
        }

        commit(types.UTIL_PAYMENT_METHODS_UPDATED, paymentMethodTypeDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching payment method description', err)
    }

    return paymentMethodTypeDesc;
  },
  async fetchStatusDesc({ commit, state }, statusIds) {
    let statusDesc = JSON.parse(JSON.stringify(state.statusDesc))
    const cachedStatusIds = Object.keys(statusDesc);
    const ids = statusIds.filter((statusId: string) => !cachedStatusIds.includes(statusId))

    if(!ids.length) return statusDesc;

    try {
      const payload = {
        statusId: ids,
        statusId_op: "in",
        fieldsToSelect: ["statusId", "description"],
        pageSize: ids.length
      }

      const resp = await UtilService.fetchStatusDesc(payload);

      if(!hasError(resp)) {
        const statusResp = {} as any
        resp.data.map((statusItem: any) => {
          statusResp[statusItem.statusId] = statusItem.description
        })

        statusDesc = {
          ...statusDesc,
          ...statusResp
        }

        commit(types.UTIL_STATUS_UPDATED, statusDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching status description', err)
    }

    return statusDesc;
  },

  async findProductStoreShipmentMethCount({ commit }) {
    let productStoreShipmentMethCount = 0
    const params = {
      "partyId": "_NA_",
      "partyId_op": "equals",
      "partyId_not": "Y",
      "roleTypeId": "CARRIER",
      "productStoreId": getProductStoreId(),
      "fieldsToSelect": ['roleTypeId', "partyId"],
      "pageSize": 1
    }

    try {
      const resp = await UtilService.findProductStoreShipmentMethCount(params);

      if(!hasError(resp)) {
        productStoreShipmentMethCount = resp.data[0]?.shipmentMethodCount
      } else {
        throw resp?.data
      }
    } catch(err) {
      logger.error('Failed to find shipment method count for product store', err)
    }

    commit(types.UTIL_PRODUCT_STORE_SHIPMENT_METH_COUNT_UPDATED, productStoreShipmentMethCount)
  },
  
  async fetchEnumerations({ commit, state }, ids) {
    let enumerations = JSON.parse(JSON.stringify(state.enumerations)) as any

    const enumIds = ids.filter((enumId: string) => !enumerations[enumId])

    if(!enumIds.length) {
      return;
    }

    try {
      const payload = {
        enumId: enumIds,
        enumId_op: "in",
        pageSize: enumIds.length,
        fieldsToSelect: ["enumId", "description"],
      }

      const resp = await UtilService.fetchEnumeration(payload)
      if (!hasError(resp)) {
        enumerations = resp.data.reduce((enums: any, enumeration: any) => {
          enums[enumeration.enumId] = enumeration.description
          return enums;
        }, enumerations)
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error(err)
    }

    commit(types.UTIL_ENUMERATIONS_UPDATED, enumerations)
  },

  async updateRejectReasons({ commit }, payload) {
    commit(types.UTIL_REJECT_REASONS_UPDATED, payload)
  },

  async fetchFacilities({ commit }) {
    let facilities  = [];
    try {
      const payload = {
        "parentTypeId": "VIRTUAL_FACILITY",
        "parentTypeId_op": "equals",
        "parentTypeId_not": "Y",
        "facilityTypeId": "VIRTUAL_FACILITY",
        "facilityTypeId_op": "equals",
        "facilityTypeId_not": "Y",
        "pageSize": 250 // keeping view size 250 as considering that we will have max 100 facilities
      }

      const resp = await UtilService.fetchFacilities(payload)

      if (!hasError(resp)) {
        facilities = resp.data
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch facilities', err)
    }
    commit(types.UTIL_FACILITIES_UPDATED, facilities)
  },

  async fetchProductStores({ commit }) {
    let stores  = [];
    try {
      const payload = {
        fieldsToSelect: ['productStoreId', "storeName"],
        pageSize: 250 // keeping view size 250 as considering that we will have max 250 product stores
      }

      const resp = await UtilService.fetchProductStores(payload)
      if (!hasError(resp)) {
        stores = resp.data
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch product stores', err)
    }
    commit(types.UTIL_PRODUCT_STORES_UPDATED, stores)
  },
  
  async getForceScanSetting({ commit, dispatch }, eComStoreId) {
    const payload = {
      productStoreId: eComStoreId,
      settingTypeEnumId: "FULFILL_FORCE_SCAN",
      fieldsToSelect: ["settingValue", "settingTypeEnumId"],
      pageSize: 1
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if (!hasError(resp)) {
        const respValue = resp.data[0]?.settingValue === "true"
        commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, respValue)
      } else {
        dispatch('createForceScanSetting');
      }
    } catch(err) {
      console.error(err)
      commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, false)
    }
  },

  async createForceScanSetting({ commit }) {
    let isSettingExists = false

    try {
      if(!await UtilService.isEnumExists("FULFILL_FORCE_SCAN")) {
        const resp = await UtilService.createEnumeration({
          "enumId": "FULFILL_FORCE_SCAN",
          "enumTypeId": "PROD_STR_STNG",
          "description": "Impose force scanning of items while packing from fulfillment app",
          "enumName": "Fulfillment Force Scan",
          "enumCode": "FULFILL_FORCE_SCAN"
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      const params = {
        "productStoreId": getProductStoreId(),
        "settingTypeEnumId": "FULFILL_FORCE_SCAN",
        "settingValue": "false"
      }

      await UtilService.createForceScanSetting(params) as any
      isSettingExists = true
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a scan setting
    commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, false)
    return isSettingExists;
  },

  async setForceScanSetting({ commit, dispatch, state }, value) {
    let prefValue = state.isForceScanEnabled
    const eComStoreId: any = getProductStoreId();

    // when selecting none as ecom store, not updating the pref as it's not possible to save pref with empty productStoreId
    if(!eComStoreId) {
      showToast(translate("Unable to update force scan preference."))
      commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, prefValue)
      return;
    }

    let isSettingExists = false;

    try {
      const resp = await UtilService.getProductStoreSetting({
          productStoreId: eComStoreId,
          settingTypeEnumId: "FULFILL_FORCE_SCAN",
          fieldsToSelect: ["settingTypeEnumId"],
          pageSize: 1
      }) as any
      if(!hasError(resp) && resp.data[0]?.settingTypeEnumId) {
        isSettingExists = true
      }
    } catch(err) {
      console.error(err)
    }

    if(!isSettingExists) {
      isSettingExists = await dispatch("createForceScanSetting");
    }

    if(!isSettingExists) {
      showToast(translate("Failed to update force scan preference."))
      commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, prefValue)
      return;
    }

    const params = {
      "productStoreId": eComStoreId,
      "settingTypeEnumId": "FULFILL_FORCE_SCAN",
      "settingValue": `${value}`
    }

    try {
      const resp = await UtilService.updateForceScanSetting(params) as any

      if ((!hasError(resp))) {
        showToast(translate("Force scan preference updated successfully."))
        prefValue = value
      } else {
        throw resp.data;
      }
    } catch(err) {
      showToast(translate("Failed to update force scan preference."))
      console.error(err)
    }
    commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, prefValue)
  },

  async fetchBarcodeIdentificationPref({ commit, dispatch }, eComStoreId) {
    const payload = {
      productStoreId: eComStoreId,
      settingTypeEnumId: "BARCODE_IDEN_PREF",
      fieldToSelect: ["settingValue", "settingTypeEnumId"],
      pageSize: 1
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if(!hasError(resp)) {
        const respValue = resp.data[0].settingValue
        commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, respValue)
      } else {
        dispatch("createBarcodeIdentificationPref");
      }
    } catch(err) {
      console.error(err)
      commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, "internalName")
    }
  },

  async createBarcodeIdentificationPref({ commit }) {
    let isSettingExists = false;

    try {
      if(!await UtilService.isEnumExists("BARCODE_IDEN_PREF")) {
        const resp = await UtilService.createEnumeration({
          "enumId": "BARCODE_IDEN_PREF",
          "enumTypeId": "PROD_STR_STNG",
          "description": "Identification preference to be used for scanning items.",
          "enumName": "Barcode Identification Preference",
          "enumCode": "BARCODE_IDEN_PREF"
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      const params = {
        "productStoreId": getProductStoreId(),
        "settingTypeEnumId": "BARCODE_IDEN_PREF",
        "settingValue": "internalName"
      }  

      await UtilService.createBarcodeIdentificationPref(params) as any
      isSettingExists = true
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a store setting
    commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, "internalName")
    return isSettingExists;
  },

  async setBarcodeIdentificationPref({ commit, dispatch, state }, value) {
    let prefValue = state.barcodeIdentificationPref
    const eComStoreId = getProductStoreId()

    // when selecting none as ecom store, not updating the pref as it's not possible to save pref with empty productStoreId
    if(!eComStoreId) {
      showToast(translate("Unable to update barcode identification preference since no product store config found."))
      commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, prefValue)
      return;
    }

    let isSettingExists = false;

    try {
      const resp = await UtilService.getProductStoreSetting({
        "productStoreId": eComStoreId,
        "settingTypeEnumId": "BARCODE_IDEN_PREF",
        "fieldsToSelect": ["settingTypeEnumId"],
        "pageSize": 1
      }) as any
      if(!hasError(resp) && resp.data[0]?.settingTypeEnumId) {
        isSettingExists = true 
      }
    } catch(err) {
      console.error(err)
    }

    if(!isSettingExists) {
      isSettingExists = await dispatch("createBarcodeIdentificationPref");
    }

    if(!isSettingExists) {
      showToast(translate("Failed to update barcode identification preference."))
      commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, prefValue)
      return;
    }

    const params = {
      "productStoreId": eComStoreId,
      "settingTypeEnumId": "BARCODE_IDEN_PREF",
      "settingValue": value
    }

    try {
      const resp = await UtilService.updateBarcodeIdentificationPref(params) as any

      if((!hasError(resp))) {
        showToast(translate("Barcode identification preference updated successfully."))
        prefValue = value
      } else {
        throw resp.data;
      }
    } catch(err) {
      showToast(translate("Failed to update barcode identification preference."))
      console.error(err)
    }
    commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, prefValue)
  },
  
  async updateForceScanStatus({ commit }, payload) { 
    commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, payload)
  },

  async updateBarcodeIdentificationPref({ commit }, payload) { 
    commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, payload)
  },
  
  async fetchCarriersDetail ({ commit, state }) {
    if(Object.keys(state.carrierDesc)?.length) return;
    const carrierDesc = {} as any;

    try {
      const resp = await UtilService.fetchCarriers({
        "roleTypeId": "CARRIER",
        "fieldsToSelect": ["partyId", "partyTypeId", "roleTypeId", "firstName", "lastName", "groupName"],
        "distinct": "Y",
        "pageSize": 20
      });

      if (!hasError(resp)) {
        resp.data.map((carrier: any) => {
          const personName = [carrier.firstName, carrier.lastName].filter(Boolean).join(' ');
          carrierDesc[carrier.partyId] = carrier.partyTypeId === "PERSON"? (personName || carrier.groupName || carrier.partyId): (carrier.groupName || carrier.partyId);
        })
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error("error", err);
    }
    commit(types.UTIL_CARRIER_DESC_UPDATED, carrierDesc)
  },

  async fetchStoreCarrierAndMethods({ commit }) {
    let shipmentMethodsByCarrier = {};

    try {
      const payload = {
        customParametersMap:{
          "productStoreId": getProductStoreId(),
          "roleTypeId": "CARRIER",
          "shipmentMethodTypeId": "STOREPICKUP",
          "shipmentMethodTypeId_op": "equals",
          "shipmentMethodTypeId_not": "Y",
          pageIndex: 0,
          pageSize: 100
        },
        dataDocumentId: "ProductStoreShipmentMethod",
        filterByDate: true
      }

      const resp = await UtilService.fetchStoreCarrierAndMethods(payload);

      if(!hasError(resp)) {
        const storeCarrierAndMethods = resp.data.entityValueList;
        shipmentMethodsByCarrier = storeCarrierAndMethods.reduce((shipmentMethodsByCarrier: any, storeCarrierAndMethod: any) => {
          const { partyId, shipmentMethodTypeId, description } = storeCarrierAndMethod;

          if(!shipmentMethodsByCarrier[partyId]) shipmentMethodsByCarrier[partyId] = []
          // only push this shipment method if not already added
          if(!shipmentMethodsByCarrier[partyId].some((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)) {
            shipmentMethodsByCarrier[partyId].push({ shipmentMethodTypeId, description });
          }
          return shipmentMethodsByCarrier
        }, {})
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching status description', err)
    }
    commit(types.UTIL_SHPMNT_MTHD_BY_CARRIER_UPDATED, shipmentMethodsByCarrier)
  },

  async fetchFacilityAddresses ({ commit, state }, facilityIds) {
    const facilityAddresses = state.facilityAddresses ? JSON.parse(JSON.stringify(state.facilityAddresses)) : {}
    const addresses = [] as any;
    const remainingFacilityIds = [] as any;

    facilityIds.map((facilityId: string) => {
      facilityAddresses[facilityId] ? addresses.push(facilityAddresses[facilityId]) : remainingFacilityIds.push(facilityId)
    })

    if(!remainingFacilityIds?.length) return addresses;

    try {
      const responses = await Promise.all(
        remainingFacilityIds.map((facilityId:any) =>
          UtilService.fetchFacilityAddresses({
            contactMechPurposeTypeId: "PRIMARY_LOCATION",
            contactMechTypeId: "POSTAL_ADDRESS",
            facilityId,
          })
        )
      ); 

      const hasFailedResponse = responses.some((response: any) => response.status === 'rejected')
      if (hasFailedResponse) {
        throw responses
      }

      responses.map((response: any) => {
        if(response.data?.facilityContactMechs?.length) {
          response.data.facilityContactMechs.map((facilityAddress: any) => {
            facilityAddresses[facilityAddress.facilityId] = facilityAddress;
            addresses.push(facilityAddress)
          })
        }
      })
    } catch (error) {
      logger.error(error);
    }
    commit(types.UTIL_FACILITY_ADDRESSES_UPDATED, facilityAddresses)
  },

  async clearUtilState ({ commit }) {
    commit(types.UTIL_CLEARED)
  },

  async fetchLabelImageType({ commit, state }, carrierId) {
    const facilityId = (useUserStore().getCurrentFacility as any).facilityId
    let labelImageType = "PNG"
    if(state.facilityShippingLabelImageType[facilityId]) {
      return state.facilityShippingLabelImageType[facilityId]
    }

    const isFacilityZPLConfigured = await UtilService.fetchFacilityZPLGroupInfo(facilityId);
    
    if(isFacilityZPLConfigured) {
      labelImageType = "ZPLII"
      commit(types.UTIL_FACILITY_SHIPPING_LABEL_IMAGE_TYPE_UPDATED, {
        labelImageType,
        facilityId
      })
      return labelImageType;
    }

    try {
      const resp = await UtilService.fetchLabelImageType(carrierId);

      if(hasError(resp) || !resp.data.length) {
        throw resp.data;
      }

      const labelImageType = resp?.data[0]?.systemPropertyValue;
      commit(types.UTIL_FACILITY_SHIPPING_LABEL_IMAGE_TYPE_UPDATED, {
        labelImageType,
        facilityId
      })
      return labelImageType;
    } catch (err) {
      logger.error("Failed to fetch label image type", err)
    }
  },

  async fetchProductStoreSettingPicklist({ commit }, eComStoreId) {
    let isPicklistDownloadEnabled = false
    const payload = {
      "productStoreId": eComStoreId,
      "settingTypeEnumId": "FF_DOWNLOAD_PICKLIST",
      "fieldsToSelect": ["settingTypeEnumId", "settingValue"],
      "pageSize": 1
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if (!hasError(resp) && resp.data?.length) {
        isPicklistDownloadEnabled = resp.data[0].settingValue == "true"
      }
    } catch(err) {
      logger.error(err)
    }
    commit(types.UTIL_PICKLIST_DOWNLOAD_STATUS_UPDATED, isPicklistDownloadEnabled)
  },
  async fetchExcludeOrderBrokerDays({ commit }, productStoreId) {
    let excludeOrderBrokerDays = undefined
    try {
      const resp = await UtilService.fetchExcludeOrderBrokerDays({
        "productStoreId": productStoreId,
        "settingTypeEnumId": "EXCLUDE_ODR_BKR_DAYS"
      })

      if (!hasError(resp) && resp.data[0]?.settingTypeEnumId && resp.data[0]?.settingValue !== null) {
        excludeOrderBrokerDays = Number(resp.data[0]?.settingValue)
      }
    } catch(err) {
      logger.error("Failed to get the exclude order broker days", err)
    }
    commit(types.UTIL_EXCLUDE_ORDER_BROKER_DAYS_UPDATED, excludeOrderBrokerDays)
  },

  async fetchAutoShippingLabelConfig({commit}) {
      let resp: any;
      try {     
        const currentFacility: any = getCurrentFacilityId();
        // 1. Check if current facility is part of Auto shipping group
        resp = await UtilService.getFacilityGroupAndMemberDetails({
          customParametersMap: {
            "facilityId": currentFacility,
            "facilityGroupId": "AUTO_SHIPPING_LABEL",
            pageIndex: 0,
            pageSize: 1
          },
          dataDocumentId: "FacilityGroupAndMember",
          filterByDate: true
        })
  
        if (!hasError(resp) && resp.data?.entityValueList?.length > 0) {
          commit(types.SET_AUTO_SHIPPING_LABEL_ENABLED, true);
        } else {
          commit(types.SET_AUTO_SHIPPING_LABEL_ENABLED, false);
        }
      } catch (err) {
        logger.error('Failed to check auto shipping label group', err);
        commit(types.SET_AUTO_SHIPPING_LABEL_ENABLED, false);
      }
  }

}

export default actions;
