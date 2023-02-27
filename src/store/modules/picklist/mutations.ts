import { MutationTree } from 'vuex'
import PicklistState from './PicklistState'
import * as types from './mutation-types'

const mutations: MutationTree <PicklistState> = {
  [types.PICKLIST_SIZE] (state, payload) {
    // Using + operator to convert string into number, as payload may have a string value in it
    state.size = +payload;
  }
}
export default mutations;