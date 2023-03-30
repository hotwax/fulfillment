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
  getSelectedPicklists(state) {
    return state.selectedPicklists
  }
};
export default getters;