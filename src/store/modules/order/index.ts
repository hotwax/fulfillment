import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrderState from './OrderState'
import RootState from '@/store/RootState'

const orderModule: Module <OrderState, RootState> = {
  namespaced: true,
  state: {
    completedOrders: {
      list: {},
      total: 0
    }
  },
  actions,
  getters,
  mutations
}
export default orderModule;