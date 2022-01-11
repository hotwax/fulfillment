import { GetterTree } from "vuex"
import OrderState from "./OrderState";
import RootState from "@/store/RootState";

const getters: GetterTree <OrderState, RootState> = {
  getCompletedOrders(state) {
    return state.completedOrders
  },
  getcompletedOrderLength(state) {
    return state.completedOrderLength
  }
}
export default getters;