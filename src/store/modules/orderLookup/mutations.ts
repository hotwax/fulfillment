import { MutationTree } from 'vuex'
import OrderLookupState from './OrderLookupState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderLookupState> = {
  [types.ORDERLOOKUP_LIST_UPDATED] (state, payload) {
    state.list.orders = payload.orders
    state.list.orderCount = payload.orderCount,
    state.list.itemCount = payload.itemCount
  },
  [types.ORDERLOOKUP_FILTERS_UPDATED] (state, payload) {
    state.query[payload.filterName] = payload.value
  },
  [types.ORDERLOOKUP_CURRENT_UPDATED] (state, order) {
    state.current = order
  },
  [types.ORDERLOOKUP_SORT_UPDATED] (state, payload) {
    state.query['sort'] = payload
  },
  [types.ORDERLOOKUP_CHANNEL_OPTIONS_UPDATED] (state, payload) {
    state.channels = payload
  },
  [types.ORDERLOOKUP_PRODUCT_STORE_OPTIONS_UPDATED] (state, payload) {
    state.productStores = payload
  },
  [types.ORDERLOOKUP_FACILITY_OPTIONS_UPDATED] (state, payload) {
    state.facilities = payload
  },
  [types.ORDERLOOKUP_STATUS_OPTIONS_UPDATED] (state, payload) {
    state.orderStatuses = payload
  }
}
export default mutations;