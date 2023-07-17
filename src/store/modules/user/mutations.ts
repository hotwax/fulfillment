import { MutationTree } from 'vuex'
import UserState from './UserState'
import * as types from './mutation-types'

const mutations: MutationTree <UserState> = {
    [types.USER_TOKEN_CHANGED] (state, payload) {
        state.token = payload.newToken
    },
    [types.USER_END_SESSION] (state) {
      state.token = ''
      state.current = null
      state.currentFacility = {}
      state.currentEComStore = {}
    },
    [types.USER_INFO_UPDATED] (state, payload) {
        state.current = payload
    },
    [types.USER_CURRENT_FACILITY_UPDATED] (state, payload) {
        state.currentFacility = payload;
    },
    [types.USER_INSTANCE_URL_UPDATED] (state, payload) {
        state.instanceUrl = payload;
    },
    [types.USER_CURRENT_ECOM_STORE_UPDATED](state, payload) {
        state.currentEComStore = payload;
    },
    [types.USER_PREFERENCE_UPDATED] (state, payload) {
        state.preference = {...state.preference, ...payload};
    },
    [types.USER_FIELD_MAPPINGS_UPDATED] (state, payload) {
        state.fieldMappings = payload;
    },  
    [types.USER_CURRENT_FIELD_MAPPING_UPDATED] (state, payload) {
        state.currentMapping = payload
    },
    [types.USER_FIELD_MAPPING_CREATED] (state, payload) {
        (state.fieldMappings as any)[payload.type][payload.id] = {
            name: payload.name,
            value: payload.value
        };
    }
}
export default mutations;