import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_OPEN_UPDATED] (state, payload) {
    state.open.list = payload.list;
    state.open.total = payload.total;
  },
  [types.ORDER_OPEN_QUERY_UPDATED](state, payload) {
    state.open.query = payload
  },
  [types.ORDER_OPEN_CLEARED](state, payload) {
    state.open = payload
  }
}
export default mutations;