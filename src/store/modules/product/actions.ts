import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import logger from "@/logger";
import { isKitComponent } from "@/utils/order";

const actions: ActionTree<ProductState, RootState> = {

  async fetchProducts ( { commit, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.cached);
    let viewSize = 0;
    const productIdFilter= productIds.reduce((filter: string, productId: any) => {
      // If product already exist in cached products skip
      if (cachedProductIds.includes(productId)) {
        return filter;
      } else {
        // checking condition that if the filter is not empty then adding 'OR' to the filter
        if (filter !== '') filter += ' OR '
        viewSize++; // updating viewSize when productId is not found in the cache state
        return filter += productId;
      }
    }, '');

    // If there are no products skip the API call
    if (productIdFilter === '') return;

    let resp;
    try {
      resp = await ProductService.fetchProducts({
        "filters": ['productId: (' + productIdFilter + ')'],
        viewSize
      })
      if (resp.status === 200 && resp.data?.response && !hasError(resp)) {
        const products = resp.data.response.docs;
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Failed to fetch products information', err)
    }
    return resp;
  },

  async getProductInformation({ dispatch }, { orders }) {
    let productIds: any = new Set();
    orders.forEach((list: any) => {
      list.doclist.docs.forEach((order: any) => {
        if (order.productId) {
          productIds.add(order.productId)
          !isKitComponent(order) && productIds.add(order.parentProductId)
        }
      })
    })

    productIds = [...productIds]
    if (productIds.length) {
      dispatch('fetchProducts', { productIds })
    }
  }
}

export default actions;