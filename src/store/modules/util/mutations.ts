import { MutationTree } from 'vuex'
import UtilState from './UtilState'
import * as types from './mutation-types'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_VIEW_SIZE_UPDATED] (state, payload) {
    // converting the payload value to a number as in some cases we are having payload as a string
    // and thus preselected size does not work on refresh
    state.viewSize = +payload
  },
  [types.UTIL_REJECT_REASONS_UPDATED] (state, payload) {
    state.rejectReasons = payload
  }
}
export default mutations;