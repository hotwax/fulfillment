import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '../../RootState'

const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state, getters, RootState) => (productId: any, facilityId?: any) => {
    const id = facilityId ? facilityId : RootState.user.currentFacility.facilityId

    return state.products[productId] ? state.products[productId][id] ? state.products[productId][id] : {} : {}
  }
}
export default getters;