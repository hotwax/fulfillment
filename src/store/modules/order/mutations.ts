import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_IN_PROGRESS_UPDATED] (state, payload) {
    state.inProgress.list = payload.inProgress;
    state.inProgress.total = payload.total;
    state.inProgress.items = payload.items;
  }
}
export default mutations; 