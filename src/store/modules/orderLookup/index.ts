import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrderLookupState from './OrderLookupState'
import RootState from '../../RootState'

const orderLookupModule: Module<OrderLookupState, RootState> = {
  namespaced: true,
  state: {
    list: {
      orders: [],
      orderCount: 0,
      itemCount: 0
    },
    query: {
      'status': [],
      'facility': [],
      'storePickup': false,
      'shipFromStore': false,
      'unfillable': false,
      'queryString': '',
      'sort': 'orderDate desc',
      'productStore': [],
      'channel': [],
      'date': '',
      'fromDate': '',
      'toDate': ''
    },
    current: {},
    channels: [],
    productStores: [],
    facilities: [],
    orderStatuses: []
  },
  getters,
  actions,
  mutations
}

export default orderLookupModule;