import { defineStore } from "pinia"
import { api, commonUtil, logger } from "@common";


interface ProductState {
  cached: Record<string, any>
}

enum OPERATOR {
  AND = 'AND',
  BETWEEN = 'between',
  CONTAINS = 'contains',
  EQUALS = 'equals',
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_EQUAL_TO = 'greaterThanEqualTo',
  IN = 'in',
  LESS_THAN = 'lessThan',
  LESS_THAN_EQUAL_TO = 'lessThanEqualTo',
  LIKE = 'like',
  NOT = 'not',
  NOT_EMPTY = 'not-empty',
  NOT_EQUAL = 'notEqual',
  NOT_LIKE = 'notLike',
  OR = 'OR',
}

export const useProductStore = defineStore("product", {
  state: (): ProductState => ({
    cached: {}
  }),
  getters: {
    getProduct: (state) => (productId: string) => {
      return state.cached[productId] ? state.cached[productId] : {}
    },
    getProducts(state) {
      return state.cached
    }
  },
  actions: {
    addProductToCached(payload: any) {
      this.cached[payload.productId] = payload
    },
    addProductToCachedMultiple(payload: any) {
      if (payload.products) {
        payload.products.forEach((product: any) => {
          this.cached[product.productId] = product
        })
      }
    },
    clearProductState() {
      this.cached = {}
    },
    async fetchProducts({ productIds }: { productIds: any[] }) {
      const cachedProductIds = Object.keys(this.cached)
      const productIdFilter = productIds.filter((productId: any) => !cachedProductIds.includes(productId))
      const viewSize = productIdFilter.length
      if (!viewSize) return

      let resp
      try {
        resp = await this.searchProducts({
          filters: {
            productId: {
              value: productIdFilter,
              op: "OR"
            }
          },
          viewSize
        })
        if (resp.total) {
          const products = resp.products
          this.addProductToCachedMultiple({ products })
        } else {
          throw resp
        }
      } catch (err) {
        logger.error("Failed to fetch products information", err)
      }
      return resp
    },
    async searchProducts(params: { keyword?: string, sort?: string, qf?: string, viewSize?: number, viewIndex?: number, filters?: any }): Promise<any> {
      const rows = params.viewSize ?? 100
      const start = rows * (params.viewIndex ?? 0)
      const keyword = params.keyword?.trim();

      const payload = {
        "json": {
          "params": {
            rows,
            start,
            "qf": "productId^20 productName^40 internalName^30 search_goodIdentifications parentProductName",
            "sort": "sort_productName asc",
            "defType": "edismax"
          },
          "query": "*:*",
          "filter": "docType: PRODUCT"
        }
      }

      let keywordString = ""

      if (keyword) {
        if (keyword.startsWith('"')) {
          keywordString = keyword.replace('"', "").replace('"', "");
        } else {
          const keywordTokens = keyword.split(" ")
          const tokens: Array<string> = []

          keywordTokens.forEach((token: string) => {
            const regEx = /[`!@#$%^&*()_+\-=\\|,.<>?~]/
            if (regEx.test(token)) {
              const matchedTokens = [...new Set(token.match(regEx))]
              matchedTokens?.forEach((matchedToken: string) => {
                tokens.push(token.split(matchedToken).join(`\\\\${matchedToken}`))
              })
            } else {
              tokens.push(token)
            }
          })

          keywordString = tokens.join(`* ${OPERATOR.OR} `)
          keywordString += `* ${OPERATOR.OR} "${keyword}"^100`
        }

        if (keywordString) {
          payload.json.query = `(${keywordString})`
        }
      } else {
        params.qf && (payload.json.params.qf = params.qf)
        params.sort && (payload.json.params.sort = params.sort)
      }

      if (params.filters) {
        Object.keys(params.filters).forEach((key: any) => {
          const filterValue = params.filters[key].value;

          if (Array.isArray(filterValue)) {
            const filterOperator = params.filters[key].op ? params.filters[key].op : OPERATOR.OR;
            payload.json.filter += ` ${OPERATOR.AND} ${key}: (${filterValue.join(' ' + filterOperator + ' ')})`
          } else {
            payload.json.filter += ` ${OPERATOR.AND} ${key}: ${filterValue}`
          }
        })
      }

      if (!params.filters?.isVirtual) {
        payload.json.filter += ` ${OPERATOR.AND} isVirtual: false`
      }

      try {
        const resp = await api({
          url: "solr-query",
          method: "post",
          data: payload,
          baseURL: commonUtil.getOmsURL()
        }) as any;

        if (resp.status == 200 && !commonUtil.hasError(resp) && resp.data?.response?.numFound > 0) {
          const product = resp.data.response.docs
          return {
            products: product,
            total: resp.data.response.numFound
          }
        } else {
          return {
            products: {},
            total: 0
          }
        }
      } catch (err) {
        return Promise.reject({
          code: 'error',
          message: 'Something went wrong',
          serverResponse: err
        })
      }
    },
    async getProductInformation({ orders }: { orders: any[] }) {
      let productIds: any = new Set()
      orders.forEach((list: any) => {
        list.doclist.docs.forEach((order: any) => {
          if (order.productId) {
            productIds.add(order.productId)
          }
        })
      })

      productIds = [...productIds]
      if (productIds.length) {
        await this.fetchProducts({ productIds })
      }
    },
    async fetchProductComponents({ productId }: { productId: string }) {
      if (productId === "") return

      const cachedProductIds = Object.keys(this.cached)
      if (!cachedProductIds.includes(productId)) {
        await this.fetchProducts({ productIds: [productId] })
      }
      const product = this.cached[productId]
      if (product.productComponents && product.productComponents.length > 0) {
        return
      }

      let resp
      try {
        resp = await api({
          url: `/oms/dataDocumentView`,
          method: "post",
          data: {
            customParametersMap: {
              productId,
              pageIndex: 0,
              pageSize: 100
            },
            dataDocumentId: "ProductComponent",
            filterByDate: true
          }
        })
        if (!commonUtil.hasError(resp)) {
          const productComponents = resp.data.entityValueList
          const componentProductIds = productComponents.map((productComponent: any) => productComponent.productIdTo)
          await this.fetchProducts({ productIds: componentProductIds })

          product.productComponents = productComponents
          this.addProductToCachedMultiple({ products: [product] })
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch product components information", err)
      }
      return resp
    },
    async fetchBarcodeIdentificationDesc(params: any): Promise<any> {
      return api({
        url: `/oms/goodIdentificationTypes`,
        method: "get",
        params
      });
    },
    async createProductIdentificationPref(productStoreId: string): Promise<any> {
      const prefValue = {
        primaryId: "productId",
        secondaryId: ""
      }

      try {
        await api({
          url: `oms/productStores/${productStoreId}/settings`,
          method: "POST",
          data: {
            productStoreId,
            settingTypeEnumId: "PRDT_IDEN_PREF",
            settingValue: JSON.stringify(prefValue)
          }
        });
      } catch (err) {
        console.error(err)
      }

      return prefValue;
    }
  },
  persist: true
})
