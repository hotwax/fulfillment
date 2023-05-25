import { GetterTree } from "vuex";
import OrderState from "./OrderState";
import RootState from "../../RootState";

const getters: GetterTree<OrderState, RootState> = {
  getOpenOrders (state) {
    return state.open;
  },
  getInProgressOrders (state) {
    return state.inProgress;
  },
  getCompletedOrders (state) {
    return state.completed;
  },
  isInProgressOrdersScrollable: (state) => {
    return state.inProgress.list.length > 0 && state.inProgress.list.length < state.inProgress.query.viewSize
  }
};
export default getters;