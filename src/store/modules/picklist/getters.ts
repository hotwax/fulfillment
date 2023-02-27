import { GetterTree } from "vuex";
import PicklistState from "./PicklistState";
import RootState from "../../RootState";

const getters: GetterTree<PicklistState, RootState> = {
  getPicklistSize (state) {
    return state.size;
  }
};
export default getters;