import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '../../RootState'
import { getCurrentFacilityId } from '@/utils';

const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state, getters) => (productId: any, facilityId?: any) => {
    const id = facilityId ? facilityId : getCurrentFacilityId()
    return state.products[productId] ? state.products[productId][id] ? state.products[productId][id] : {} : {}
  }
}
export default getters;