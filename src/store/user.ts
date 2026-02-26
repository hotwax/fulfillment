import { defineStore } from "pinia"
import { UserService } from "@/services/UserService"
import { showToast, getCurrentFacilityId } from "@/utils"
import { hasError, updateInstanceUrl, updateToken, resetConfig, getNotificationEnumIds, getNotificationUserPrefTypeIds, logout as logoutAdapter, storeClientRegistrationToken as storeClientRegistrationTokenAdapter } from "@/adapter"
import { translate, useAuthStore, useUserStore as useDxpUserStore, useProductIdentificationStore } from "@hotwax/dxp-components"
import { DateTime, Settings } from "luxon"
import logger from "@/logger"
import { getServerPermissionsFromRules, prepareAppPermissions, resetPermissions, setPermissions } from "@/authorization"
import emitter from "@/event-bus"
import { generateDeviceId, generateTopicName } from "@/utils/firebase"
import router from "@/router"
import { useOrderStore } from "@/store/order"
import { useOrderLookupStore } from "@/store/orderLookup"
import { useTransferOrderStore } from "@/store/transferorder"
import { useProductStore } from "@/store/product"
import { useUtilStore } from "@/store/util"
import { UtilService } from '@/services/UtilService';

interface UserState {
  token: string
  permissions: any[]
  current: any
  instanceUrl: string
  preference: {
    printShippingLabel: boolean
    printPackingSlip: boolean
  }
  pwaState: {
    updateExists: boolean
    registration: any
  }
  omsRedirectionInfo: {
    url: string
    token: string
  }
  notifications: any[]
  notificationPrefs: any[]
  firebaseDeviceId: string
  hasUnreadNotifications: boolean
  allNotificationPrefs: any[]
}

export const useUserStore = defineStore("appUser", {
  state: (): UserState => ({
    token: "",
    permissions: [],
    current: {},
    instanceUrl: "",
    preference: {
      printShippingLabel: false,
      printPackingSlip: false
    },
    pwaState: {
      updateExists: false,
      registration: null
    },
    omsRedirectionInfo: {
      url: "",
      token: ""
    },
    notifications: [],
    notificationPrefs: [],
    firebaseDeviceId: "",
    hasUnreadNotifications: true,
    allNotificationPrefs: []
  }),
  getters: {
    isAuthenticated(state) {
      return !!state.token
    },
    isUserAuthenticated(state) {
      return state.token && state.current
    },
    getUserToken(state) {
      return state.token
    },
    getUserPermissions(state) {
      return state.permissions
    },
    getUserProfile(state) {
      return state.current
    },
    getInstanceUrl(state) {
      const baseUrl = process.env.VUE_APP_BASE_URL
      return baseUrl ? baseUrl : state.instanceUrl
    },
    getBaseUrl(state) {
      let baseURL = process.env.VUE_APP_BASE_URL
      if (!baseURL) baseURL = state.instanceUrl
      return baseURL.startsWith("http") ? baseURL.includes("/api") ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`
    },
    getUserPreference(state) {
      return state.preference
    },
    getPwaState(state) {
      return state.pwaState
    },
    getMaargUrl(state) {
      const url = state.omsRedirectionInfo.url
      return url.startsWith("http") ? new URL(url).origin : `https://${url}.hotwax.io`
    },
    getMaargBaseUrl(state) {
      const url = state.omsRedirectionInfo.url
      return url.startsWith("http") ? url.includes("/rest/s1") ? url : `${url}/rest/s1/` : `https://${url}.hotwax.io/rest/s1`
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
    }
  },
  actions: {
    setToken(payload: any) {
      this.token = payload.newToken
    },
    endSession() {
      this.token = ""
      this.current = {}
      this.permissions = []
      this.allNotificationPrefs = []
      this.omsRedirectionInfo = { url: "", token: "" }
    },
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
    setOmsRedirectionInfoState(payload: any) {
      this.omsRedirectionInfo = payload
    },
    async login(payload: any) {
      try {
        const { token, oms, omsRedirectionUrl } = payload
        this.setUserInstanceUrl(oms)

        const permissionId = process.env.VUE_APP_PERMISSION_ID
        const serverPermissionsFromRules = getServerPermissionsFromRules()
        if (permissionId) serverPermissionsFromRules.push(permissionId)

        const serverPermissions = await UserService.getUserPermissions({
          permissionIds: [...new Set(serverPermissionsFromRules)]
        }, token)
        const appPermissions = prepareAppPermissions(serverPermissions)

        if (permissionId) {
          const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId)
          if (!hasPermission) {
            const permissionError = "You do not have permission to access the app."
            showToast(translate(permissionError))
            logger.error("error", permissionError)
            return Promise.reject(new Error(permissionError))
          }
        }

        const userProfile = await UserService.getUserProfile(token)

        const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_STOREFULFILLMENT_ADMIN")
        const facilities = await useDxpUserStore().getUserFacilities(userProfile?.partyId, "OMS_FULFILLMENT", isAdminUser)
        await useDxpUserStore().getFacilityPreference("SELECTED_FACILITY")

        if (!facilities.length) throw "Unable to login. User is not assocaited with any facility"

        userProfile.facilities = facilities
        userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
          if (uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1)
          else uniqueFacilities.push(facility.facilityId)
          return uniqueFacilities
        }, [])

        const facilityId = router.currentRoute.value.query.facilityId
        let isQueryFacilityFound = false
        if (facilityId) {
          const facility = userProfile.facilities.find((facility: any) => facility.facilityId === facilityId)
          if (facility) {
            isQueryFacilityFound = true
            useDxpUserStore().currentFacility = facility
          } else {
            showToast(translate("Redirecting to home page due to incorrect information being passed."))
          }
        }

        if(useAuthStore().isEmbedded) {
        const locationId = useAuthStore().posContext.locationId
        const payload = {
          shopifyLocationId: locationId
        }
        const resp = await UtilService.fetchShopifyShopLocation(omsRedirectionUrl, token, payload)
        if(!hasError(resp) && resp.data?.length) {
          const facilityId = resp.data[0].facilityId;
          const facility = userProfile.facilities.find((facility: any) => facility.facilityId === facilityId);
          if(!facility) {
            throw "Unable to login. User is not associated with this location"
          }
          useDxpUserStore().currentFacility = facility
        } else {
          throw "Failed to fetch location information"
        }
      }

        const currentFacility: any = useDxpUserStore().getCurrentFacility
        userProfile.stores = await useDxpUserStore().getEComStoresByFacility(currentFacility.facilityId)
        await useDxpUserStore().getEComStorePreference("SELECTED_BRAND")
        const preferredStore: any = useDxpUserStore().getCurrentEComStore

        setPermissions(appPermissions)
        if (userProfile.userTimeZone) {
          Settings.defaultZone = userProfile.userTimeZone
        }

        if (omsRedirectionUrl) {
          const api_key = await UserService.moquiLogin(omsRedirectionUrl, token)
          if (api_key) {
            this.setOmsRedirectionInfo({ url: omsRedirectionUrl, token: api_key })
          } else {
            showToast(translate("Some of the app functionality will not work due to missing configuration."))
            logger.error("Some of the app functionality will not work due to missing configuration.")
          }
        } else {
          showToast(translate("Some of the app functionality will not work due to missing configuration."))
          logger.error("Some of the app functionality will not work due to missing configuration.")
        }

        updateToken(token)

        this.updateUserInfo(userProfile)
        this.setPermissionsState(appPermissions)
        this.setToken({ newToken: token })

        await useProductIdentificationStore().getIdentificationPref(preferredStore.productStoreId)
          .catch((error) => logger.error(error))

        await this.fetchAllNotificationPrefs()
        useUtilStore().findProductStoreShipmentMethCount()
        await useUtilStore().fetchCarrierShipmentBoxTypes()
        await useUtilStore().fetchProductStoreSettings(preferredStore.productStoreId)
        await useUtilStore().fetchAutoShippingLabelConfig()

        const orderId = router.currentRoute.value.query.orderId
        if (isQueryFacilityFound && orderId) {
          return `/transfer-order-details/${orderId}/open`
        }
      } catch (err: any) {
        showToast(translate("Something went wrong while login. Please contact administrator."))
        logger.error("error: ", err.toString())
        return Promise.reject(err instanceof Object ? err : new Error(err))
      }
    },
    async logout(payload: any) {
      let redirectionUrl = ""

      if (!payload?.isUserUnauthorised) {
        emitter.emit("presentLoader", { message: "Logging out", backdropDismiss: false })
        let resp

        try {
          resp = await logoutAdapter()
          resp = JSON.parse(resp.startsWith("//") ? resp.replace("//", "") : resp)
        } catch (err) {
          logger.error("Error parsing data", err)
        }

        if (resp?.logoutAuthType == "SAML2SSO") {
          redirectionUrl = resp.logoutUrl
        }

        emitter.emit("dismissLoader")
      }

      const authStore = useAuthStore()
      const userStore = useDxpUserStore()
      this.endSession()
      useOrderStore().clearOrders()
      useOrderLookupStore().clearOrderLookup()
      this.clearNotificationState()
      useTransferOrderStore().clearTransferOrdersList()
      useTransferOrderStore().clearTransferOrderFilters()
      useTransferOrderStore().clearCurrentTransferOrder()
      useTransferOrderStore().clearCurrentTransferShipment()
      useProductStore().clearProductState()
      useUtilStore().clearUtilState()
      resetConfig()
      resetPermissions()

      authStore.$reset()
      userStore.$reset()

      if (redirectionUrl) {
        window.location.href = redirectionUrl
      }

      return redirectionUrl
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
    async setUserInstanceUrl(oms: any) {
      this.setInstanceUrl(oms)
      updateInstanceUrl(oms)
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
    async setOmsRedirectionInfo(payload: any) {
      this.setOmsRedirectionInfoState(payload)
    },
    async addNotification(payload: any) {
      this.setNotifications([payload, ...this.notifications])
    },
    async fetchNotificationPreferences() {
      let notificationPreferences: any[] = []
      let enumerationResp: any[] = []
      let userPrefIds: any[] = []
      try {
        let resp: any = await getNotificationEnumIds(process.env.VUE_APP_NOTIF_ENUM_TYPE_ID as any)
        enumerationResp = resp.docs
        resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID as any, (this.current as any).userLoginId)
        userPrefIds = resp.docs.map((userPref: any) => userPref.userPrefTypeId)
      } catch (error) {
        logger.error(error)
      } finally {
        // checking enumerationResp as we want to show disabled prefs if only getNotificationEnumIds returns
        // data and getNotificationUserPrefTypeIds fails or returns empty response (all disabled)
        if (enumerationResp.length) {
          notificationPreferences = enumerationResp.reduce((notifactionPref: any, pref: any) => {
            const userPrefTypeIdToSearch = generateTopicName(getCurrentFacilityId(), pref.enumId)
            notifactionPref.push({ ...pref, isEnabled: userPrefIds.includes(userPrefTypeIdToSearch) })
            return notifactionPref
          }, [])
        }
        this.setNotificationPrefs(notificationPreferences)
      }
    },
    async storeClientRegistrationToken(registrationToken: string) {
      const firebaseDeviceId = generateDeviceId()
      this.setFirebaseDeviceId(firebaseDeviceId)

      try {
        await storeClientRegistrationTokenAdapter(registrationToken, firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID as any)
      } catch (error) {
        logger.error(error)
      }
    },
    async fetchAllNotificationPrefs() {
      let allNotificationPrefs: any[] = []

      try {
        const resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID as any, (this.current as any).userLoginId)
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
    }
  },
  persist: true
})
