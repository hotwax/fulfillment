import { GetterTree } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const getters: GetterTree <UserState, RootState> = {
    isAuthenticated (state) {
        return !!state.token;
    },
    isUserAuthenticated(state) {
        return state.token && state.current
    },
    getUserToken (state) {
        return state.token
    },
    getUserPermissions (state) {
        return state.permissions;
    },
    getUserProfile (state) {
        return state.current
    },
    getCurrentFacility (state){
        return state.currentFacility
    },
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    getBaseUrl (state) {
        let baseURL = process.env.VUE_APP_BASE_URL;
        if (!baseURL) baseURL = state.instanceUrl;
        return baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
    },
    getCurrentEComStore(state) {
        return state.currentEComStore
    },
    getUserPreference(state) {
        return state.preference
    },
    getFieldMappings: (state) => (type?: string) => {
        if (type) {
            const fieldMapping = (state.fieldMappings as any)[type];
            return fieldMapping ? fieldMapping : {} 
        }
        return state.fieldMappings;
    },  
    getCurrentMapping(state) {
        return JSON.parse(JSON.stringify(state.currentMapping))
    }
}
export default getters;