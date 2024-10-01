import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import RejectionState from './RejectionState'
import RootState from '../../RootState'

const rejectionModule: Module<RejectionState, RootState> = {
  namespaced: true,
  state: {
    stats:{
      total: 0,
      rejectedItems: [],
      usedReasons: [],
    },
    rejectedOrders: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        rejectionPeriodId: 'LAST_TWENTY_FOUR_HOURS',
        rejectionReasons: []
      }
    }
  },
  getters,
  actions,
  mutations
}

export default rejectionModule;