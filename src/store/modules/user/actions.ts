import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import { Settings } from 'luxon'
import { updateInstanceUrl, updateToken, resetConfig } from '@/adapter'
import logger from '@/logger'

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, { username, password }) {
    try {
      const resp = await UserService.login(username, password)
      if (resp.status === 200 && resp.data) {
        if (resp.data.token) {
          const permissionId = process.env.VUE_APP_PERMISSION_ID;
          if (permissionId) {
            const checkPermissionResponse = await UserService.checkPermission({
              data: {
                permissionId
              },
              headers: {
                Authorization:  'Bearer ' + resp.data.token,
                'Content-Type': 'application/json'
              }
            });

            if (checkPermissionResponse.status === 200 && !hasError(checkPermissionResponse) && checkPermissionResponse.data && checkPermissionResponse.data.hasPermission) {
              commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
              updateToken(resp.data.token)
              await dispatch('getProfile')
              if (resp.data._EVENT_MESSAGE_ && resp.data._EVENT_MESSAGE_.startsWith("Alert:")) {
              // TODO Internationalise text
                showToast(translate(resp.data._EVENT_MESSAGE_));
              }
              return resp.data;
            } else {
              const permissionError = 'You do not have permission to access the app.';
              showToast(translate(permissionError));
              logger.error("error", permissionError);
              return Promise.reject(new Error(permissionError));
            }
          } else {
            commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
            updateToken(resp.data.token)
            await dispatch('getProfile')
            return resp.data;
          }
        } else if (hasError(resp)) {
          showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
          logger.error("error", resp.data._ERROR_MESSAGE_);
          return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
        }
      } else {
        showToast(translate('Something went wrong'));
        logger.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }
    } catch (err: any) {
      showToast(translate('Something went wrong'));
      logger.error("error", err);
      return Promise.reject(new Error(err))
    }
    // return resp
  },

  /**
   * Logout user
   */
  async logout ({ commit }) {
    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    this.dispatch('order/clearOrders')
    resetConfig();
  },

  /**
   * Get User profile
   */
  async getProfile ( { commit, dispatch }) {
    try {
      const resp = await UserService.getProfile()
      if (resp.data.userTimeZone) {
        Settings.defaultZone = resp.data.userTimeZone;
      }

      // logic to remove duplicate facilities
      const facilityIds = new Set();
      const facilities = [] as Array<any>;

      resp.data.facilities.map((facility: any) => {
        if(!facilityIds.has(facility.facilityId)) {
          facilityIds.add(facility.facilityId)
          facilities.push(facility)
        }
      })

      resp.data.facilities = facilities

      const currentFacility = resp.data.facilities.length > 0 ? resp.data.facilities[0] : {};
      resp.data.stores = await dispatch('getEComStores', { facilityId: currentFacility.facilityId })

      commit(types.USER_INFO_UPDATED, resp.data);
      commit(types.USER_CURRENT_FACILITY_UPDATED, currentFacility);
    } catch(err) {
      logger.error('Failed to fetch user profile information', err)
    }
  },

  /**
   * update current facility information
   */
  async setFacility ({ commit, dispatch, state }, payload) {
    const user = JSON.parse(JSON.stringify(state.current as any));
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
    user.stores = await dispatch("getEComStores", { facilityId: payload.facility.facilityId });
    commit(types.USER_INFO_UPDATED, user);
    this.dispatch('order/clearOrders')
  },
  
  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, payload) {
    const resp = await UserService.setUserTimeZone(payload)
    if (resp.status === 200 && !hasError(resp)) {
      const current: any = state.current;
      current.userTimeZone = payload.tzId;
      commit(types.USER_INFO_UPDATED, current);
      showToast(translate("Time zone updated successfully"));
    }
  },

  // Set User Instance Url
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
    updateInstanceUrl(payload)
  },

  async getEComStores({ commit }, payload) {
    let resp;

    try {
      const param = {
        "inputFields": {
          "facilityId": payload.facilityId,
          "storeName_op": "not-empty"
        },
        "fieldList": ["productStoreId", "storeName"],
        "entityName": "ProductStoreFacilityDetail",
        "distinct": "Y",
        "noConditionFind": "Y"
      }

      resp = await UserService.getEComStores(param);
      if(!hasError(resp)) {
        const eComStores = resp.data.docs

        const userPref =  await UserService.getUserPreference({
          'userPrefTypeId': 'SELECTED_BRAND'
        });
        const userPrefStore = eComStores.find((store: any) => store.productStoreId == userPref.data.userPrefValue)

        commit(types.USER_CURRENT_ECOM_STORE_UPDATED, userPrefStore ? userPrefStore : eComStores.length > 0 ? eComStores[0] : {});
        return eComStores
      } else {
        logger.error('Failed to get ecom stores', resp.data);
      }
    } catch(error) {
      logger.error('Failed to get ecom stores', error);
    }
    return []
  },

  /**
   *  update current eComStore information
  */
  async setEComStore({ commit }, payload) {
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.eComStore);
    await UserService.setUserPreference({
      'userPrefTypeId': 'SELECTED_BRAND',
      'userPrefValue': payload.eComStore.productStoreId
    });
  },
}

export default actions;