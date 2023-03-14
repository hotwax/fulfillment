import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PicklistState from './PicklistState'
import * as types from './mutation-types'

const actions: ActionTree<PicklistState, RootState> = {
  async setPicklistSize ({ commit }, payload) {
    commit(types.PICKLIST_SIZE, payload)
  }
}

export default actions;