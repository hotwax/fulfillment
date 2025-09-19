import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.PRODUCT_ADD_TO_CACHED_MULTIPLE] (state, payload) {
    if (payload.products) {
      payload.products.forEach((product: any) => {
        state.cached[product.productId] = product
      });
    }
  },
  [types.PRODUCT_ADD_TO_CACHED] (state, payload) {
    state.cached[payload.productId] = payload
  },
  [types.PRODUCT_CLEARED](state) {
    state.cached = {}
  },
}
export default mutations;