import { GetterTree } from "vuex";
import MaargOrderState from "./MaargOrderState";
import RootState from "../../RootState";

const getters: GetterTree<MaargOrderState, RootState> = {
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