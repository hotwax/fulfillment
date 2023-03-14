import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_OPEN_UPDATED] (state, payload) {
    state.open.list = payload.list;
    state.open.total = payload.total;
  },
  [types.ORDER_SELECTED_SHIPMENT_METHODS_UPDATED] (state, payload) {
    state.selectedShipmentMethods = payload;
  },
  [types.ORDER_QUERY_STRING_UPDATED](state, payload) {
    state.queryString = payload
  }
}
export default mutations;