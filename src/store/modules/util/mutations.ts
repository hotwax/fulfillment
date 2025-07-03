import { MutationTree } from 'vuex'
import UtilState from './UtilState'
import * as types from './mutation-types'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_REJECT_REASONS_UPDATED] (state, payload) {
    state.rejectReasons = payload
  },
  [types.UTIL_PARTY_NAMES_UPDATED] (state, payload) {
    state.partyNames = payload
  },
  [types.UTIL_SHIPMENT_METHODS_UPDATED] (state, payload) {
    state.shipmentMethodTypeDesc = payload
  },
  [types.UTIL_SHIPMENT_BOXES_UPDATED] (state, payload) {
    state.shipmentBoxTypeDesc = payload
  },
  [types.UTIL_FACILITY_TYPE_UPDATED] (state, payload) {
    state.facilityTypeDesc = payload
  },
  [types.UTIL_PAYMENT_METHODS_UPDATED] (state, payload) {
    state.paymentMethodTypeDesc = payload
  },
  [types.UTIL_STATUS_UPDATED] (state, payload) {
    state.statusDesc = payload
  },
  [types.UTIL_PRODUCT_STORE_SHIPMENT_METH_COUNT_UPDATED] (state, payload) {
    state.productStoreShipmentMethCount = payload
  }, 
  [types.UTIL_REJECT_REASON_ENUM_TYPES_UPDATED](state, payload) {
    state.rejectReasonEnumTypes = payload
  },
  [types.UTIL_ENUMERATIONS_UPDATED](state, payload) {
    state.enumerations = payload
  },
  [types.UTIL_FACILITIES_UPDATED](state, payload) {
    state.facilities = payload
  },
  [types.UTIL_PRODUCT_STORES_UPDATED](state, payload) {
    state.productStores = payload
  },
  [types.UTIL_SHIPMENT_GATEWAY_CONFIGS_UPDATED](state, payload) {
    state.shipmentGatewayConfigs = payload
  },
  [types.UTIL_FORCE_SCAN_STATUS_UPDATED](state, payload) {
    state.isForceScanEnabled = payload
  },
  [types.UTIL_FULFILLMENT_REJECT_REASONS_UPDATED](state, payload) {
    state.fulfillmentRejectReasons = payload
  },
  [types.UTIL_REJECT_REASON_OPTIONS_UPDATED](state, payload) {
    state.rejectReasonOptions = payload
  },
  [types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED](state, payload) {
    state.barcodeIdentificationPref = payload
  },
  [types.UTIL_CARRIER_DESC_UPDATED](state, payload) {
    state.carrierDesc = payload
  },
  [types.UTIL_SHPMNT_MTHD_BY_CARRIER_UPDATED](state, payload) {
    state.shipmentMethodsByCarrier = payload
  },
  [types.UTIL_FACILITY_ADDRESSES_UPDATED](state, payload) {
    state.facilityAddresses = payload
  },
  [types.UTIL_CLEARED](state) {
    state.productStoreShipmentMethCount = 0
    state.isForceScanEnabled = false
    state.barcodeIdentificationPref = "internalName"
    state.carrierDesc = {}
    state.facilityAddresses = {}
    state.facilityShippingLabelImageType = {}
    state.picklistItemIdentificationPref = "internalName"
    state.isPicklistDownloadEnabled = false
    state.excludeOrderBrokerDays = undefined
  },
  [types.UTIL_FACILITY_SHIPPING_LABEL_IMAGE_TYPE_UPDATED](state, payload) {
    if(payload.facilityId) {
      state.facilityShippingLabelImageType[payload.facilityId] = payload.labelImageType
    }
  },
  [types.UTIL_PICKLIST_ITEM_IDENTIFICATION_PREF_UPDATED](state, payload) {
    state.picklistItemIdentificationPref = payload
  },
  [types.UTIL_PICKLIST_DOWNLOAD_STATUS_UPDATED](state, payload) {
    state.isPicklistDownloadEnabled = payload
  },
  [types.UTIL_EXCLUDE_ORDER_BROKER_DAYS_UPDATED](state, payload) {
    state.excludeOrderBrokerDays = payload
  },
}
export default mutations;