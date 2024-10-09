import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '../../RootState'
import { useUserStore } from "@hotwax/dxp-components";

const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state, getters) => (productId: any, facilityId?: any) => {
    const getCurrentFacility: any = useUserStore().getCurrentFacility
    const currentFacilityId = getCurrentFacility?.facilityId
    const id = facilityId ? facilityId : currentFacilityId

    return state.products[productId] ? state.products[productId][id] ? state.products[productId][id] : {} : {}
  }
}
export default getters;