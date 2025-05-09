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
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    getBaseUrl (state) {
        let baseURL = process.env.VUE_APP_BASE_URL;
        if (!baseURL) baseURL = state.instanceUrl;
        return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`;
    },
    getUserPreference(state) {
        return state.preference
    },
    getPwaState(state) {
        return state.pwaState;
    },
    getMaargBaseUrl (state) {
        const url = state.omsRedirectionInfo.url
        return url.startsWith('http') ? url.includes('/rest/s1/') ? url : `${url}/rest/s1/` : `https://${url}.hotwax.io/rest/s1/`;
    },
    getOmsRedirectionInfo(state) {
        return state.omsRedirectionInfo
    },
    getNotifications(state) {
        return state.notifications.sort((a: any, b: any) => b.time - a.time)
    },
    getNotificationPrefs(state) {
        return state.notificationPrefs
    },
    getFirebaseDeviceId(state) {
        return state.firebaseDeviceId
    },
    getUnreadNotificationsStatus(state) {
        return state.hasUnreadNotifications
    },
    getAllNotificationPrefs(state) {
        return state.allNotificationPrefs
    },
    getNewRejectionApiConfig(state) {
        return  state.newRejectionApiConfig;
    },
    getPartialOrderRejectionConfig(state) {
        return  state.partialOrderRejectionConfig;
    },
    getCollateralRejectionConfig(state) {
        return  state.collateralRejectionConfig;
    },
    getAffectQohConfig(state) {
        return  state.affectQohConfig;
    },
    isShipNowDisabled(state) {
        return state.isShipNowDisabled;
    },
    isUnpackDisabled(state) {
        return state.isUnpackDisabled;
    },
    isReservationFacilityFieldEnabled(state) {
        return state.isReservationFacilityFieldEnabled;
    }
}
export default getters;