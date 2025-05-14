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

const actions: ActionTree<UtilState, RootState> = {
  async fetchRejectReasons({ commit }) {
    let rejectReasons  = [];
    try {
      const payload = {
        "inputFields": {
          "parentEnumTypeId": ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          "parentEnumTypeId_op": "in"
        },
        "fieldList": ["description", "enumId", "enumName", "enumTypeId", "sequenceNum"],
        "distinct": "Y",
        "entityName": "EnumTypeChildAndEnum",
        "viewSize": 20, // keeping view size 20 as considering that we will have max 20 reasons
        "orderBy": "sequenceNum"
      }

      const resp = await UtilService.fetchRejectReasons(payload)

      if(!hasError(resp) && resp.data.count > 0) {
        rejectReasons = resp.data.docs
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
    const isApiSuccess = isAdminUser ? await dispatch("fetchRejectReasons") : await dispatch("fetchFulfillmentRejectReasons")

    commit(types.UTIL_REJECT_REASON_OPTIONS_UPDATED, ((!isAdminUser && isApiSuccess) ? Object.values(state.fulfillmentRejectReasons) : state.rejectReasons ));
  },

  async fetchFulfillmentRejectReasons({ commit, dispatch }) {
    let isApiSuccess = true;
    const fulfillmentRejectReasons  = {}  as any;
    try {
      const payload = {
        "inputFields": {
          "enumerationGroupId": "FF_REJ_RSN_GRP"
        },
        // We shouldn't fetch description here, as description contains EnumGroup description which we don't wanna show on UI.
        "fieldList": ["enumerationGroupId", "enumId", "fromDate", "sequenceNum", "enumDescription", "enumName"],
        "distinct": "Y",
        "entityName": "EnumerationGroupAndMember",
        "viewSize": 200,
        "filterByDate": "Y",
        "orderBy": "sequenceNum"
      }

      const resp = await UtilService.fetchFulfillmentRejectReasons(payload)

      if(!hasError(resp)) {
        resp.data.docs.map((reason: any) => {
          fulfillmentRejectReasons[reason.enumId] = reason
        })
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

  async fetchPartyInformation({ commit, state }, partyIds) {
    let partyInformation = JSON.parse(JSON.stringify(state.partyNames))
    const cachedPartyIds = Object.keys(partyInformation);
    const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

    if(!ids.length) return partyInformation;

    try {
      const payload = {
        "inputFields": {
          "partyId": ids,
          "partyId_op": "in"
        },
        "fieldList": ["firstName", "middleName", "lastName", "groupName", "partyId"],
        "entityName": "PartyNameView",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchPartyInformation(payload);

      if(!hasError(resp)) {
        const partyResp = {} as any
        resp.data.docs.map((partyInformation: any) => {

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

  async fetchShipmentMethodTypeDesc({ commit, state }, shipmentIds) {
    let shipmentMethodTypeDesc = JSON.parse(JSON.stringify(state.shipmentMethodTypeDesc))
    const cachedShipmentMethodIds = Object.keys(shipmentMethodTypeDesc);
    const ids = shipmentIds.filter((shipmentId: string) => !cachedShipmentMethodIds.includes(shipmentId))

    if(!ids.length) return shipmentMethodTypeDesc;

    try {
      const payload = {
        "inputFields": {
          "shipmentMethodTypeId": ids,
          "shipmentMethodTypeId_op": "in"
        },
        "fieldList": ["shipmentMethodTypeId", "description"],
        "entityName": "ShipmentMethodType",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchShipmentMethodTypeDesc(payload);

      if(!hasError(resp)) {
        const shipmentMethodResp = {} as any
        resp.data.docs.map((shipmentMethodInformation: any) => {
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

  async fetchShipmentBoxTypeDesc({ commit, state }, shipmentBoxIds) {
    let shipmentBoxTypeDesc = JSON.parse(JSON.stringify(state.shipmentBoxTypeDesc))
    const cachedShipmentBoxIds = Object.keys(shipmentBoxTypeDesc);
    const ids = shipmentBoxIds.filter((boxId: string) => !cachedShipmentBoxIds.includes(boxId))

    if(!ids.length) return shipmentBoxTypeDesc;

    try {
      const payload = {
        "inputFields": {
          "shipmentBoxTypeId": ids,
          "shipmentBoxTypeId_op": "in"
        },
        "fieldList": ["shipmentBoxTypeId", "description"],
        "entityName": "ShipmentBoxType",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchShipmentBoxTypeDesc(payload);

      if(!hasError(resp)) {
        const shipmentBoxResp = {} as any
        resp.data.docs.map((shipmentBoxInformation: any) => {
          shipmentBoxResp[shipmentBoxInformation.shipmentBoxTypeId] = shipmentBoxInformation.description
        })

        shipmentBoxTypeDesc = {
          ...shipmentBoxTypeDesc,
          ...shipmentBoxResp
        }

        commit(types.UTIL_SHIPMENT_BOXES_UPDATED, shipmentBoxTypeDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching shipment boxes description', err)
    }

    return shipmentBoxTypeDesc;
  },

  async fetchFacilityTypeInformation({ commit, state }, facilityTypeIds) {
    const facilityTypeDesc = JSON.parse(JSON.stringify(state.facilityTypeDesc))

    const cachedFacilityTypeIds = Object.keys(facilityTypeDesc);
    const facilityTypeIdFilter = [...new Set(facilityTypeIds.filter((facilityTypeId: any) => !cachedFacilityTypeIds.includes(facilityTypeId)))]

    // If there are no facility types to fetch skip the API call
    if (!facilityTypeIdFilter.length) return;

    const payload = {
      inputFields: {
        facilityTypeId: facilityTypeIds,
        facilityTypeId_op: 'in'
      },
      viewSize: facilityTypeIds.length,
      entityName: 'FacilityType',
      noConditionFind: 'Y',
      distinct: "Y",
      fieldList: ["facilityTypeId", "description"]
    }

    try {
      const resp = await UtilService.fetchFacilityTypeInformation(payload);

      if(!hasError(resp) && resp.data?.docs.length > 0) {
        resp.data.docs.map((facilityType: any) => { 
          facilityTypeDesc[facilityType.facilityTypeId] = facilityType['description'] 
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
        "inputFields": {
          "paymentMethodTypeId": ids,
          "paymentMethodTypeId_op": "in"
        },
        "fieldList": ["paymentMethodTypeId", "description"],
        "entityName": "PaymentMethodType",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchPaymentMethodTypeDesc(payload);

      if(!hasError(resp)) {
        const paymentMethodResp = {} as any
        resp.data.docs.map((paymentMethodType: any) => {
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
        "inputFields": {
          "statusId": ids,
          "statusId_op": "in"
        },
        "fieldList": ["statusId", "description"],
        "entityName": "StatusItem",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchStatusDesc(payload);

      if(!hasError(resp)) {
        const statusResp = {} as any
        resp.data.docs.map((statusItem: any) => {
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
      "entityName": "ProductStoreShipmentMeth",
      "inputFields": {
        "partyId": "_NA_",
        "partyId_op": "notEqual",
        "roleTypeId": "CARRIER",
        "productStoreId": getProductStoreId()
      },
      "fieldList": ['roleTypeId', "partyId"],
      "viewSize": 1
    }

    try {
      const resp = await UtilService.findProductStoreShipmentMethCount(params);

      if(resp?.status == 200 && !hasError(resp) && resp.data.count) {
        productStoreShipmentMethCount = resp.data.count
      } else {
        throw resp?.data
      }
    } catch(err) {
      logger.error('Failed to find shipment method count for product store', err)
    }

    commit(types.UTIL_PRODUCT_STORE_SHIPMENT_METH_COUNT_UPDATED, productStoreShipmentMethCount)
  },
  
  async fetchRejectReasonEnumTypes({ commit, state }) {
    if(state.rejectReasonEnumTypes.length) {
      return;
    }

    let rejectReasonEnumTypes = [] as any;

    try {
      const payload = {
        "inputFields": {
          "parentTypeId": ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          "parentTypeId_op": "in"
        },
        "fieldList": ["description", "enumTypeId"],
        "entityName": "EnumerationType",
        "noConditionFind": "Y"
      }

      const resp = await UtilService.fetchRejectReasonEnumTypes(payload)
      if (!hasError(resp) && resp.data.count > 0) {
        rejectReasonEnumTypes = resp.data.docs
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error(err)
    }
    commit(types.UTIL_REJECT_REASON_ENUM_TYPES_UPDATED, rejectReasonEnumTypes)
  },

  async fetchEnumerations({ commit, state }, ids) {
    let enumerations = JSON.parse(JSON.stringify(state.enumerations)) as any

    const enumIds = ids.filter((enumId: string) => !enumerations[enumId])

    if(!enumIds.length) {
      return;
    }

    try {
      const payload = {
        inputFields: {
          enumId: enumIds,
          enumId_op: "in"
        },
        viewSize: enumIds.length,
        fieldList: ["enumId", "description"],
        entityName: "Enumeration",
        distinct: "Y"
      }

      const resp = await UtilService.fetchEnumeration(payload)
      if (!hasError(resp) && resp.data.count > 0) {
        enumerations = resp.data.docs.reduce((enums: any, enumeration: any) => {
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
        "inputFields": {
          "parentTypeId": "VIRTUAL_FACILITY",
          "parentTypeId_op": "notEqual",
          "facilityTypeId": "VIRTUAL_FACILITY",
          "facilityTypeId_op": "notEqual"
        },
        "entityName": "FacilityAndType",
        "viewSize": 250 // keeping view size 100 as considering that we will have max 100 facilities
      }

      const resp = await UtilService.fetchFacilities(payload)

      if (!hasError(resp) && resp.data.count > 0) {
        facilities = resp.data.docs
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
        "entityName": "ProductStore",
        "noConditionFind": "Y",
        "viewSize": 250 // keeping view size 100 as considering that we will have max 100 product stores
      }

      const resp = await UtilService.fetchProductStores(payload)
      if (!hasError(resp) && resp.data.count > 0) {
        stores = resp.data.docs
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch product stores', err)
    }
    commit(types.UTIL_PRODUCT_STORES_UPDATED, stores)
  },

  async fetchShipmentGatewayConfigs({ commit }) {
    let configs  = {};
    try {
      const payload = {
        "entityName": "ShipmentGatewayConfig",
        "noConditionFind": "Y",
        "viewSize": 50 // keeping view size 50 as considering there will not be more than 50 shipment gateway
      }

      const resp = await UtilService.fetchShipmentGatewayConfigs(payload)
      if (!hasError(resp) && resp.data.count > 0) {
        configs = resp.data.docs.reduce((updatedConfigDetail:any, config:any) => {
          updatedConfigDetail[config.shipmentGatewayConfigId] = config;
          return updatedConfigDetail;
        }, {})
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch shipment gateway config', err)
    }
    commit(types.UTIL_SHIPMENT_GATEWAY_CONFIGS_UPDATED, configs)
  },
  
  async getForceScanSetting({ commit, dispatch }, eComStoreId) {
    const payload = {
      "inputFields": {
        "productStoreId": eComStoreId,
        "settingTypeEnumId": "FULFILL_FORCE_SCAN"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingValue", "fromDate"],
      "viewSize": 1
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if(!hasError(resp)) {
        const respValue = resp.data.docs[0].settingValue === "true"
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
    const fromDate = Date.now()

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
        fromDate,
        "productStoreId": getProductStoreId(),
        "settingTypeEnumId": "FULFILL_FORCE_SCAN",
        "settingValue": "false"
      }

      await UtilService.createForceScanSetting(params) as any
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a scan setting
    commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, false)
    return fromDate;
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

    let fromDate;

    try {
      const resp = await UtilService.getProductStoreSetting({
        "inputFields": {
          "productStoreId": eComStoreId,
          "settingTypeEnumId": "FULFILL_FORCE_SCAN"
        },
        "filterByDate": 'Y',
        "entityName": "ProductStoreSetting",
        "fieldList": ["fromDate"],
        "viewSize": 1
      }) as any
      if(!hasError(resp)) {
        fromDate = resp.data.docs[0]?.fromDate
      }
    } catch(err) {
      console.error(err)
    }

    if(!fromDate) {
      fromDate = await dispatch("createForceScanSetting");
    }

    const params = {
      "fromDate": fromDate,
      "productStoreId": eComStoreId,
      "settingTypeEnumId": "FULFILL_FORCE_SCAN",
      "settingValue": `${value}`
    }

    try {
      const resp = await UtilService.updateForceScanSetting(params) as any

      if((!hasError(resp))) {
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
      "inputFields": {
        "productStoreId": eComStoreId,
        "settingTypeEnumId": "BARCODE_IDEN_PREF"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingValue", "fromDate"],
      "viewSize": 1
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if(!hasError(resp)) {
        const respValue = resp.data.docs[0].settingValue
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
    const fromDate = Date.now()

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
        fromDate,
        "productStoreId": getProductStoreId(),
        "settingTypeEnumId": "BARCODE_IDEN_PREF",
        "settingValue": "internalName"
      }  

      await UtilService.createBarcodeIdentificationPref(params) as any
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a store setting
    commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, "internalName")
    return fromDate;
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

    let fromDate;

    try {
      const resp = await UtilService.getProductStoreSetting({
        "inputFields": {
          "productStoreId": eComStoreId,
          "settingTypeEnumId": "BARCODE_IDEN_PREF"
        },
        "filterByDate": 'Y',
        "entityName": "ProductStoreSetting",
        "fieldList": ["fromDate"],
        "viewSize": 1
      }) as any
      if(!hasError(resp)) {
        fromDate = resp.data.docs[0]?.fromDate
      }
    } catch(err) {
      console.error(err)
    }

    if(!fromDate) {
      fromDate = await dispatch("createBarcodeIdentificationPref");
    }

    const params = {
      "fromDate": fromDate,
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
  
  async fetchShipmentBoxUomConversions({ commit, state }) { 
    if(Object.keys(state.boxUomConversions)?.length) return;
    const boxUomConversions = {} as any;

    try {
      const resp = await UtilService.fetchUomConversions({
        "inputFields": {
          "uomId": ["LEN_in", "WT_kg"],
          "uomId_op": "in",
          "uomIdTo": ["LEN_cm", "WT_lb"],
          "uomIdTo_op": "in"
        },
        "entityName": "UomConversion",
        "noConditionFind": "Y",
        "fieldList": ["conversionFactor", "uomId", "uomIdTo"],
        "viewSize": 4
      })

      if(!hasError(resp) && resp.data.docs?.length) {
        resp.data.docs.map((conversion: any) => {
          if(conversion.uomId === "LEN_in" && conversion.uomIdTo === "LEN_cm") {
            boxUomConversions["inToCm"] = conversion.conversionFactor
          } else {
            boxUomConversions["kgToLb"] = conversion.conversionFactor
          }
        })
      } else {
        throw resp.data;
      }
    } catch(error: any) {
      logger.error(error);
    }
    
    commit(types.UTIL_BOX_UOM_CONVERSIONS_UPDATED, boxUomConversions)
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
        "entityName": "PartyRoleAndPartyDetail",
        "inputFields": {
          "roleTypeId": "CARRIER"
        },
        "fieldList": ["partyId", "partyTypeId", "roleTypeId", "firstName", "lastName", "groupName"],
        "distinct": "Y",
        "noConditionFind": "Y"
      });

      if (!hasError(resp)) {
        resp.data.docs.map((carrier: any) => {
          carrierDesc[carrier.partyId] = carrier.partyTypeId === "PERSON" ? `${carrier.firstName} ${carrier.lastName}` : carrier.groupName
        })
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error("error", err);
    }
    commit(types.UTIL_CARRIER_DESC_UPDATED, carrierDesc)
  },

  async fetchStoreCarrierAndMethods({ commit }, productStoreId) {
    let shipmentMethodsByCarrier = {};

    try {
      const payload = {
        "inputFields": {
          productStoreId,
          "roleTypeId": "CARRIER",
          "shipmentMethodTypeId": "STOREPICKUP",
          "shipmentMethodTypeId_op": "notEqual"
        },
        "fieldList": ["description", "partyId", "shipmentMethodTypeId"],
        "noConditionFind": "Y",
        "entityName": "ProductStoreShipmentMethView",
        "filterByDate": "Y",
        "distinct": "Y"
      }

      const resp = await UtilService.fetchStoreCarrierAndMethods(payload);

      if(!hasError(resp)) {
        const storeCarrierAndMethods = resp.data.docs;
        shipmentMethodsByCarrier = storeCarrierAndMethods.reduce((shipmentMethodsByCarrier: any, storeCarrierAndMethod: any) => {
          const { partyId, shipmentMethodTypeId, description } = storeCarrierAndMethod;

          if(!shipmentMethodsByCarrier[partyId]) shipmentMethodsByCarrier[partyId] = []
          shipmentMethodsByCarrier[partyId].push({ shipmentMethodTypeId, description })

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
    let addresses = [] as any;
    const remainingFacilityIds = [] as any;

    facilityIds.map((facilityId: string) => {
      facilityAddresses[facilityId] ? addresses.push(facilityAddresses[facilityId]) : remainingFacilityIds.push(facilityId)
    })

    if(!remainingFacilityIds?.length) return addresses;

    try {
      const resp = await UtilService.fetchFacilityAddresses({
        inputFields: {
          contactMechPurposeTypeId: "PRIMARY_LOCATION",
          contactMechTypeId: "POSTAL_ADDRESS",
          facilityId: remainingFacilityIds,
          facilityId_op: "in"
        },
        entityName: "FacilityContactDetailByPurpose",
        orderBy: 'fromDate DESC',
        filterByDate: 'Y',
        fieldList: ['address1', 'address2', 'city', 'countryGeoName', 'postalCode', 'stateGeoName', 'facilityId', 'facilityName', 'contactMechId'],
        viewSize: 2
      }) as any;
  
      if(!hasError(resp) && resp.data.docs?.length) {
        resp.data.docs.map((facility: any) => {
          facilityAddresses[facility.facilityId] = facility;
        })
        addresses = [...addresses, ...resp.data.docs]
      } else {
        throw resp.data;
      }
    } catch (error) {
      logger.error(error);
    }
    commit(types.UTIL_FACILITY_ADDRESSES_UPDATED, facilityAddresses)
    return addresses
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

      if(hasError(resp) || !resp.data.docs?.length) {
        throw resp.data;
      }

      const labelImageType = resp?.data?.docs[0]?.systemPropertyValue;
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
    let picklistItemIdentificationPref = "internalName"
    let isPicklistDownloadEnabled = false
    const payload = {
      "inputFields": {
        "productStoreId": eComStoreId,
        "settingTypeEnumId": ["PICK_LST_PROD_IDENT", "FF_DOWNLOAD_PICKLIST"]
      },
      "filterByDate": "Y",
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingTypeEnumId", "settingValue", "fromDate"],
      "viewSize": 20
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if(!hasError(resp) && resp.data.docs?.length) {

        resp.data.docs.map((setting: any) => {
          if(setting.settingTypeEnumId === "PICK_LST_PROD_IDENT") {
            picklistItemIdentificationPref = setting.settingValue
          }

          if(setting.settingTypeEnumId === "FF_DOWNLOAD_PICKLIST") {
            isPicklistDownloadEnabled = setting.settingValue == "true"
          }
        })
      }
    } catch(err) {
      logger.error(err)
    }
    commit(types.UTIL_PICKLIST_ITEM_IDENTIFICATION_PREF_UPDATED, picklistItemIdentificationPref)
    commit(types.UTIL_PICKLIST_DOWNLOAD_STATUS_UPDATED, isPicklistDownloadEnabled)
  },
}

export default actions;