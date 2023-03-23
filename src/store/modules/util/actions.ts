import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/utils'

const actions: ActionTree<UtilState, RootState> = {
  updateViewSize({ commit }, payload) {
    commit(types.UTIL_VIEW_SIZE_UPDATED, payload)
  },
  async fetchRejectReasons({ commit }) {
    try {
      const payload = {
        "inputFields": {
          "parentEnumTypeId": "REPORT_AN_ISSUE"
        },
        "fieldList": ["enumCode", "description"],
        "distinct": "Y",
        "entityName": "EnumTypeChildAndEnum",
        "viewSize": 20 // keeping view size 20 as considering that we will have max 20 reasons
      }

      const resp = await UtilService.fetchRejectReasons(payload)

      if(!hasError(resp) && resp.data.count > 0) {
        commit(types.UTIL_REJECT_REASONS_UPDATED, resp.data.docs)
      }
    } catch (err) {
      console.error(err)
    }
  }
}

export default actions;