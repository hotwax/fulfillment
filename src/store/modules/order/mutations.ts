import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_OPEN_UPDATED] (state, payload) {
    state.open.list = payload.open;
    state.open.total = payload.total;
    state.shipmentMethods = payload.shipmentMethods;
  }
}
export default mutations;