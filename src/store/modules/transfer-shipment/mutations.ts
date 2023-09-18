import { MutationTree } from 'vuex'
import TransferShipmentState from './TransferShipmentState'
import * as types from './mutation-types'

const mutations: MutationTree <TransferShipmentState> = {
  [types.TRANSFER_SHIPMENT_UPDATED] (state, payload) {
    state.shipments.list = payload.list;
    state.shipments.total = payload.total;
  },
  [types.TRANSFER_SHIPMENT_CURRENT_UPDATED] (state, payload) {
    state.currentShipment = payload.currentShipment;
  },
  [types.TRANSFER_SHIPMENT_QUERY_UPDATED](state, payload) {
    state.shipments.query = payload
  },
  [types.TRANSFER_SHIPMENT_CLEARED](state) {
    state.shipments = {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        selectedCarrierPartyIds: [],
        selectedShipmentMethodTypeIds: [],
        queryString: ''
      }
    }
  }
}
export default mutations;
