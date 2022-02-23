import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_IN_PROGRESS_UPDATED] (state, payload) {
    state.inProgress.list = payload;
  },
  [types.ORDER_SHIPMENT_BOX_INFO](state, payload) {
    state.inProgress.orderShipmentBoxList[payload.orderId] = payload.boxInformation;
  }
}
export default mutations; 