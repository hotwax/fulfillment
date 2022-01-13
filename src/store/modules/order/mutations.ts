import { MutationTree } from 'vuex';
import OrderState from './OrderState';
import * as types from './mutation-types';

const mutations: MutationTree <OrderState> = {
  [types.ORDER_COMPLETED_UPDATED] (state, payload) {
    payload.orders.groups.forEach((order: any) => {
      state.completedOrders.list[order.groupValue] = order
    })
    state.completedOrders.total = payload.orders.ngroups;
  }
}
export default mutations;