import { GetterTree } from "vuex";
import RejectionState from "./RejectionState";
import RootState from "../../RootState";

const getters: GetterTree<RejectionState, RootState> = {
  getRejectedItems (state) {
    return state.rejectedItems;
  },
  getUsedReasons (state) {
    return state.usedReasons;
  },
  getRejectedOrders (state) {
    return state.rejectedOrders;
  }
};
export default getters;