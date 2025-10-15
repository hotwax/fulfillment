import { api, apiClient, hasError } from '@/adapter';
import store from '@/store';
import logger from '@/logger'

const login = async (username: string, password: string): Promise <any> => {
  return api({
    url: "login", 
    method: "post",
    data: {
      'USERNAME': username, 
      'PASSWORD': password
    }
  });
}
const moquiLogin = async (omsRedirectionUrl: string, token: string): Promise <any> => {
  const baseURL = omsRedirectionUrl.startsWith('http') ? omsRedirectionUrl.includes('/rest/s1/admin') ? omsRedirectionUrl : `${omsRedirectionUrl}/rest/s1/admin/` : `https://${omsRedirectionUrl}.hotwax.io/rest/s1/admin/`;
  let api_key = ""

  try {
    const resp = await apiClient({
      url: "login",
      method: "post",
      baseURL,
      params: {
        token
      },
      headers: {
        "Content-Type": "application/json"
      }
    }) as any;

    if(!hasError(resp) && (resp.data.api_key || resp.data.token)) {
      api_key = resp.data.api_key || resp.data.token
    } else {
      throw "Sorry, login failed. Please try again";
    }
  } catch(err) {
    logger.error(err)
    return Promise.resolve("");
  }
  return Promise.resolve(api_key)
}

const getFacilityDetails = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilities/${payload.facilityId}`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const getFacilityOrderCount = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilities/facilityOrderCounts`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const updateFacility = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilities/${payload.facilityId}`,
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateFacilityToGroup = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilities/${payload.facilityId}/groups`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const addFacilityToGroup = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilities/${payload.facilityId}/groups`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const getFacilityGroupDetails = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilityGroups`,
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const getPreferredStore = async (token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const baseURL = store.getters['user/getMaargBaseUrl'];
    const resp = await apiClient({
      url: `/oms/userPreferences`,
      method: "GET",
      baseURL,
      headers: {
        "api_key": token,
        "Content-Type": "application/json"
      },
      params: {'userPrefTypeId': 'SELECTED_BRAND'}
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
  const baseURL = store.getters['user/getBaseUrl'];
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
    resp = await apiClient({
      url: "getPermissions",
      method: "post",
      baseURL,
      data: params,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    })
    if (resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
      serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId);
      const total = resp.data.count;
      const remainingPermissions = total - serverPermissions.length;
      if (remainingPermissions > 0) {
        // We need to get all the remaining permissions
        const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + (remainingPermissions % viewSize != 0 ? 1 : 0);
        const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => {
          const response = await apiClient({
            url: "getPermissions",
            method: "post",
            baseURL,
            data: {
              "viewIndex": index + 1,
              viewSize,
              permissionIds: payload.permissionIds
            },
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
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
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const resp = await apiClient({
      url: "user-profile",
      method: "get",
      baseURL,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if(hasError(resp)) return Promise.reject("Error getting user profile: " + JSON.stringify(resp.data));
    return Promise.resolve(resp.data)
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const setUserPreference = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/userPreferences`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const getPartialOrderRejectionConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const createEnumeration = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enums`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  })
}

const isEnumExists = async (enumId: string): Promise<any> => {
  try {
    const omstoken = store.getters['user/getUserToken'];
    const baseURL = store.getters['user/getMaargBaseUrl'];

    const resp = await apiClient({
      url: `/admin/enums`,
      method: "GET",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
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

const getReservationFacilityIdFieldConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const getDisableShipNowConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const getDisableUnpackConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const createPartialOrderRejectionConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updatePartialOrderRejectionConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const getCollateralRejectionConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}
const createCollateralRejectionConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const updateCollateralRejectionConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const getAffectQohConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}
const createAffectQohConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const updateAffectQohConfig = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}


export const UserService = {
    addFacilityToGroup,
    createAffectQohConfig,
    createCollateralRejectionConfig,
    createEnumeration,
    createPartialOrderRejectionConfig,
    login,
    getAffectQohConfig,
    getCollateralRejectionConfig,
    getDisableShipNowConfig,
    getDisableUnpackConfig,
    getFacilityDetails,
    getFacilityOrderCount,
    getFacilityGroupDetails,
    getPartialOrderRejectionConfig,
    getReservationFacilityIdFieldConfig,
    getUserProfile,
    getPreferredStore,
    isEnumExists,
    moquiLogin,
    setUserPreference,
    getUserPermissions,
    updateAffectQohConfig,
    updateFacility,
    updateFacilityToGroup,
    updateCollateralRejectionConfig,
    updatePartialOrderRejectionConfig
}