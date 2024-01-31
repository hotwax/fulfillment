import { GetterTree } from 'vuex'
import partyState from './partyState'
import RootState from '@/store/RootState';

const getters: GetterTree <partyState, RootState> ={
    getPartyName: (state) => (partyId: string) => {
        return state.partyNames[partyId] ? state.partyNames[partyId] : ''
      },
}
export default getters;