import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrderState from './OrderState'
import RootState from '../../RootState'

const orderModule: Module<OrderState, RootState> = {
  namespaced: true,
  state: {
    open: {
      list: [],
      total: 0,
      query: {
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        selectedShipmentMethods: []
      }
    },
  },
  getters,
  actions,
  mutations
}

export default orderModule;