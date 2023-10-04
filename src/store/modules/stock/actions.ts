import { StockService } from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import logger from '@/logger'

const actions: ActionTree<StockState, RootState> = {
  async fetchStock({ commit }, { productId }) {

    try {
      const payload = {
        productId,
        facilityId: this.state.user.currentFacility.facilityId
      }

      const resp: any = await StockService.getInventoryAvailableByFacility(payload);

      if (resp.status === 200 && !hasError(resp)) {
        commit(types.STOCK_ADD_PRODUCT, { productId: payload.productId, stock: resp.data })
      }
    } catch(err) {
      logger.error(err)
    }
  },

  /**
  * Add stocks of list of products
  */
  async addProducts({ dispatch, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.products);
    const productIdFilter= productIds.reduce((filter: Array<string>, productId: any) => {
      // If product not available in cached products then only fetch the stock for that product
      if (productId && !cachedProductIds.includes(productId)) {
        filter.push(productId)
      }

      return filter
    }, []);

    // If there are no products skip the API call
    if (!productIdFilter.length) return;

    dispatch('fetchStock', { productIds: productIdFilter })
  }

}
export default actions;