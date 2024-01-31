import { MutationTree } from 'vuex'
import * as types from './mutation-type'
import partyState from './partyState'

const mutations: MutationTree <partyState> = {
    [types.PRTY_PARTY_NAMES_UPDATED] (state, payload) {
        state.partyNames = payload
      },
}
export default mutations;