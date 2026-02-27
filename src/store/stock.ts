import { defineStore } from "pinia"
import { StockService } from "@/services/StockService"
import { hasError } from "@/adapter"
import logger from "@/logger"
import { commonUtil } from "@/utils/commonUtil"
import { translate } from "@hotwax/dxp-components"

interface StockState {
  products: Record<string, any>
}

export const useStockStore = defineStore("stock", {
  state: (): StockState => ({
    products: {}
  }),
  getters: {
    getProductStock: (state) => (productId: any, facilityId?: any) => {
      const id = facilityId ? facilityId : commonUtil.getCurrentFacilityId()
      return state.products[productId] ? state.products[productId][id] ? state.products[productId][id] : {} : {}
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
      const id = facilityId ? facilityId : commonUtil.getCurrentFacilityId()
      try {
        const payload = {
          productId,
          facilityId: id
        }

        const resp: any = await StockService.getInventoryAvailableByFacility(payload)

        if (!hasError(resp)) {
          this.addProductStock({ productId: payload.productId, facilityId: id, stock: resp.data })
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error(err)
        commonUtil.showToast(translate("No data available"))
      }
    }
  },
  persist: false
})
