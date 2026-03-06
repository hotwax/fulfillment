import { api } from '@common';
import { hasError, jsonParse } from '@common/utils/commonUtil';
import { useUserStore } from "@/store/user";
import logger from '@common/core/logger'

const login = async (username: string, password: string): Promise<any> => {
  return api({
    url: "login",
    method: "post",
    data: {
      'USERNAME': username,
      'PASSWORD': password
    }
  });
}
const moquiLogin = async (omsRedirectionUrl: string, token: string): Promise<any> => {
  const baseURL = omsRedirectionUrl.startsWith('http') ? omsRedirectionUrl.includes('/rest/s1/admin') ? omsRedirectionUrl : `${omsRedirectionUrl}/rest/s1/admin/` : `https://${omsRedirectionUrl}.hotwax.io/rest/s1/admin/`;
  let api_key = ""

  try {
    const resp = await api({
      url: "login",
      method: "post",
      baseURL,
      params: {
        token
      }
    }) as any;

    if (!hasError(resp) && (resp.data.api_key || resp.data.token)) {
      api_key = resp.data.api_key || resp.data.token
    } else {
      throw "Sorry, login failed. Please try again";
    }
  } catch (err) {
    logger.error(err)
    return Promise.resolve("");
  }
  return Promise.resolve(api_key)
}

const getFacilityDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}`,
    method: "GET",
    params: payload
  });
}

const getFacilityOrderCount = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/facilityOrderCounts`,
    method: "GET",
    params: payload
  });
}

const updateFacility = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}`,
    method: "PUT",
    data: payload
  });
}

const updateFacilityToGroup = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}/groups`,
    method: "POST",
    data: payload
  });
}

const addFacilityToGroup = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}/groups`,
    method: "POST",
    data: payload
  });
}

const getFacilityGroupDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilityGroups`,
    method: "get",
    params: payload
  });
}

const getPreferredStore = async (token: any): Promise<any> => {
  const userStore = useUserStore();
  const baseURL = userStore.getMaargBaseUrl;
  try {
    const resp = await api({
      url: `/oms/userPreferences`,
      method: "GET",
      params: { 'userPrefTypeId': 'SELECTED_BRAND' }
    });

    if (hasError(resp)) {
      return Promise.reject(resp.data);
    } else {
      return Promise.resolve(resp.data.userPrefValue);
    }
  } catch (error: any) {
    return Promise.reject(error)
  }
}

const getUserPermissions = async (payload: any, token: any): Promise<any> => {
  const userStore = useUserStore();
  const baseURL = userStore.getBaseUrl;
  let serverPermissions = [] as any;

  // If the server specific permission list doesn't exist, getting server permissions will be of no use
  // It means there are no rules yet depending upon the server permissions.
  if (payload.permissionIds && payload.permissionIds.length == 0) return serverPermissions;
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
      permissionIds: payload.permissionIds
    }
    resp = await api({
      url: "getPermissions",
      method: "post",
      data: params
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
            data: {
              "viewIndex": index + 1,
              viewSize,
              permissionIds: payload.permissionIds
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
    return serverPermissions;
  } catch (error: any) {
    return Promise.reject(error);
  }
}

const getUserProfile = async (token: any): Promise<any> => {
  const userStore = useUserStore();
  const baseURL = userStore.getBaseUrl;
  try {
    const resp = await api({
      url: "user-profile",
      method: "get"
    });
    if (hasError(resp)) return Promise.reject("Error getting user profile: " + JSON.stringify(resp.data));
    return Promise.resolve(resp.data)
  } catch (error: any) {
    return Promise.reject(error)
  }
}

const setUserPreference = async (payload: any): Promise<any> => {
  return api({
    url: "admin/user/preferences",
    method: "PUT",
    data: {
      userId: payload.userId,
      preferenceKey: payload.userPrefTypeId,
      preferenceValue: payload.userPrefValue,
    }
  });
}

const setUserLocale = async (payload: any): Promise<any> => {
  payload.locale = payload.newLocale;
  return api({
    url: "admin/user/profile",
    method: "POST",
    data: payload,
  });
}

const createEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enums`,
    method: "POST",
    data: payload
  })
}

const isEnumExists = async (enumId: string): Promise<any> => {
  try {
    const resp = await api({
      url: `/admin/enums`,
      method: "GET",
      params: { enumId }
    }) as any
    if (!hasError(resp) && resp.data.length) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

async function getEComStoresByFacility(facilityId?: string, pageSize = 200): Promise<any> {
  let resp = {} as any;
  let stores: Array<any> = []

  try {
    resp = await api({
      url: `oms/facilities/${facilityId}/productStores`,
      method: "GET",
      params: {
        pageSize,
        facilityId
      }
    });

    // Filtering stores on which thruDate is set, as we are unable to pass thruDate check in the api payload
    // Considering that the stores will always have a thruDate of the past.
    stores = resp.data.filter((store: any) => !store.thruDate)
  } catch (error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch facility associated product stores",
      serverResponse: error
    })
  }

  if (!stores.length) return Promise.resolve(stores)

  // Fetching all stores for the store name
  let productStoresMap = {} as any;
  try {
    const productStores = await getEComStores();
    productStores.map((store: any) => productStoresMap[store.productStoreId] = store.storeName)
  } catch (error) {
    console.error(error);
  }

  stores.map((store: any) => store.storeName = productStoresMap[store.productStoreId])
  return Promise.resolve(stores)
}

async function getEComStores(pageSize = 200): Promise<any> {
  let params = {
    url: "oms/productStores",
    method: "GET",
    params: {
      pageSize
    }
  }

  let resp = {} as any;
  let stores: Array<any> = []

  try {
    resp = await api(params);

    stores = resp.data
  } catch (error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch product stores",
      serverResponse: error
    })
  }

  return Promise.resolve(stores)
}

async function getUserFacilities(partyId: string, facilityGroupId: string, isAdminUser: boolean, payload: Object): Promise<any> {
  let facilityIds: Array<string> = [];
  let filters: any = {};
  let resp = {} as any

  // Fetch the facilities associated with party
  if (partyId && !isAdminUser) {
    try {
      resp = await fetchFacilitiesByParty(partyId)

      facilityIds = resp.map((facility: any) => facility.facilityId);
      if (!facilityIds.length) {
        return Promise.reject({
          code: 'error',
          message: 'Failed to fetch user facilities',
          serverResponse: resp.data
        })
      }
    } catch (error) {
      return Promise.reject({
        code: 'error',
        message: 'Failed to fetch user facilities',
        serverResponse: error
      })
    }
  }

  if (facilityIds.length) {
    filters = {
      facilityId: facilityIds.join(","),
      facilityId_op: "in",
      pageSize: facilityIds.length
    }
  }

  // Fetch the facilities associated with group
  if (facilityGroupId) {
    try {
      resp = await fetchFacilitiesByGroup(facilityGroupId, filters)

      facilityIds = resp.map((facility: any) => facility.facilityId);
      if (!facilityIds.length) {
        return Promise.reject({
          code: 'error',
          message: 'Failed to fetch user facilities',
          serverResponse: resp.data
        })
      }
    } catch (error) {
      return Promise.reject({
        code: 'error',
        message: 'Failed to fetch user facilities',
        serverResponse: error
      })
    }
  }

  if (facilityIds.length) {
    filters = {
      facilityId: facilityIds.join(","),
      facilityId_op: "in",
      pageSize: facilityIds.length
    }
  }

  let params = {
    url: "oms/facilities",
    method: "GET",
    params: {
      pageSize: 500,
      ...payload,
      ...filters
    }
  }

  let facilities: Array<any> = []

  try {
    resp = await api(params);

    facilities = resp.data
  } catch (error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch facilities",
      serverResponse: error
    })
  }

  return Promise.resolve(facilities)
}

async function fetchFacilitiesByParty(partyId: string, payload?: any): Promise<Array<any> | Response> {
  let params = {
    url: `inventory-cycle-count/user/${partyId}/facilities`,
    method: "GET",
    params: {
      ...payload,
      pageSize: 500
    }
  }

  let resp = {} as any;

  try {
    resp = await api(params);

    // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
    // Considering that the facilities will always have a thruDate of the past.
    const facilities = resp.data.filter((facility: any) => !facility.thruDate)
    return Promise.resolve(facilities)
  } catch (error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch user associated facilities",
      serverResponse: error
    })
  }
}

async function fetchFacilitiesByGroup(facilityGroupId: string, payload?: any): Promise<any> {
  let params = {
    url: "oms/groupFacilities",
    method: "GET",
    params: {
      facilityGroupId,
      pageSize: 500,
      ...payload
    }
  }

  let resp = {} as any;

  try {
    resp = await api(params);

    // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
    // Considering that the facilities will always have a thruDate of the past.
    const facilities = resp.data.filter((facility: any) => !facility.thruDate)
    return Promise.resolve(facilities)
  } catch (error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch facilities for group",
      serverResponse: error
    })
  }
}

async function getUserPreference(preferenceKey: string, userId: any): Promise<any> {
  let params = {
    url: "admin/user/preferences",
    method: "GET",
    params: {
      pageSize: 1,
      userId,
      preferenceKey
    }
  }

  let resp = {} as any;
  try {
    resp = await api(params);

    return Promise.resolve(resp.data[0]?.preferenceValue ? jsonParse(resp.data[0]?.preferenceValue) : "")
  } catch (error) {
    return Promise.reject({
      code: "error",
      message: "Failed to get user preference",
      serverResponse: error
    })
  }
}

export const UserService = {
  addFacilityToGroup,
  createEnumeration,
  getEComStoresByFacility,
  getFacilityDetails,
  getFacilityOrderCount,
  getFacilityGroupDetails,
  getUserFacilities,
  getUserPreference,
  getUserProfile,
  getPreferredStore,
  isEnumExists,
  moquiLogin,
  setUserPreference,
  setUserLocale,
  getUserPermissions,
  updateFacility,
  updateFacilityToGroup,
}
