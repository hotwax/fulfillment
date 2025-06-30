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
        customParametersMap: {
          productId: productId,
          productAssocTypeId: "PRODUCT_COMPONENT",
          pageIndex: 0,
          pageSize: 100,  // maximum records we could have
        },
        selectedEntity: "org.apache.ofbiz.product.product.ProductAssoc",
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

  async fetchSampleProducts ({ commit, state }) {
    let products = state.sampleProducts ? JSON.parse(JSON.stringify(state.sampleProducts)) : []
    if(products.length) return;

    try {
      const resp = await ProductService.fetchSampleProducts({
        internalName_op: "empty",
        internalName_not: "Y",
        fieldsToSelect: ["internalName", "productId"],
        pageSize: 10
      }) as any;
  
      if(!hasError(resp) && resp.data?.length) {
        products = resp.data
        products.map((product: any) => {
          product.sku = product.internalName
          product.quantity = 2
          delete product["internalName"]
          delete product["productId"]
        })
        
      } else {
        throw resp.data;
      }
    } catch (error) {
      logger.error(error);
    }
    commit(types.PRODUCT_SAMPLE_PRODUCTS_UPDATED, products)
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