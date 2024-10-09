import { StockService } from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import logger from '@/logger'
import { showToast } from '@/utils'
import { translate, useUserStore } from '@hotwax/dxp-components'

const actions: ActionTree<StockState, RootState> = {
  async fetchStock({ commit }, { productId, facilityId = '' }) {
    const getCurrentFacility: any = useUserStore().getCurrentFacility
    const currentFacilityId = getCurrentFacility?.facilityId
    const id = facilityId ? facilityId : currentFacilityId

    try {
      const payload = {
        productId,
        facilityId: id
      }

      const resp: any = await StockService.getInventoryAvailableByFacility(payload);

      if (!hasError(resp)) {
        commit(types.STOCK_ADD_PRODUCT, { productId: payload.productId, facilityId: id, stock: resp.data })
      } else {
        throw resp.data;
      }
    } catch(err) {
      logger.error(err)
      showToast(translate('No data available'))
    }
  }
}
export default actions;