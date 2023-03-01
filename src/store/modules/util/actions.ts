import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'

const actions: ActionTree<UtilState, RootState> = {
  updateInProgressViewSize({ commit }, payload) {
    commit(types.UTIL_INPROGRESS_VIEW_SIZE_UPDATED, payload)
    this.dispatch('order/fetchInProgressOrders')
  }
}

export default actions;