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
}
export default mutations;