import { defineStore } from "pinia"
import { api, commonUtil, logger, translate } from "@common";
import { useProductStore as useAppProductStore } from "@/store/productStore";

interface StockState {
  products: Record<string, any>
  fetchingStatus: Record<string, boolean>
}

export const useStockStore = defineStore("stock", {
  state: (): StockState => ({
    products: {},
    fetchingStatus: {}
  }),
  getters: {
    getProductStock: (state) => (productId: any, facilityId?: any) => {
      const id = facilityId ? facilityId : useAppProductStore().getCurrentFacility?.facilityId
      return state.products[productId] ? state.products[productId][id] ? state.products[productId][id] : {} : {}
    },
    isFetchingStock: (state) => (productId: any, facilityId?: any) => {
      const id = facilityId ? facilityId : useAppProductStore().getCurrentFacility?.facilityId
      return !!state.fetchingStatus[`${productId}_${id}`]
    }
  },
  actions: {
    addProductStock(payload: any) {
      if (this.products[payload.productId]) {
        this.products[payload.productId][payload.facilityId] = payload.stock
      } else {
        this.products[payload.productId] = {
          [payload.facilityId]: payload.stock
        }
      }
    },
    async fetchStock({ productId, facilityId = "" }: { productId: any; facilityId?: any }) {
      const id = facilityId ? facilityId : useAppProductStore().getCurrentFacility?.facilityId
      const key = `${productId}_${id}`
      // A fetch for this product and facility is already running
      if (this.fetchingStatus[key]) {
        return
      }

      this.fetchingStatus[key] = true
      try {
        const resp: any = await api({
          url: `/poorti/getInventoryAvailableByFacility`,
          method: "GET",
          params: {
            productId,
            facilityId: id
          },
        });

        if (!commonUtil.hasError(resp)) {
          this.addProductStock({ productId: productId, facilityId: id, stock: resp.data })

          return resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error(err);
        const serverError = commonUtil.getErrorMessage(err);
        commonUtil.showToast(`${translate("No data available")}. ${serverError}`);
      } finally {
        delete this.fetchingStatus[key]
      }
    }
  },
  persist: false
})
