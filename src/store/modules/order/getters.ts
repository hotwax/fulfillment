import { GetterTree } from "vuex";
import OrderState from "./OrderState";
import RootState from "../../RootState";

const getters: GetterTree<OrderState, RootState> = {
  getInProgressOrders (state) {
    return state.inProgress;
  }
};
export default getters;