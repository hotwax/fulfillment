import { StockService } from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'

const actions: ActionTree<StockState, RootState> = {

  /**
   * Add stocks of specific product
   */
  async addProduct  ( { commit }, { productId }) {
    const resp: any = await StockService.checkInventory({ productId });
    if (resp.status === 200) {
      commit(types.STOCK_ADD_PRODUCT, { productId, stock: resp.data.docs })
    }
  },

  async fetchStock({ commit }, { productIds }) {
    const resp: any = await StockService.checkInventory({
      "filters": {
        "productId": productIds,
        "productId_op": "in",
        "facilityId": this.state.user.currentFacility.facilityId
      },
      // TODO: need to display QOH in place of atp
      "fieldsToSelect": ["productId","atp"],
      "viewSize": productIds.length,
    });
    if (resp.status === 200 && !hasError(resp)) {
      // Handled empty response in case of failed query
      if (resp.data) commit(types.STOCK_ADD_PRODUCTS, { products: resp.data.docs })
    }
  },

  /**
  * Add stocks of list of products
  */
  async addProducts  ( { dispatch }, { productIds }) {
    // There is a limitation at API level to handle only 100 records
    // Added check to create array of arrays of productIds of max length 100, as in some case we might have
    // more than 100 items for which we need to check the inventory
    const productIdArrays = []
    while(productIds.length) {
      productIdArrays.push(productIds.splice(0, 100))
    }

    await Promise.allSettled(productIdArrays.map((productIds) => dispatch('fetchStock', { productIds })))
  }

}
export default actions;