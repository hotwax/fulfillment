import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import RejectionState from './RejectionState'
import RootState from '../../RootState'

const orderModule: Module<RejectionState, RootState> = {
  namespaced: true,
  state: {
    rejectedItems: [],
    usedReasons: [],
    rejectedOrders: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: ''
      }
    }
  },
  getters,
  actions,
  mutations
}

export default orderModule;