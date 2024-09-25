import { MutationTree } from 'vuex'
import RejectionState from './RejectionState'
import * as types from './mutation-types'

const mutations: MutationTree <RejectionState> = {
  [types.REJECTION_STATS_UPDATED] (state, payload) {
    state.stats = payload
  },
  [types.REJECTION_ORDERS_UPDATED] (state, payload) {
    state.rejectedOrders.list = payload.list;
    state.rejectedOrders.total = payload.total;
  },
  [types.REJECTION_ORDER_QUERY_UPDATED](state, payload) {
    state.rejectedOrders.query = payload
  },
  [types.REJECTION_ORDER_QUERY_CLEARED](state) {
    state.rejectedOrders.query = {
      viewIndex: 0,
      viewSize: process.env.VUE_APP_VIEW_SIZE,
      queryString: '',
      rejectionPeriodId: 'LAST_TWENTY_FOUR_HOURS',
      rejectionReasons: []
    }
  },
}
export default mutations;