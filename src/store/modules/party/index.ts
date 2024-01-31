import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import RootState from '@/store/RootState'
import partyState from './partyState'

const partyModule: Module<partyState, RootState> = {
    namespaced: true,
    state: {
        partyNames: {},
    },
    getters,
    actions,
    mutations
}
export default partyModule