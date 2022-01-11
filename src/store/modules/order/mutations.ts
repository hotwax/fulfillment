import { MutationTree } from 'vuex';
import OrderState from './OrderState';
import * as types from './mutation-types';

const mutations: MutationTree <OrderState> = {
  [types.ORDER_COMPLETED_UPDATED] (state, payload) {
    state.completedOrders = payload.orders;
    state.completedOrderLength = payload.orders.length;
  }
}
export default mutations;