import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, searchProducts } from '@/adapter'
import logger from "@/logger";

const actions: ActionTree<ProductState, RootState> = {

  async fetchProducts ( { commit, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.cached);
    const productIdFilter = productIds.filter((productId: any) => !cachedProductIds.includes(productId));
    const viewSize = productIdFilter.length;
    // If there are no products skip the API call
    if (!viewSize) return;

    let resp;
    try {
      resp = await searchProducts({
        filters: { 
          "productId": {
            value: productIdFilter,
            op: 'OR'
          }
        },
        viewSize
      })
      if (resp.total) {
        const products = resp.products;
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
      } else {
        throw resp
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
        }
      })
    })

    productIds = [...productIds]
    if (productIds.length) {
      await dispatch('fetchProducts', { productIds })
    }
  },

  async fetchProductComponents ( { commit, dispatch, state }, { productId }) {
    // If there are no products skip the API call
    if (productId === '') return;

    const cachedProductIds = Object.keys(state.cached);
    if (!cachedProductIds.includes(productId)) {
      await dispatch('fetchProducts', { productIds: [productId] })
    }
    const product = state.cached[productId]
    if (product.productComponents && product.productComponents.length > 0) {
      return;
    }

    let resp;
    try {
      resp = await ProductService.fetchProductComponents({
        customParametersMap: {
          productId: productId,
          pageIndex: 0,
          pageSize: 100,  // maximum records we could have
        },
        dataDocumentId: "ProductComponent",
        filterByDate: true
      })
      if (!hasError(resp)) {
        const productComponents = resp.data.entityValueList;
        const componentProductIds = productComponents.map((productComponent: any) => productComponent.productIdTo);
        await dispatch('fetchProducts', { productIds: componentProductIds })
        
        product["productComponents"] = productComponents;
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products: [product] });
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Failed to fetch product components information', err)
    }
    return resp;
  },

  async addProductToCached ( { commit }, payload) {
    commit(types.PRODUCT_ADD_TO_CACHED, payload);
  },

  async addProductToCachedMultiple ( { commit }, payload) {
    commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, payload);
  },

  async clearProductState ({ commit }) {
    commit(types.PRODUCT_CLEARED)
  }
}

export default actions;