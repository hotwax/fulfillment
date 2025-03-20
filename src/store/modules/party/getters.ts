import { GetterTree } from "vuex";
import PartyState from './PartyState'
import RootState from "@/store/RootState";

const getters: GetterTree<PartyState, RootState> = {
  getPartyName: (state) => (partyId: string) => {
    return state.partyNames[partyId] ? state.partyNames[partyId] : ''
  }
}

export default getters;