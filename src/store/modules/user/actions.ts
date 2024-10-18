import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import store from '@/store';
import UserState from './UserState'
import * as types from './mutation-types'
import { showToast } from '@/utils'
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

const getProductStoreId = () => {
  const currentEComStore: any = useUserStore().getCurrentEComStore;
  return currentEComStore.productStoreId
};

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, payload) {
    try {
      const {token, oms} = payload;
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
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId );
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
      const baseURL = store.getters['user/getBaseUrl'];
      const facilities = await getUserFacilities(token, baseURL, userProfile?.partyId, "OMS_FULFILLMENT", isAdminUser);


      if (!facilities.length) throw 'Unable to login. User is not assocaited with any facility'

      userProfile.facilities = facilities;
      // Getting unique facilities
      userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
        if (uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
        else uniqueFacilities.push(facility.facilityId);
        return uniqueFacilities
      }, []);

      // TODO Use a separate API for getting facilities, this should handle user like admin accessing the app
      const currentFacility = userProfile.facilities[0];
      userProfile.stores = await useUserStore().getEComStores(currentFacility.facilityId);
      await useUserStore().getEComStorePreference('SELECTED_BRAND');
      const preferredStore: any = useUserStore().getCurrentEComStore
      /*  ---- Guard clauses ends here --- */

      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }
      updateToken(token)

      dispatch('getFieldMappings')

      // TODO user single mutation
      commit(types.USER_CURRENT_FACILITY_UPDATED, currentFacility);
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })

      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(preferredStore.productStoreId)
        .catch((error) => logger.error(error));

      await dispatch("fetchAllNotificationPrefs");
      this.dispatch('util/findProductStoreShipmentMethCount')
      this.dispatch('util/getForceScanSetting', preferredStore.productStoreId);
      await dispatch('getPartialOrderRejectionConfig')
      await dispatch('getCollateralRejectionConfig')
    
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
    this.dispatch('util/updateForceScanStatus', false)
    this.dispatch('user/clearPartialOrderRejectionConfig')
    this.dispatch('user/clearCollateralRejectionConfig')
    this.dispatch('transferorder/clearTransferOrdersList')
    this.dispatch('transferorder/clearTransferOrderFilters')
    this.dispatch('transferorder/clearCurrentTransferOrder')
    this.dispatch('transferorder/clearCurrentTransferShipment')
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
  async setFacility ({ commit, state }, payload) {
    // On slow api response, setFacility takes long to update facility in state.
    // Hence displaying loader to not allowing user to navigate to orders page to avoid wrong results.
    emitter.emit('presentLoader', {message: 'Updating facility', backdropDismiss: false})

    const userProfile = JSON.parse(JSON.stringify(state.current as any));
    userProfile.stores = await useUserStore().getEComStores(payload.facility.facilityId);

    await useUserStore().getEComStorePreference('SELECTED_BRAND');
    commit(types.USER_INFO_UPDATED, userProfile);
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
    this.dispatch('order/clearOrders')

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

  async getFieldMappings({ commit }) {
    let fieldMappings = {} as any;
    try {
      const payload = {
        "inputFields": {
          "mappingPrefTypeEnumId": Object.values(JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)),
          "mappingPrefTypeEnumId_op": "in"
        },
        "fieldList": ["mappingPrefName", "mappingPrefId", "mappingPrefValue", "mappingPrefTypeEnumId"],
        "filterByDate": "Y",
        "viewSize": 20, // considered a user won't have more than 20 saved mappings
        "entityName": "DataManagerMapping"
      }

      const mappingTypes = JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)
      
      // This is needed as it would easy to get app name to categorize mappings
      const mappingTypesFlip = Object.keys(mappingTypes).reduce((mappingTypesFlip: any, mappingType) => {
        // Updating fieldMpaaings here in case the API fails 
        fieldMappings[mappingType] = {};
        mappingTypesFlip[mappingTypes[mappingType]] = mappingType;
        return mappingTypesFlip;
      }, {});

      const resp = await UserService.getFieldMappings(payload);
      if(resp.status == 200 && !hasError(resp) && resp.data.count > 0) {
        // updating the structure for mappings so as to directly store it in state
        fieldMappings = resp.data.docs.reduce((mappings: any, fieldMapping: any) => {
          const mappingType = mappingTypesFlip[fieldMapping.mappingPrefTypeEnumId]
          const mapping = mappings[mappingType];

          mapping[fieldMapping.mappingPrefId] = {
            name: fieldMapping.mappingPrefName,
            value: JSON.parse(fieldMapping.mappingPrefValue)
          }

          fieldMappings[mappingType] = mapping;
          return mappings;
        }, fieldMappings)

      } else {
        logger.error('error', 'No field mapping preference found')
      }
    } catch(err) {
      logger.error('error', err)
    }
    commit(types.USER_FIELD_MAPPINGS_UPDATED, fieldMappings)
  },

  async createFieldMapping({ commit }, payload) {
    try {

      const mappingTypes = JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)
      const mappingPrefTypeEnumId = mappingTypes[payload.mappingType];

      const params = {
        mappingPrefId: payload.id,
        mappingPrefName: payload.name,
        mappingPrefValue: JSON.stringify(payload.value),
        mappingPrefTypeEnumId
      }

      const resp = await UserService.createFieldMapping(params);

      if(resp.status == 200 && !hasError(resp)) {

        // using id coming from server, as the random generated id sent in payload is not set as mapping id
        // and an auto generated mapping from server is set as id
        const fieldMapping = {
          id: resp.data.mappingPrefId,
          name: payload.name,
          value: payload.value,
          type: payload.mappingType
        }

        commit(types.USER_FIELD_MAPPING_CREATED, fieldMapping)
        showToast(translate('This CSV mapping has been saved.'))
      } else {
        logger.error('error', 'Failed to save CSV mapping.')
        showToast(translate('Failed to save CSV mapping.'))
      }
    } catch(err) {
      logger.error('error', err)
      showToast(translate('Failed to save CSV mapping.'))
    }
  },

  async updateFieldMapping({ commit, state }, payload) {
    try {

      const mappingTypes = JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)
      const mappingPrefTypeEnumId = mappingTypes[payload.mappingType];

      const params = {
        mappingPrefId: payload.id,
        mappingPrefName: payload.name,
        mappingPrefValue: JSON.stringify(payload.value),
        mappingPrefTypeEnumId
      }

      const resp = await UserService.updateFieldMapping(params);

      if(resp.status == 200 && !hasError(resp)) {
        const mappings = JSON.parse(JSON.stringify(state.fieldMappings))

        mappings[payload.mappingType][payload.id] = {
          name: payload.name,
          value: payload.value
        }

        commit(types.USER_FIELD_MAPPINGS_UPDATED, mappings)
        showToast(translate('Changes to the CSV mapping has been saved.'))
      } else {
        logger.error('error', 'Failed to update CSV mapping.')
        showToast(translate('Failed to update CSV mapping.'))
      }
    } catch(err) {
      logger.error('error', err)
      showToast(translate('Failed to update CSV mapping.'))
    }
  },

  async deleteFieldMapping({ commit, state }, payload) {
    try {
      const resp = await UserService.deleteFieldMapping({
        'mappingPrefId': payload.id
      });

      if(resp.status == 200 && !hasError(resp)) {

        const mappings = JSON.parse(JSON.stringify(state.fieldMappings))
        delete mappings[payload.mappingType][payload.id]

        commit(types.USER_FIELD_MAPPINGS_UPDATED, mappings)
        commit(types.USER_CURRENT_FIELD_MAPPING_UPDATED, {
          id: '',
          mappingType: '',
          name: '',
          value: {}
        })
        showToast(translate('This CSV mapping has been deleted.'))
      } else {
        logger.error('error', 'Failed to delete CSV mapping.')
        showToast(translate('Failed to delete CSV mapping.'))
      }
    } catch(err) {
      logger.error('error', err)
      showToast(translate('Failed to delete CSV mapping.'))
    }
  },

  async updateCurrentMapping({ commit, state }, payload) {
    const currentMapping = {
      id: payload.id,
      mappingType: payload.mappingType,
      ...(state.fieldMappings as any)[payload.mappingType][payload.id]
    }
    commit(types.USER_CURRENT_FIELD_MAPPING_UPDATED, currentMapping)
  },

  async clearCurrentMapping({ commit }) {
    commit(types.USER_CURRENT_FIELD_MAPPING_UPDATED, {
      id: '',
      mappingType: '',
      name: '',
      value: {}
    })
  },
  
  updatePwaState({ commit }, payload) {
    commit(types.USER_PWA_STATE_UPDATED, payload);
  },

  async updatePartialOrderRejectionConfig ({ dispatch }, payload) {  
    let resp = {} as any;
    try {
      if(!await UserService.isEnumExists("FULFILL_PART_ODR_REJ")) {
        resp = await UserService.createEnumeration({
          "enumId": "FULFILL_PART_ODR_REJ",
          "enumTypeId": "PROD_STR_STNG",
          "description": "Fulfillment Partial Order Rejection",
          "enumName": "Fulfillment Partial Order Rejection",
          "enumCode": "FULFILL_PART_ODR_REJ"
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      if (!payload.fromDate) {
        //Create Product Store Setting
        payload = {
          ...payload, 
          "productStoreId": getProductStoreId(),
          "settingTypeEnumId": "FULFILL_PART_ODR_REJ",
          "fromDate": DateTime.now().toMillis()
        }
        resp = await UserService.createPartialOrderRejectionConfig(payload) as any
      } else {
        //Update Product Store Setting
        resp = await UserService.updatePartialOrderRejectionConfig(payload) as any
      }

      if (!hasError(resp)) {
        showToast(translate('Configuration updated'))
      } else {
        showToast(translate('Failed to update configuration'))
      }
    } catch(err) {
      showToast(translate('Failed to update configuration'))
      logger.error(err)
    }

    // Fetch the updated configuration
    await dispatch("getPartialOrderRejectionConfig");
  },
  async updateCollateralRejectionConfig ({ dispatch }, payload) {  
    let resp = {} as any;
    try {
      if(!await UserService.isEnumExists("FF_COLLATERAL_REJ")) {
        resp = await UserService.createEnumeration({
          "enumId": "FF_COLLATERAL_REJ",
          "enumTypeId": "PROD_STR_STNG",
          "description": "Fulfillment Collateral Rejection",
          "enumName": "Fulfillment Collateral Rejection",
          "enumCode": "FF_COLLATERAL_REJ"
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      if (!payload.fromDate) {
        //Create Product Store Setting
        payload = {
          ...payload, 
          "productStoreId": getProductStoreId(),
          "settingTypeEnumId": "FF_COLLATERAL_REJ",
          "fromDate": DateTime.now().toMillis()
        }
        resp = await UserService.createCollateralRejectionConfig(payload) as any
      } else {
        //Update Product Store Setting
        resp = await UserService.updateCollateralRejectionConfig(payload) as any
      }

      if (!hasError(resp)) {
        showToast(translate('Configuration updated'))
      } else {
        showToast(translate('Failed to update configuration'))
      }
    } catch(err) {
      showToast(translate('Failed to update configuration'))
      logger.error(err)
    }

    // Fetch the updated configuration
    await dispatch("getCollateralRejectionConfig");
  },
  async getPartialOrderRejectionConfig ({ commit }) {
    let config = {};
    const params = {
      "inputFields": {
        "productStoreId": getProductStoreId(),
        "settingTypeEnumId": "FULFILL_PART_ODR_REJ"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreSetting",
      "fieldList": ["productStoreId", "settingTypeEnumId", "settingValue", "fromDate"],
      "viewSize": 1
    } as any

    try {
      const resp = await UserService.getPartialOrderRejectionConfig(params)
      if (resp.status === 200 && !hasError(resp) && resp.data?.docs) {
        config = resp.data?.docs[0];
      } else {
        logger.error('Failed to fetch partial order rejection configuration');
      }
    } catch (err) {
      logger.error(err);
    } 
    commit(types.USER_PARTIAL_ORDER_REJECTION_CONFIG_UPDATED, config);   
  },
  async getCollateralRejectionConfig ({ commit }) {
    let config = {};
    const params = {
      "inputFields": {
        "productStoreId": getProductStoreId(),
        "settingTypeEnumId": "FF_COLLATERAL_REJ"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreSetting",
      "fieldList": ["productStoreId", "settingTypeEnumId", "settingValue", "fromDate"],
      "viewSize": 1
    } as any

    try {
      const resp = await UserService.getCollateralRejectionConfig(params)
      if (resp.status === 200 && !hasError(resp) && resp.data?.docs) {
        config = resp.data?.docs[0];
      } else {
        logger.error('Failed to fetch collateral rejection configuration');
      }
    } catch (err) {
      logger.error(err);
    } 
    commit(types.USER_COLLATERAL_REJECTION_CONFIG_UPDATED, config);   
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
    const facilityId = (state.currentFacility as any).facilityId
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
          const userPrefTypeIdToSearch = generateTopicName(facilityId, pref.enumId)
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
  },
  clearPartialOrderRejectionConfig ({ commit }) {
    commit(types.USER_PARTIAL_ORDER_REJECTION_CONFIG_UPDATED, {})
  },
  clearCollateralRejectionConfig ({ commit }) {
    commit(types.USER_COLLATERAL_REJECTION_CONFIG_UPDATED, {})
  }
}

export default actions;