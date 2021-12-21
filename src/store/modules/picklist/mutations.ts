import { MutationTree } from 'vuex'
import PicklistState from './PicklistState'
import * as types from './mutation-types'

const mutations: MutationTree <PicklistState> = {
  [types.PICKLIST_SIZE] (state, payload) {
    state.size = payload;
  }
}
export default mutations;