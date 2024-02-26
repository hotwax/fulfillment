import { MutationTree } from 'vuex'
import TransferOrderState from './TransferOrderState'
import * as types from './mutation-types'

const mutations: MutationTree <TransferOrderState> = {
  [types.ORDER_CURRENT_UPDATED] (state, payload) {
    state.current = payload
  },
  [types.ORDER_TRANSFER_UPDATED] (state, payload) {
    state.transferOrder.list = payload.list;
    state.transferOrder.total = payload.total;
  },
  [types.ORDER_TRANSFER_QUERY_UPDATED](state, payload) {
    state.transferOrder.query = payload
  },
  [types.ORDER_TRANSFER_CLEARED](state) {
    state.transferOrder = {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        selectedShipmentMethods: [],
        selectedStatuses: ['ORDER_APPROVED']
      }
    }
  },
  [types.ORDER_CURRENT_SHIPMENT_UPDATED](state, payload) {
    state.shipment.current = payload
  },
  [types.ORDER_CURRENT_SHIPMENT_CLEARED](state) {
    state.shipment.current = {}
  }
}
export default mutations;