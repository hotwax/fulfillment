import { api, commonUtil, cookieHelper, i18n, logger, translate, useAuth, useNotificationStore, useEmbeddedAppStore } from "@common";
import { defineStore } from "pinia"
import { DateTime, Settings } from "luxon"
import router from "@/router";
import { useUtilStore } from "@/store/util";
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { firebaseUtil } from "@/utils/firebaseUtil";
import { useOrderStore } from "@/store/order";
import { useTransferOrderStore } from "@/store/transferorder";
import { useRejectionStore } from "@/store/rejection";
import { useStockStore } from "@/store/stock";
import { useCarrierStore } from "@/store/carrier";
import { useOrderLookupStore } from "@/store/orderLookup";
import { useProductStore as useProduct } from "@/store/product";

interface UserState {
  permissions: any[]
  current: any
  preference: {
    printShippingLabel: boolean
    printPackingSlip: boolean
  },
  timeZones: any[],
  localeOptions: any,
  locale: string,
  oms: any
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    permissions: [],
    current: {},
    preference: {
      printShippingLabel: false,
      printPackingSlip: false
    },
    timeZones: [],
    localeOptions: import.meta.env.VITE_LOCALES ? JSON.parse(import.meta.env.VITE_LOCALES) : { "en-US": "English" },
    locale: 'en-US',
    oms: ""
  }),
  getters: {
    getTimeZones: (state) => state.timeZones,
    getCurrentTimeZone: (state) => state.current.timeZone,
    getLocale: (state) => state.locale,
    getLocaleOptions: (state) => state.localeOptions,
    getUserPermissions(state: UserState) {
      return state.permissions
    },
    getUserProfile(state: UserState) {
      return state.current
    },
    getUserPreferenceState(state: UserState) {
      return state.preference
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
    setPermissionsState(payload: any) {
      this.permissions = payload
    },
    async fetchUserProfile() {
      try {
        const userProfileResp = await api({
          url: "admin/user/profile",
          method: "get",
        }) as any;
        this.current = userProfileResp.data
        useAuth().updateUserId(this.current.userId)

        if (this.current.timeZone) {
          Settings.defaultZone = this.current.timeZone;
        }
      } catch (error: any) {
        const errorMessage = translate("Failed to fetch user profile information");
        commonUtil.showToast(errorMessage);
        console.error("error", error);
        useAuth().clearAuth();
        return Promise.reject(new Error(errorMessage));
      }
    },
    async fetchPermissions() {
      const permissionId = import.meta.env.VITE_APP_PERMISSION_ID;
      const serverPermissions = [] as any;

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
          }) as any

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

    async setUserTimeZone(tzId: string) {
      try {
        await api({
          url: "admin/user/profile",
          method: "POST",
          data: { userId: this.current.userId, timeZone: tzId },
        });
        this.updateUserInfo({ userTimeZone: tzId })
        this.current.timeZone = tzId
      } catch (error: any) {
        console.error("Failed to set user time zone", error);
        commonUtil.showToast(translate("Failed to set user time zone"));
      }
    },

    async setUserPreference(payload: any) {
      this.preference = { ...this.preference, ...payload }
    },
    setUnreadNotificationsStatus(payload: any) {
      // This action is now effectively a placeholder or should be moved to components
      // Using the new store directly is preferred.
    },
    async getAvailableTimeZones() {
      // Do not fetch timeZones information, if already available
      if (this.timeZones.length) {
        return;
      }

      try {
        const resp = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get",
          cache: true
        }) as any;
        if (resp.status === 200 && !commonUtil.hasError(resp)) {
          this.timeZones = resp.data.timeZones.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
        }
      } catch (err) {
        console.error('Error', err)
      }
    },

    async setLocale(locale: string) {
      let newLocale = this.locale;
      let matchingLocale: string | undefined;

      try {
        const userProfile = this.current
        if (locale) {
          matchingLocale = Object.keys(this.localeOptions).find((option: string) => option === locale)
          // If exact locale is not found, try to match the first two characters i.e primary code
          matchingLocale = matchingLocale || Object.keys(this.localeOptions).find((option: string) => option.slice(0, 2) === locale.slice(0, 2))
          newLocale = matchingLocale || this.locale
          // update locale in state and globally
          await api({
            url: "admin/user/profile",
            method: "POST",
            data: {
              userId: userProfile.userId,
              locale: newLocale
            },
          });
        }
      } catch (error) {
        console.error(error)
      } finally {
        i18n.global.locale.value = newLocale as any
        this.locale = newLocale
      }
    },
    getUserPreference(key: string) {
      return (this.preference as any)[key]
    },
    async postLogin() {
      try {
        const productStore = useAppProductStore();
        await this.fetchPermissions()
        await this.fetchUserProfile()
        await productStore.fetchUserFacilities()
        await productStore.fetchFacilityPreference();
        await productStore.fetchProductStores()
        await productStore.fetchProductStorePreference();
        await productStore.fetchProductStoreDependencies(productStore.getCurrentProductStore.productStoreId)

        await useUtilStore().fetchCarrierShipmentBoxTypes()
        await productStore.fetchAutoShippingLabelConfig()

        const notificationStore = useNotificationStore();
        await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID as any, this.current.userId)
        await firebaseUtil.initialiseFirebaseMessaging();

        const facilityId = router.currentRoute.value.query.facilityId
        if (facilityId) {
          const facility = this.current.facilities.find((facility: any) => facility.facilityId === facilityId);
          if (facility) {
            productStore.currentFacility = facility
          } else {
            commonUtil.showToast(translate("Redirecting to home page due to incorrect information being passed."))
          }
        }
      } catch (error: any) {
        return Promise.reject(error);
      }
    },
    async preLogout() {
      try {
        const notificationStore = useNotificationStore();
        if (notificationStore.getFirebaseDeviceId) await notificationStore.removeClientRegistrationToken(notificationStore.getFirebaseDeviceId, import.meta.env.VITE_NOTIF_APP_ID as any);
      } catch (error) {
        logger.error(error);
      }

      if (commonUtil.isAppEmbedded()) {
        setTimeout(() => {
          window.location.href = window.location.origin + `/shopify-login?shop=${useEmbeddedAppStore().getShop}&host=${useEmbeddedAppStore().getHost}&embedded=1`;
        }, 100);
        useEmbeddedAppStore().$reset();
      }
    },
    async postLogout() {
      useNotificationStore().clearNotificationState();
      useCarrierStore().$reset();
      useOrderStore().$reset();
      useOrderLookupStore().$reset();
      useProduct().$reset();
      useAppProductStore().$reset();
      useRejectionStore().$reset();
      useStockStore().$reset();
      useTransferOrderStore().$reset();
      this.$reset();
      useUtilStore().$reset();
    }
  },
  persist: true
})
