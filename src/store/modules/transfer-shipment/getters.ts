import { GetterTree } from "vuex";
import TransferShipmentState from "./TransferShipmentState";
import RootState from "../../RootState";

const getters: GetterTree<TransferShipmentState, RootState> = {
  getTransferShipments (state) {
    return state.shipments;
  },
  getCurrentShipment (state) {
    return state.currentShipment;
  }
};
export default getters;
