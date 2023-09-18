import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import TransferShipmentState from './TransferShipmentState'
import RootState from '../../RootState'

const transferShipmentModule: Module<TransferShipmentState, RootState> = {
  namespaced: true,
  state: {
    currentShipment: {},
    shipments: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        selectedCarrierPartyIds: [],
        selectedShipmentMethodTypeIds: []
      }
    },
  },
  getters,
  actions,
  mutations
}

export default transferShipmentModule;
