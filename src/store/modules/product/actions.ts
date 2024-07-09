import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import logger from "@/logger";

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
        "entityName": "ProductAssoc",
          "inputFields": {
            "productId": productId,
            "productTypeId": "PRODUCT_COMPONENT"
          },
          "fieldList": ["productId", "productIdTo", "productAssocTypeId"],
          "viewIndex": 0,
          "viewSize": 250,  // maximum records we could have
          "distinct": "Y",
          "noConditionFind": "Y",
          "filterByDate": "Y"
      })
      if (!hasError(resp)) {
        const productComponents = resp.data.docs;
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
  }
}

export default actions;