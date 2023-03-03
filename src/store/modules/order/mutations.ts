import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_INPROGRESS_UPDATED] (state, payload) {
    state.inProgress.list = payload.orders;
    state.inProgress.total = payload.total;
  },
  [types.ORDER_SELECTED_PICKLISTS_UPDATED](state, payload) {
    state.selectedPicklists = payload
  }
}
export default mutations;