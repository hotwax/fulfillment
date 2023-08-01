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
  }
}
export default mutations;