import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PicklistState from './PicklistState'
import * as types from './mutation-types'
import { PicklistService } from '@/services/PicklistService'
import { hasError, showToast } from '@/utils'

const actions: ActionTree<PicklistState, RootState> = {
  async setPicklistSize ({ commit }, payload) {
    commit(types.PICKLIST_SIZE, payload)
  },

  async updateAvailablePickers ({ commit }, payload) {
    let resp;

    try {
      resp = await PicklistService.getAvailablePickers(payload);
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        commit(types.PICKLIST_PICKERS_UPDATED, {pickers: resp.data.docs})
      } else {
        showToast('Something went wrong')
      }
    } catch (err) {
      console.error('Something went wrong')
    }

    return resp;
  }
}

export default actions;