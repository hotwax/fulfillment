import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_INPROGRESS_UPDATED] (state, payload) {
    state.inProgress.list = payload.inProgress;
    state.inProgress.total = payload.total;
  }
}
export default mutations;