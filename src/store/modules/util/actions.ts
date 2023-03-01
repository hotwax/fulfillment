import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'

const actions: ActionTree<UtilState, RootState> = {
  updateViewSize({ commit }, payload) {
    commit(types.UTIL_VIEW_SIZE_UPDATED, payload.size)
    if(payload.page === 'InProgress') {
      this.dispatch('order/fetchInProgressOrders')
    }
  }
}

export default actions;