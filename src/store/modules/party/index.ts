import { Module } from 'vuex'
import RootState from '@/store/RootState'
import PartyState from './PartyState'

const partyModule: Module<PartyState, RootState> = {
    namespaced: true,
    state: {
        partyNames: {}
    }
}

export default partyModule;