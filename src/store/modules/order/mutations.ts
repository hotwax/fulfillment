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
  },
  [types.ORDER_COMPLETED_UPDATED] (state, payload) {
    state.completed.list = payload.list;
    state.completed.total = payload.total;
  },
  [types.ORDER_COMPLETED_QUERY_UPDATED](state, payload) {
    state.completed.query = payload
  },
  [types.ORDER_COMPLETED_CLEARED](state, payload) {
    state.completed = payload
  }
}
export default mutations;