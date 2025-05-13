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
      notifications: [],
      notificationPrefs: [],
      firebaseDeviceId: '',
      hasUnreadNotifications: true,
      allNotificationPrefs: [],
      newRejectionApiConfig: {},
      partialOrderRejectionConfig: {},
      collateralRejectionConfig: {},
      affectQohConfig: {},
      isShipNowDisabled: false,
      isUnpackDisabled: false,
      isReservationFacilityFieldEnabled: false
    },
    getters,
    actions,
    mutations,
}

// TODO
// store.registerModule('user', userModule);
export default userModule;