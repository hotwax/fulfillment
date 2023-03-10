import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrderState from './OrderState'
import RootState from '../../RootState'

const orderModule: Module<OrderState, RootState> = {
  namespaced: true,
  state: {
    inProgress: {
      list: [],
      total: 0
    },
    selectedPicklists: [],  // storing the selectedPicklists in state as when changing the viewSize or queryString we need to honor the selectedPicklists
    queryString: ''
  },
  getters,
  actions,
  mutations
}

export default orderModule;