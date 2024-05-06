import { GetterTree } from "vuex";
import CarrierState from "./CarrierState";
import RootState from "../../RootState";

const getters: GetterTree<CarrierState, RootState> = {
  getCarriers (state) {
    return state.carrier;
  },
  getCurrent (state) {
    return state.current
  },
  getShipmentMethodQuery (state) {
    return state.shipmentMethodQuery;
  },
  getShipmentMethods (state) {
    return state.shipmentMethods;
  },
  getFilteredShipmentMethods(state) {
    let shipmentMethods = JSON.parse(JSON.stringify(state.shipmentMethods))
    const query = state.shipmentMethodQuery
    
    if (query.showSelected) {
      shipmentMethods = shipmentMethods.filter((shipmentMethod: any) => shipmentMethod.isChecked)
    }
    return shipmentMethods;
  },
  getCarrierShipmentMethodsByProductStore (state) {
    return state.carrierShipmentMethodsByProductStore;
  },
};
export default getters;