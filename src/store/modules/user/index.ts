import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state: {
      token: '',
      permissions: [],
      current: {},
      instanceUrl: '',
      preference: {
        printShippingLabel: false,
        printPackingSlip: false
      },
      pwaState: {
        updateExists: false,
        registration: null,
      },
      omsRedirectionInfo: {
        url: "",
        token: ""
      },
      notifications: [],
      notificationPrefs: [],
      firebaseDeviceId: '',
      hasUnreadNotifications: true,
      allNotificationPrefs: [],
      partialOrderRejectionConfig: {},
      collateralRejectionConfig: {},
      affectQohConfig: {},
      isShipNowDisabled: false,
      isUnpackDisabled: false,
      isReservationFacilityFieldEnabled: false,
      isExternal: false
    },
    getters,
    actions,
    mutations,
}

// TODO
// store.registerModule('user', userModule);
export default userModule;