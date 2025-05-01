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
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        selectedShipmentMethods: [],
        selectedCategories: []
      }
    },
    completed: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        selectedCarrierPartyId: "",
        selectedShipmentMethods: []
      }
    },
    inProgress: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        selectedPicklist: '',
        queryString: ''
      }
    },
    current: {}
  },
  getters,
  actions,
  mutations
}

export default orderModule;