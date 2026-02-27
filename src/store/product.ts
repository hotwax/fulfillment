import { defineStore } from "pinia"
import { ProductService } from "@/services/ProductService"
import { hasError, searchProducts } from "@/adapter"
import logger from "@/logger"

interface ProductState {
  cached: Record<string, any>
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
        resp = await searchProducts({
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
        resp = await ProductService.fetchProductComponents({
          customParametersMap: {
            productId,
            pageIndex: 0,
            pageSize: 100
          },
          dataDocumentId: "ProductComponent",
          filterByDate: true
        })
        if (!hasError(resp)) {
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
    }
  },
  persist: true
})
