import { GetterTree } from "vuex";
import OrderState from "./OrderState";
import RootState from "../../RootState";

const getters: GetterTree<OrderState, RootState> = {
  getInProgressOrders (state) {
    return state.inProgress;
  },
  isScrollable (state) {
    return (
      state.inProgress.list.inProgress &&
      state.inProgress.list.inProgress.length > 0 &&
      state.inProgress.list.inProgress.length < state.inProgress.list.total
    );
  },
  getShipmentBoxInfo: (state) => (orderId: string) => {
    return state.inProgress.orderShipmentBoxList[orderId];
  }
};
export default getters; 