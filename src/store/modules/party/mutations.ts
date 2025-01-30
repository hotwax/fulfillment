import { MutationTree } from "vuex";
import PartyState from './PartyState';
import * as types from './mutation-types';

const mutations: MutationTree<PartyState> = {
   [types.UTIL_PARTY_NAMES_UPDATED] (state, payload) {
    state.partyNames = payload
  }  
} 

export default mutations;