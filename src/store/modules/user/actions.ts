import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import store from '@/store';
import UserState from './UserState'
import * as types from './mutation-types'
import { showToast, getCurrentFacilityId, getProductStoreId } from '@/utils'
import { hasError } from '@/adapter'
import { translate } from '@hotwax/dxp-components'
import { DateTime, Settings } from 'luxon';
import { logout, updateInstanceUrl, updateToken, resetConfig, getUserFacilities, getNotificationEnumIds,
  getNotificationUserPrefTypeIds, storeClientRegistrationToken } from '@/adapter'
import logger from '@/logger'
import { getServerPermissionsFromRules, prepareAppPermissions, resetPermissions, setPermissions } from '@/authorization'
import { useAuthStore, useUserStore, useProductIdentificationStore } from '@hotwax/dxp-components'
import emitter from '@/event-bus'
import { generateDeviceId, generateTopicName } from '@/utils/firebase'
import router from '@/router';

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, payload) {
    try {
      const {token, oms, omsRedirectionUrl} = payload;
      dispatch("setUserInstanceUrl", oms);

      // Getting the permissions list from server
      const permissionId = process.env.VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions = await UserService.getUserPermissions({
        permissionIds: [...new Set(serverPermissionsFromRules)]
      }, token);
      const appPermissions = prepareAppPermissions(serverPermissions);

      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId);
        // If there are any errors or permission check fails do not allow user to login
        if (!hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          logger.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const userProfile = await UserService.getUserProfile(token);
      
      //fetching user facilities
      const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_STOREFULFILLMENT_ADMIN" );
      const facilities = await useUserStore().getUserFacilities(userProfile?.partyId, "OMS_FULFILLMENT", isAdminUser)
      await useUserStore().getFacilityPreference('SELECTED_FACILITY')

      if (!facilities.length) throw 'Unable to login. User is not assocaited with any facility'

      userProfile.facilities = facilities;
      // Getting unique facilities
      userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
        if (uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
        else uniqueFacilities.push(facility.facilityId);
        return uniqueFacilities
      }, []);

      const facilityId = router.currentRoute.value.query.facilityId
      let isQueryFacilityFound = false
      if (facilityId) {
        const facility = userProfile.facilities.find((facility: any) => facility.facilityId === facilityId);
        if (facility) {
          isQueryFacilityFound = true
          useUserStore().currentFacility = facility
        } else {
          showToast(translate("Redirecting to home page due to incorrect information being passed."))
        }
      }

      // TODO Use a separate API for getting facilities, this should handle user like admin accessing the app
      const currentFacility: any = useUserStore().getCurrentFacility
      userProfile.stores = await useUserStore().getEComStoresByFacility(currentFacility.facilityId);
      await useUserStore().getEComStorePreference('SELECTED_BRAND');
      const preferredStore: any = useUserStore().getCurrentEComStore
      /*  ---- Guard clauses ends here --- */

      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }
      
      if(omsRedirectionUrl) {
        const api_key = await UserService.moquiLogin(omsRedirectionUrl, token)
        if (api_key) {
          dispatch("setOmsRedirectionInfo", { url: omsRedirectionUrl, token: api_key })
        } else {
          showToast(translate("Some of the app functionality will not work due to missing configuration."))
          logger.error("Some of the app functionality will not work due to missing configuration.");
        }
      } else {
        showToast(translate("Some of the app functionality will not work due to missing configuration."))
        logger.error("Some of the app functionality will not work due to missing configuration.")
      }

      updateToken(token)

      // TODO user single mutation
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })

      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(preferredStore.productStoreId)
        .catch((error) => logger.error(error));

      await dispatch("fetchAllNotificationPrefs");
      this.dispatch('util/findProductStoreShipmentMethCount')
      await this.dispatch('util/fetchCarrierShipmentBoxTypes')
      //Generic call for fetching all the Product store settings in one go.
      await this.dispatch("util/fetchProductStoreSettings",preferredStore.productStoreId)

      const orderId = router.currentRoute.value.query.orderId
      if (isQueryFacilityFound && orderId) {
        return `/transfer-order-details/${orderId}/open`;
      }
    } catch (err: any) {
      // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
      // TODO Check if handling of specific status codes is required.
      showToast(translate('Something went wrong while login. Please contact administrator.'));
      logger.error("error: ", err.toString());
      return Promise.reject(err instanceof Object ? err : new Error(err));
    }
  },

  /**
   * Logout user
   */
  async logout ({ commit }, payload) {
    // store the url on which we need to redirect the user after logout api completes in case of SSO enabled
    let redirectionUrl = ''

    emitter.emit('presentLoader', { message: 'Logging out', backdropDismiss: false })

    // Calling the logout api to flag the user as logged out, only when user is authorised
    // if the user is already unauthorised then not calling the logout api as it returns 401 again that results in a loop, thus there is no need to call logout api if the user is unauthorised
    if(!payload?.isUserUnauthorised) {
      let resp;

      // wrapping the parsing logic in try catch as in some case the logout api makes redirection, and then we are unable to parse the resp and thus the logout process halts
      try {
        resp = await logout();

        // Added logic to remove the `//` from the resp as in case of get request we are having the extra characters and in case of post we are having 403
        resp = JSON.parse(resp.startsWith('//') ? resp.replace('//', '') : resp)
      } catch(err) {
        logger.error('Error parsing data', err)
      }

      if(resp?.logoutAuthType == 'SAML2SSO') {
        redirectionUrl = resp.logoutUrl
      }
    }

    const authStore = useAuthStore()
    const userStore = useUserStore()
    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    this.dispatch('order/clearOrders')
    this.dispatch("orderLookup/clearOrderLookup")
    this.dispatch('user/clearNotificationState')
    this.dispatch('transferorder/clearTransferOrdersList')
    this.dispatch('transferorder/clearTransferOrderFilters')
    this.dispatch('transferorder/clearCurrentTransferOrder')
    this.dispatch('transferorder/clearCurrentTransferShipment')
    this.dispatch('product/clearProductState')
    this.dispatch('util/clearUtilState')
    resetConfig();
    resetPermissions();

    // reset plugin state on logout
    authStore.$reset()
    userStore.$reset()

    // If we get any url in logout api resp then we will redirect the user to the url
    if(redirectionUrl) {
      window.location.href = redirectionUrl
    }

    emitter.emit('dismissLoader')
    return redirectionUrl;
  },

  /**
   * update current facility information
   */
  async setFacility ({ commit, dispatch, state }, facility) {
    // On slow api response, setFacility takes long to update facility in state.
    // Hence displaying loader to not allowing user to navigate to orders page to avoid wrong results.
    emitter.emit('presentLoader', {message: 'Updating facility', backdropDismiss: false})

    try {
      const previousEComStoreId = getProductStoreId()
      const userProfile = JSON.parse(JSON.stringify(state.current as any));
      userProfile.stores = await useUserStore().getEComStoresByFacility(facility.facilityId);
      await useUserStore().getEComStorePreference('SELECTED_BRAND');
      const preferredStore: any = useUserStore().getCurrentEComStore
      commit(types.USER_INFO_UPDATED, userProfile);

      if(previousEComStoreId !== preferredStore.productStoreId) {
        await useProductIdentificationStore().getIdentificationPref(preferredStore.productStoreId)
          .catch((error) => logger.error(error));

        await this.dispatch("util/fetchProductStoreSettings",preferredStore.productStoreId)

      }
    } catch(error: any) {
      logger.error(error);
      showToast(error?.message ? error.message : translate("Something went wrong"))
    }

    emitter.emit('dismissLoader')
  },
  
  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, timeZoneId) {
    const current: any = state.current;
    current.userTimeZone = timeZoneId;
    commit(types.USER_INFO_UPDATED, current);
  },

  // Set User Instance Url
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
    updateInstanceUrl(payload)
  },

  /**
   *  update current eComStore information
  */
  async setEComStore({ commit, dispatch }, productStoreId) {
    // Get product identification from api using dxp-component
    await useProductIdentificationStore().getIdentificationPref(productStoreId)
      .catch((error) => logger.error(error));

    await this.dispatch("util/fetchProductStoreSettings", productStoreId)

  },

  setUserPreference({ commit }, payload){
    commit(types.USER_PREFERENCE_UPDATED, payload)
  },
  
  updatePwaState({ commit }, payload) {
    commit(types.USER_PWA_STATE_UPDATED, payload);
  },
  setOmsRedirectionInfo({ commit }, payload) {
    commit(types.USER_OMS_REDIRECTION_INFO_UPDATED, payload)
  },

  addNotification({ state, commit }, payload) {
    const notifications = JSON.parse(JSON.stringify(state.notifications))
    notifications.push({ ...payload.notification, time: DateTime.now().toMillis() })
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, true)
    if (payload.isForeground) {
      showToast(translate("New notification received."));
    }
    commit(types.USER_NOTIFICATIONS_UPDATED, notifications)
  },

  async fetchNotificationPreferences({ commit, state }) {
    let resp = {} as any

    let notificationPreferences = [], enumerationResp = [], userPrefIds = [] as any
    try {
      resp = await getNotificationEnumIds(process.env.VUE_APP_NOTIF_ENUM_TYPE_ID as any)
      enumerationResp = resp.docs
      resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID as any, state.current.userLoginId)
      userPrefIds = resp.docs.map((userPref: any) => userPref.userPrefTypeId)
    } catch (error) {
      logger.error(error)
    } finally {
      // checking enumerationResp as we want to show disbaled prefs if only getNotificationEnumIds returns
      // data and getNotificationUserPrefTypeIds fails or returns empty response (all disbaled)
      if (enumerationResp.length) {
        notificationPreferences = enumerationResp.reduce((notifactionPref: any, pref: any) => {
          const userPrefTypeIdToSearch = generateTopicName(getCurrentFacilityId(), pref.enumId)
          notifactionPref.push({ ...pref, isEnabled: userPrefIds.includes(userPrefTypeIdToSearch) })
          return notifactionPref
        }, [])
      }
      commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, notificationPreferences)
    }
  },

  async storeClientRegistrationToken({ commit }, registrationToken) {
    const firebaseDeviceId = generateDeviceId()
    commit(types.USER_FIREBASE_DEVICEID_UPDATED, firebaseDeviceId)

    try {
      await storeClientRegistrationToken(registrationToken, firebaseDeviceId,  process.env.VUE_APP_NOTIF_APP_ID as any)
    } catch (error) {
      logger.error(error)
    }
  },

  async fetchAllNotificationPrefs({ commit, state }) {
    let allNotificationPrefs = [];

    try {
      const resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID as any, state.current.userLoginId)
      allNotificationPrefs = resp.docs
    } catch(error) {
      logger.error(error)
    }

    commit(types.USER_ALL_NOTIFICATION_PREFS_UPDATED, allNotificationPrefs)
  },

  async updateNotificationPreferences({ commit }, payload) {
    commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, payload)
  },

  clearNotificationState({ commit }) {
    commit(types.USER_NOTIFICATIONS_UPDATED, [])
    commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, [])
    commit(types.USER_FIREBASE_DEVICEID_UPDATED, '')
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, true)
  },

  setUnreadNotificationsStatus({ commit }, payload) {
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, payload)
  }

} 

export default actions;