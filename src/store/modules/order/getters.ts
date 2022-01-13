import { GetterTree } from "vuex"
import OrderState from "./OrderState";
import RootState from "@/store/RootState";

const getters: GetterTree <OrderState, RootState> = {
  getCompletedOrders(state) {
    return state.completedOrders.list ? state.completedOrders.list : {}
  },
  getTotalNumberOfOrders(state) {
    return state.completedOrders.total
  }
}
export default getters;