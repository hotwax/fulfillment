import { GetterTree } from "vuex";
import RejectionState from "./RejectionState";
import RootState from "../../RootState";

const getters: GetterTree<RejectionState, RootState> = {
  getRejectedItems (state) {
    return state.stats.rejectedItems;
  },
  getUsedReasons (state) {
    return state.stats.usedReasons;
  },
  getRejectedStats (state) {
    return state.stats;
  },
  getRejectedOrders (state) {
    return state.rejectedOrders;
  }
};
export default getters;