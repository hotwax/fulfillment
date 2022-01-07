import { GetterTree } from "vuex";
import OrderState from "./OrderState";
import RootState from "../../RootState";

const getters: GetterTree<OrderState, RootState> = {
  getOpenOrders (state) {
    return state.open;
  },
  getShipmentMethods (state) {
    return state.shipmentMethods;
  }
};
export default getters;