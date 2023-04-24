import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UtilState, RootState> = {
  getRejectReasons(state) {
    return state.rejectReasons ? state.rejectReasons : []
  },
  getPartyName: (state) => (partyId: string) => {
    return state.partyNames[partyId] ? state.partyNames[partyId] : ''
  }
}
export default getters;