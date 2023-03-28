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
    (state as any)[payload.page].queryString = payload.queryString
  },
  [types.ORDER_VIEW_SIZE_UPDATED](state, payload) {
    (state as any)[payload.page].viewSize = payload.size
  },
  [types.ORDER_OPEN_CLEARED](state, payload) {
    state.open = payload
  }
}
export default mutations;