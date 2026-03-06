import { defineStore } from "pinia"
import { UserService } from "@/services/UserService"
import { NotificationService } from "@/services/NotificationService"
import { commonUtil } from "@/utils/commonUtil";
import { translate } from "@common";
import { hasError, hasPermission, getOmsURL, getMaargURL } from "@common/utils/commonUtil";
import { UtilService } from "@/services/UtilService"
import { api } from "@common"
import { DateTime, Settings } from "luxon"
import logger from "@common/core/logger"
import { getServerPermissionsFromRules, prepareAppPermissions, setPermissions } from "@/authorization"
import { fireBaseUtil } from "@/utils/fireBaseUtil"
import { useUtilStore } from "@/store/util"
import { useAuth } from "@/composables/auth";
import { useProductIdentificationStore } from "@/store/productIdentification";
import { cookieHelper } from "@common/helpers/cookieHelper";

interface UserState {
  permissions: any[]
  current: any
  instanceUrl: string
  currentFacility: any
  currentEComStore: any
  preference: {
    printShippingLabel: boolean
    printPackingSlip: boolean
  }
  pwaState: {
    updateExists: boolean
    registration: any
  }
  notifications: any[]
  notificationPrefs: any[]
  firebaseDeviceId: string
  hasUnreadNotifications: boolean
  allNotificationPrefs: any[],
  timeZones: any[],
  currentTimeZoneId: string,
  localeOptions: any,
  locale: string
}

export const useUserStore = defineStore("appUser", {
  state: (): UserState => ({
    permissions: [],
    current: {},
    instanceUrl: "",
    currentFacility: {},
    currentEComStore: {},
    preference: {
      printShippingLabel: false,
      printPackingSlip: false
    },
    pwaState: {
      updateExists: false,
      registration: null
    },
    notifications: [],
    notificationPrefs: [],
    firebaseDeviceId: "",
    hasUnreadNotifications: true,
    allNotificationPrefs: [],
    timeZones: [],
    currentTimeZoneId: '',
    localeOptions: import.meta.env.VITE_LOCALES ? JSON.parse(import.meta.env.VITE_LOCALES) : { "en-US": "English" },
    locale: 'en-US'

  }),
  getters: {
    getTimeZones: (state) => state.timeZones,
    getCurrentTimeZone: (state) => state.currentTimeZoneId,
    getLocale: (state) => state.locale,
    getLocaleOptions: (state) => state.localeOptions,
    getUserPermissions(state: UserState) {
      return state.permissions
    },
    getUserProfile(state: UserState) {
      return state.current
    },
    getInstanceUrl(state: UserState) {
      const baseUrl = import.meta.env.VITE_BASE_URL
      return baseUrl ? baseUrl : state.instanceUrl
    },
    getBaseUrl(state: UserState): string {
      let baseURL = import.meta.env.VITE_BASE_URL
      if (!baseURL) baseURL = state.instanceUrl
      return baseURL.startsWith("http") ? baseURL.includes("/api") ? baseURL : `${baseURL} /api/` : `https://${baseURL}.hotwax.io/api/`
    },
    getUserPreferenceState(state: UserState) {
      return state.preference
    },
    getPwaState(state: UserState) {
      return state.pwaState
    },
    getNotifications(state: UserState) {
      return state.notifications.sort((a: any, b: any) => b.time - a.time)
    },
    getNotificationPrefs(state: UserState) {
      return state.notificationPrefs
    },
    getFirebaseDeviceId(state: UserState) {
      return state.firebaseDeviceId
    },
    getUnreadNotificationsStatus(state: UserState) {
      return state.hasUnreadNotifications
    },
    getAllNotificationPrefs(state: UserState) {
      return state.allNotificationPrefs
    },
    getCurrentFacility(state: UserState) {
      return state.currentFacility
    },
    getCurrentEComStore(state: UserState) {
      return state.currentEComStore
    }
  },
  actions: {
    updateUserInfo(payload: any) {
      this.current = { ...this.current, ...payload }
    },
    setInstanceUrl(payload: any) {
      this.instanceUrl = payload
    },
    setUserPreferenceState(payload: any) {
      this.preference = { ...this.preference, ...payload }
    },
    setPermissionsState(payload: any) {
      this.permissions = payload
    },
    setPwaState(payload: any) {
      this.pwaState.registration = payload.registration
      this.pwaState.updateExists = payload.updateExists
    },
    setNotifications(payload: any) {
      this.notifications = payload
    },
    setNotificationPrefs(payload: any) {
      this.notificationPrefs = payload
    },
    setFirebaseDeviceId(payload: any) {
      this.firebaseDeviceId = payload
    },
    setUnreadNotificationsStatusState(payload: any) {
      this.hasUnreadNotifications = payload
    },
    setAllNotificationPrefs(payload: any) {
      this.allNotificationPrefs = payload
    },
    setCurrentFacility(facility: any) {
      this.currentFacility = facility
    },
    getProductStores() {
      return this.current.stores
    },
    async setCurrentEComStore(store: any) {
      this.currentEComStore = store
      await this.fetchEComStoreDependencies(store.productStoreId)
    },

    async samlLogin(token: string, expirationTime: string) {
      try {
        cookieHelper().set("token", token)
        cookieHelper().set("expirationTime", expirationTime)

        try {
          const userProfileResp = await api({
            url: "admin/user/profile",
            method: "get",
            baseUrl: getMaargURL()
          });
          this.current = userProfileResp.data
        } catch (error: any) {
          useAuth().clearAuth();
          commonUtil.showToast(translate("Failed to fetch user profile information"));
          console.error("error", error);
          return Promise.reject(new Error(error));
        }

        await this.fetchPermissions();
      } catch (error: any) {
        // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
        // TODO Check if handling of specific status codes is required.
        commonUtil.showToast(translate('Something went wrong while login. Please contact administrator.'));
        console.error("error: ", error);
        return Promise.reject(new Error(error))
      }
    },

    async fetchUserProfile() {
      try {
        const userProfileResp = await api({
          url: "admin/user/profile",
          method: "get",
        });
        this.current = userProfileResp.data

        if (this.current.timeZone) {
          Settings.defaultZone = this.current.timeZone;
        }
      } catch (error: any) {
        commonUtil.showToast(translate("Failed to fetch user profile information"));
        console.error("error", error);
        useAuth().clearAuth();
        return Promise.reject(new Error(error));
      }
    },
    async fetchPermissions() {
      const permissionId = import.meta.env.VITE_VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = [...new Set(getServerPermissionsFromRules())];
      if (permissionId) serverPermissionsFromRules.push(permissionId);
      let serverPermissions = [] as any;

      // If the server specific permission list doesn't exist, getting server permissions will be of no use
      // It means there are no rules yet depending upon the server permissions.
      if (serverPermissionsFromRules && serverPermissionsFromRules.length == 0) return serverPermissions;
      // TODO pass specific permissionIds
      let resp;
      // TODO Make it configurable from the environment variables.
      // Though this might not be an server specific configuration, 
      // we will be adding it to environment variable for easy configuration at app level
      const viewSize = 200;

      try {
        const params = {
          "viewIndex": 0,
          viewSize,
          permissionIds: serverPermissionsFromRules
        }
        resp = await api({
          url: "getPermissions",
          method: "post",
          baseURL: getOmsURL(),
          data: params,
        })
        if (resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
          serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId);
          const total = resp.data.count;
          const remainingPermissions = total - serverPermissions.length;
          if (remainingPermissions > 0) {
            // We need to get all the remaining permissions
            const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + (remainingPermissions % viewSize != 0 ? 1 : 0);
            const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => {
              const response = await api({
                url: "getPermissions",
                method: "post",
                baseURL: getOmsURL(),
                data: {
                  "viewIndex": index + 1,
                  viewSize,
                  permissionIds: serverPermissionsFromRules
                }
              })
              if (!hasError(response)) {
                return Promise.resolve(response);
              } else {
                return Promise.reject(response);
              }
            }))
            const permissionResponses = {
              success: [],
              failed: []
            }
            responses.reduce((permissionResponses: any, permissionResponse: any) => {
              if (permissionResponse.status !== 200 || hasError(permissionResponse) || !permissionResponse.data?.docs) {
                permissionResponses.failed.push(permissionResponse);
              } else {
                permissionResponses.success.push(permissionResponse);
              }
              return permissionResponses;
            }, permissionResponses)

            serverPermissions = permissionResponses.success.reduce((serverPermissions: any, response: any) => {
              serverPermissions.push(...response.data.docs.map((permission: any) => permission.permissionId));
              return serverPermissions;
            }, serverPermissions)

            // If partial permissions are received and we still allow user to login, some of the functionality might not work related to the permissions missed.
            // Show toast to user intimiting about the failure
            // Allow user to login
            // TODO Implement Retry or improve experience with show in progress icon and allowing login only if all the data related to user profile is fetched.
            if (permissionResponses.failed.length > 0) Promise.reject("Something went wrong while getting complete user permissions.");
          }
        }
        const appPermissions = prepareAppPermissions(serverPermissions);

        // Checking if the user has permission to access the app
        // If there is no configuration, the permission check is not enabled
        if (permissionId) {
          const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId);
          if (!hasPermission) {
            const permissionError = "You do not have permission to access the app.";
            commonUtil.showToast(translate(permissionError));
            logger.error("error", permissionError);
            return Promise.reject(new Error(permissionError));
          }
        }

        // Update the state with the fetched permissions
        this.permissions = appPermissions;
        // Set permissions in the authorization module
        setPermissions(appPermissions);
      } catch (error: any) {
        return Promise.reject(error);
      }
    },

    async fetchFacilities() {
      try {
        this.current.stores = [];
        const isAdminUser = hasPermission("APP_STOREFULFILLMENT_ADMIN");
        const facilities = await UserService.getUserFacilities(this.getUserProfile?.partyId, "OMS_FULFILLMENT", isAdminUser, {})
        this.current.facilities = facilities
        this.setCurrentFacility(facilities[0])
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async fetchFacilityPreference() {
      try {
        const preferredFacilityResp = await api({
          url: "admin/user/preferences",
          method: "GET",
          params: {
            pageSize: 1,
            userId: this.current.userId,
            preferenceKey: "SELECTED_FACILITY"
          },
        });
        const preferredFacilityId = preferredFacilityResp.data?.[0]?.preferenceValue;
        if (preferredFacilityId) {
          const currentFacility = this.current.facilities.find((facility: any) => facility.facilityId === preferredFacilityId);
          currentFacility && this.setCurrentFacility(currentFacility)
        }
      } catch (err) {
        logger.error('Favourite facility not found', err)
      }
    },
    async fetchProductStores() {
      try {
        const productStoresResp = await api({
          url: "admin/productStores",
          method: "get",
        });
        this.current.stores = productStoresResp.data

        this.current.stores.push({
          productStoreId: "",
          storeName: "None",
        });

        this.setCurrentEComStore(this.current.stores[0])
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async fetchProductStorePreference() {
      try {
        const preferredStoreResp = await api({
          url: "admin/user/preferences",
          method: "GET",
          params: {
            pageSize: 1,
            userId: this.current.userId,
            preferenceKey: "SELECTED_BRAND"
          },
        });
        const preferredStoreId = preferredStoreResp.data
        if (preferredStoreId) {
          const store = this.current.stores.find((store: any) => store.productStoreId === preferredStoreId);
          store && this.setCurrentEComStore(store)
        }
      } catch (err) {
        logger.error('Favourite product store not found', err)
      }
    },

    async setFacility({ facility }: any) {
      try {
        const resp = await UserService.updateFacility({
          facilityId: facility.facilityId,
          fromDate: DateTime.now().toMillis()
        })

        if (!hasError(resp)) {
          this.updateUserInfo({ userTimeZone: facility.timeZone })
          Settings.defaultZone = facility.timeZone
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("error", err)
      }
      return facility
    },
    setUserTimeZone(tzId: string) {
      this.updateUserInfo({ userTimeZone: tzId })
    },
    async fetchEComStoreDependencies(productStoreId: string) {
      if (!productStoreId) return
      // The product store is already persisted by dxp-components.
      // Fetch dependent data after the product store changes.
      await useProductIdentificationStore().getIdentificationPref(productStoreId)
        .catch((error) => logger.error(error))

      try {
        await useUtilStore().fetchProductStoreSettings(productStoreId)
      } catch (err) {
        logger.error("error", err)
      }
    },
    async setUserPreference(payload: any) {
      try {
        const resp = await UserService.setUserPreference(payload)
        if (!hasError(resp)) {
          this.setUserPreferenceState(payload)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("error", err)
      }
    },
    async updatePwaState(payload: any) {
      this.setPwaState(payload)
    },
    async addNotification(payload: any) {
      this.setNotifications([payload, ...this.notifications])
    },
    async fetchNotificationPreferences() {
      let notificationPreferences: any[] = []
      let enumerationResp: any[] = []
      let userPrefIds: any[] = []
      try {
        let resp: any = await NotificationService.getNotificationEnumIds(import.meta.env.VITE_NOTIF_ENUM_TYPE_ID as any)
        enumerationResp = resp.docs
        resp = await NotificationService.getNotificationUserPrefTypeIds(import.meta.env.VITE_NOTIF_APP_ID as any, (this.current as any).userLoginId)
        userPrefIds = resp.docs.map((userPref: any) => userPref.userPrefTypeId)
      } catch (error) {
        logger.error(error)
      } finally {
        // checking enumerationResp as we want to show disabled prefs if only getNotificationEnumIds returns
        // data and getNotificationUserPrefTypeIds fails or returns empty response (all disabled)
        if (enumerationResp.length) {
          notificationPreferences = enumerationResp.reduce((notifactionPref: any, pref: any) => {
            const userPrefTypeIdToSearch = fireBaseUtil.generateTopicName(commonUtil.getCurrentFacilityId(), pref.enumId)
            notifactionPref.push({ ...pref, isEnabled: userPrefIds.includes(userPrefTypeIdToSearch) })
            return notifactionPref
          }, [])
        }
        this.setNotificationPrefs(notificationPreferences)
      }
    },
    async storeClientRegistrationToken(registrationToken: string) {
      const firebaseDeviceId = fireBaseUtil.generateDeviceId()
      this.setFirebaseDeviceId(firebaseDeviceId)

      try {
        await NotificationService.storeClientRegistrationToken(registrationToken, firebaseDeviceId, import.meta.env.VITE_NOTIF_APP_ID as any)
      } catch (error) {
        logger.error(error)
      }
    },
    async fetchAllNotificationPrefs() {
      let allNotificationPrefs: any[] = []

      try {
        const resp = await NotificationService.getNotificationUserPrefTypeIds(import.meta.env.VITE_NOTIF_APP_ID as any, (this.current as any).userLoginId)
        allNotificationPrefs = resp.docs
      } catch (error) {
        logger.error(error)
      }

      this.setAllNotificationPrefs(allNotificationPrefs)
    },
    async updateNotificationPreferences(payload: any) {
      this.setNotificationPrefs(payload)
    },
    clearNotificationState() {
      this.notifications = []
      this.notificationPrefs = []
      this.firebaseDeviceId = ""
      this.hasUnreadNotifications = true
      this.allNotificationPrefs = []
    },
    setUnreadNotificationsStatus(payload: any) {
      this.setUnreadNotificationsStatusState(payload)
    },
    async setEComStorePreference(payload: any) {
      try {
        await UserService.setUserPreference({
          userPrefTypeId: 'SELECTED_BRAND',
          userPrefValue: payload.productStoreId,
          userId: this.current.userId
        })
      } catch (error) {
        console.error('error', error)
      }
      this.currentEComStore = payload;
    },
    async getAvailableTimeZones() {
      // Do not fetch timeZones information, if already available
      if (this.timeZones.length) {
        return;
      }

      try {
        const resp = await UtilService.getAvailableTimeZones();
        if (!hasError(resp)) {
          this.timeZones = resp.data.timeZones.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
        }
      } catch (err) {
        console.error('Error', err)
      }
    },

    async setLocale(locale: string) {
      let newLocale, matchingLocale
      newLocale = this.locale
      // handling if locale is not coming from userProfile
      try {
        const userProfile = this.current
        if (locale) {
          matchingLocale = Object.keys(this.localeOptions).find((option: string) => option === locale)
          // If exact locale is not found, try to match the first two characters i.e primary code
          matchingLocale = matchingLocale || Object.keys(this.localeOptions).find((option: string) => option.slice(0, 2) === locale.slice(0, 2))
          newLocale = matchingLocale || this.locale
          // update locale in state and globally
          await UserService.setUserLocale({ userId: userProfile.userId, newLocale })
        }
      } catch (error) {
        console.error(error)
      } finally {
        i18n.global.locale.value = newLocale
        this.locale = newLocale
      }
    }
  },
  persist: true
})
