import { api, commonUtil, cookieHelper, logger, translate } from "@common";
import { defineStore } from "pinia"
import { UserService } from "@/services/UserService"
import { UtilService } from "@/services/UtilService"
import { DateTime, Settings } from "luxon"
import { i18n } from "../index";
import { useUtilStore } from "@/store/util"
import { useAuth } from "@/composables/auth";
import { useProductIdentificationStore } from "@/store/productIdentification";

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
  timeZones: any[],
  currentTimeZoneId: string,
  localeOptions: any,
  locale: string,
  isEmbedded: boolean
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
    timeZones: [],
    currentTimeZoneId: '',
    localeOptions: import.meta.env.VITE_LOCALES ? JSON.parse(import.meta.env.VITE_LOCALES) : { "en-US": "English" },
    locale: 'en-US',
    isEmbedded: false

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
    getCurrentFacility(state: UserState) {
      return state.currentFacility
    },
    getCurrentEComStore(state: UserState) {
      return state.currentEComStore
    },
    hasPermission: (state: UserState) => (permissionId: string): boolean => {
      const permissions = state.permissions;

      if (!permissionId) {
        return true;
      }

      // Handle OR/AND logic in permission string
      if (permissionId.includes(' OR ')) {
        const parts = permissionId.split(' OR ');
        return parts.some(part => useUserStore().hasPermission(part.trim()));
      }

      if (permissionId.includes(' AND ')) {
        const parts = permissionId.split(' AND ');
        return parts.every(part => useUserStore().hasPermission(part.trim()));
      }

      return permissions.includes(permissionId);
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
            baseUrl: commonUtil.getMaargURL()
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
      let serverPermissions = [] as any;

      // TODO Make it configurable from the environment variables.
      // Though this might not be an server specific configuration, 
      // we will be adding it to environment variable for easy configuration at app level
      const viewSize = 50;

      let viewIndex = 0;

      try {
        let resp;
        do {
          resp = await api({
            url: "getPermissions",
            method: "post",
            baseURL: commonUtil.getOmsURL(),
            data: { viewIndex, viewSize }
          })

          if (resp.status === 200 && resp.data.docs?.length && !commonUtil.hasError(resp)) {
            serverPermissions.push(...resp.data.docs.map((permission: any) => permission.permissionId));
            viewIndex++;
          } else {
            resp = null;
          }
        } while (resp);

        // Checking if the user has permission to access the app
        // If there is no configuration, the permission check is not enabled
        if (permissionId) {
          const hasAppPermission = serverPermissions.includes(permissionId);
          if (!hasAppPermission) {
            const permissionError = "You do not have permission to access the app.";
            commonUtil.showToast(translate(permissionError));
            logger.error("error", permissionError);
            return Promise.reject(new Error(permissionError));
          }
        }

        // Update the state with the fetched permissions
        this.permissions = serverPermissions;
      } catch (error: any) {
        return Promise.reject(error);
      }
    },

    async fetchFacilities() {
      try {
        this.current.stores = [];
        const isAdminUser = this.hasPermission("STOREFULFILLMENT_ADMIN");
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

        if (!commonUtil.hasError(resp)) {
          this.updateUserInfo({ userTimeZone: facility.timeZone })
          this.currentTimeZoneId = facility.timeZone
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
      this.currentTimeZoneId = tzId
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
        if (!commonUtil.hasError(resp)) {
          this.setUserPreferenceState(payload)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("error", err)
      }
    },
    setUnreadNotificationsStatus(payload: any) {
      // This action is now effectively a placeholder or should be moved to components
      // Using the new store directly is preferred.
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
        if (!commonUtil.hasError(resp)) {
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
    },
    async logout(payload: any) {
      const { logout } = useAuth();
      return await logout(payload);
    },
    getUserPreference(key: string) {
      return (this.preference as any)[key]
    }
  },
  persist: true
})
