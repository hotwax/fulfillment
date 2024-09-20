import { MutationTree } from 'vuex'
import RejectionState from './RejectionState'
import * as types from './mutation-types'

const mutations: MutationTree <RejectionState> = {
  [types.REJECTION_REJECTED_ITEMS_UPDATED] (state, payload) {
    state.rejectedItems = payload;
  },
  [types.REJECTION_USED_REASONS_UPDATED] (state, payload) {
    state.usedReasons = payload;
  },
  [types.REJECTION_ORDERS_UPDATED] (state, payload) {
    state.rejectedOrders.list = payload.list;
    state.rejectedOrders.total = payload.total;
  },
  [types.REJECTION_ORDER_QUERY_UPDATED](state, payload) {
    state.rejectedOrders.query = payload
  }
}
export default mutations;