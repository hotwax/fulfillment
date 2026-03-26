import { api, client, commonUtil, cookieHelper, embeddedApp, emitter, logger, translate, useNotificationStore } from "@common";
import { useUserStore } from "@/store/user";
import { useUtilStore } from "@/store/util";
import { DateTime } from "luxon";
import { computed, ref } from "vue";
import router from '@/router';
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { firebaseUtil } from "@/utils/firebaseUtil";

interface LoginOption {
  loginAuthType?: string,
  maargInstanceUrl?: string,
  loginAuthUrl?: string
}

export function useAuth() {
  const loginOption = ref<LoginOption>({})

  const clearAuth = () => {
    useNotificationStore().clearNotificationState();
    cookieHelper().remove('token');
    cookieHelper().remove('expirationTime');
    cookieHelper().remove('maarg');
    cookieHelper().remove('oms');
  }

  const isAuthenticated = computed(() => {
    let isTokenExpired = false;
    const token = commonUtil.getToken();
    const expirationTime = Number(commonUtil.getTokenExpiration());
    if (expirationTime) {
      const currTime = DateTime.now().toMillis();
      isTokenExpired = expirationTime < currTime;
    }
    return !!(token && !isTokenExpired);
  })

  const login = async (username: string, password: string) => {
    try {
      const productStore = useAppProductStore();
      const resp = await client({
        url: "login",
        method: "post",
        data: {
          "USERNAME": username,
          "PASSWORD": password
        },
        baseURL: commonUtil.getOmsURL()
      });
      if (commonUtil.hasError(resp)) {
        commonUtil.showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }

      cookieHelper().set("token", resp.data.token)
      cookieHelper().set("expirationTime", resp.data.expirationTime)
      await useUserStore().fetchPermissions()
      await useUserStore().fetchUserProfile()
      await productStore.fetchUserFacilities()
      await productStore.fetchFacilityPreference();
      await productStore.fetchProductStores()
      await productStore.fetchProductStorePreference();
      await productStore.fetchEComStoreDependencies(productStore.getCurrentEComStore.productStoreId)

      await useUtilStore().fetchCarrierShipmentBoxTypes()
      await productStore.fetchAutoShippingLabelConfig()

      const notificationStore = useNotificationStore();
      await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID, useUserStore().getUserProfile.userId)
      await firebaseUtil.initialiseFirebaseMessaging();


      const facilityId = router.currentRoute.value.query.facilityId
      let isQueryFacilityFound = false
      if (facilityId) {
        const facility = useUserStore().getUserProfile.facilities.find((facility: any) => facility.facilityId === facilityId);
        if (facility) {
          isQueryFacilityFound = true
          productStore.currentFacility = facility
        } else {
          commonUtil.showToast(translate("Redirecting to home page due to incorrect information being passed."))
        }
      }

    } catch (err: any) {
      commonUtil.showToast(translate("Something went wrong while login. Please contact administrator."));
      logger.error("error: ", err.toString());
      return Promise.reject(err instanceof Object ? err : new Error(err));
    }
  }

  const logout = async (payload?: any) => {
    let redirectionUrl = "";
    emitter.emit("presentLoader", {
      message: "Logging out",
      backdropDismiss: false,
    });

    if (!payload?.isUserUnauthorised) {
      let resp;
      try {
        resp = await api({
          url: "logout",
          method: "GET",
          baseURL: commonUtil.getOmsURL()
        });
        resp = JSON.parse(
          resp.data.startsWith("//") ? resp.data.replace("//", "") : resp
        );
      } catch (err) {
        logger.error("Error logging out", err);
      }

      if (resp?.logoutAuthType == "SAML2SSO") {
        redirectionUrl = resp.logoutUrl;
      }
    }
    // This only runs when token gets expired, since embedded app user can't logout on it's own,
    // token expiry on navigation is handled on the auth guard.
    if (commonUtil.isAppEmbedded()) {
      redirectionUrl = window.location.origin + `/shopify?shop=${embeddedApp().shop}&host=${embeddedApp().host}&embedded=1`;
      embeddedApp().$reset();
    }
    useUserStore().$reset();
    cookieHelper().remove('token');
    cookieHelper().remove('expirationTime');

    emitter.emit("dismissLoader");
    return redirectionUrl;
  }

  const fetchLoginOptions = async () => {
    loginOption.value = {}
    try {
      const resp = await client({
        url: "checkLoginOptions",
        method: "GET",
        baseURL: commonUtil.getOmsURL()
      });
      if (!commonUtil.hasError(resp)) {
        loginOption.value = resp.data
        cookieHelper().set("maarg", resp.data.maargInstanceUrl)
      }
    } catch (error) {
      console.error(error)
    }
  };


  return {
    // Variables
    loginOption,
    // Functions
    fetchLoginOptions,
    login,
    logout,
    clearAuth,
    // Getters
    isAuthenticated
  }
}
