import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_OPEN_UPDATED] (state, payload) {
    state.open.list = payload.list;
    state.open.total = payload.total;
  },
  [types.ORDER_OPEN_QUERY_UPDATED](state, payload) {
    state.open.query = payload
  },
  [types.ORDER_OPEN_CLEARED](state) {
    state.open = {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        selectedShipmentMethods: []
      }
    }
  },
  [types.ORDER_COMPLETED_UPDATED] (state, payload) {
    state.completed.list = payload.list;
    state.completed.total = payload.total;
  },
  [types.ORDER_COMPLETED_QUERY_UPDATED](state, payload) {
    state.completed.query = payload
  },
  [types.ORDER_COMPLETED_CLEARED](state) {
    state.completed = {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        selectedCarrierPartyIds: [],
        selectedShipmentMethods: [],
        queryString: ''
      }
    }
  },
  [types.ORDER_INPROGRESS_UPDATED] (state, payload) {
    state.inProgress.list = payload.orders;
    state.inProgress.total = payload.total;
  },
  [types.ORDER_INPROGRESS_QUERY_UPDATED] (state, payload) {
    state.inProgress.query = payload;
  },
  [types.ORDER_INPROGRESS_CLEARED](state) {
    state.inProgress = {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        selectedPicklist: '',
        queryString: ''
      }
    }
  },
  [types.ORDER_CURRENT_UPDATED] (state, payload) {
    state.current = payload
  },
}
export default mutations;