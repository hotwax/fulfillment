import { GetterTree } from "vuex";
import OrderLookupState from "./OrderLookupState";
import RootState from "../../RootState";

const getters: GetterTree<OrderLookupState, RootState> = {
  getOrders (state) {
    return state.list
  },
  isScrollable: (state) => {
    return state.list.orders.length > 0 && state.list.orders.length < state.list.orderCount
  },
  getOrderQuery: (state) => {
    return state.query
  },
  getCurrentOrder(state) {
    return state.current
  },
  getFacilityOptions: (state) => {
    return state.facilities || [];
  },
  getProductStoreOptions: (state) => {
    return state.productStores || [];
  },
  getChannelOptions: (state) => {
    return state.channels || [];
  },
  getOrderStatusOptions: (state) => {
    return state.orderStatuses || [];
  },
  getCarriersTrackingInfo: (state) => (carrierId: any) => {
    return state.carriersTrackingInfo[carrierId];
  }
};
export default getters;