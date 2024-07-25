import { MutationTree } from 'vuex'
import CarrierState from './CarrierState'
import * as types from './mutation-types'

const mutations: MutationTree <CarrierState> = {
  [types.CARRIER_CURRENT_UPDATED] (state, payload) {
    state.current = payload
  },
  [types.CARRIER_UPDATED] (state, payload) {
    state.carrier.list = payload.list;
    state.carrier.total = payload.total;
  },
  [types.CARRIER_CLEARED](state) {
    state.carrier = {
      list: [],
      total: 0,
    }
  },
  [types.CARRIER_CURRENT_CLEARED](state) {
    state.current = {}
  },
  [types.SHIPMENT_METHODS_UPDATED](state, payload) {
    state.shipmentMethods = payload
  },
  [types.CARRIER_SHIPMENT_METHOD_QUERY_UPDATED](state, payload) {
    state.shipmentMethodQuery = payload.query
  },
  [types.CARRIER_PRODUCT_STORE_SHIPMENT_METHODS_UPDATED](state, payload) {
    state.carrierShipmentMethodsByProductStore = payload
  },
  [types.CARRIER_STORE_SHIPMENT_METHODS_UPDATED](state, payload) {
    state.productStoreShipmentMethods = payload
  },
  [types.CARRIER_FACILITY_CARRIERS_UPDATED](state, payload) {
    state.facilityCarriers = payload
  }
}
export default mutations;