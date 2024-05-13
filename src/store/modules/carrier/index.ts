import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import CarrierState from './CarrierState'
import RootState from '../../RootState'

const orderModule: Module<CarrierState, RootState> = {
  namespaced: true,
  state: {
    carrier: {
      list: [],
      total: 0,
    },
    current: {},
    shipmentMethodQuery:{},
    shipmentMethods: {},
    carrierShipmentMethodsByProductStore: {}
  },
  getters,
  actions,
  mutations
}

export default orderModule;