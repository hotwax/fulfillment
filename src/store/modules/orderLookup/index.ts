import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrderLookupState from './OrderLookupState'
import RootState from '../../RootState'

const orderLookupModule: Module<OrderLookupState, RootState> = {
  namespaced: true,
  state: {
  },
  getters,
  actions,
  mutations
}

export default orderLookupModule;