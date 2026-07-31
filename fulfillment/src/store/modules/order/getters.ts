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
  getCurrent (state) {
    return state.current
  }
};
export default getters;