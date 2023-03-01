import { MutationTree } from 'vuex'
import UtilState from './UtilState'
import * as types from './mutation-types'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_INPROGRESS_VIEW_SIZE_UPDATED] (state, payload) {
    state.inProgressViewSize = payload
  }
}
export default mutations;