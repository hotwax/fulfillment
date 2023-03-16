import { api, client } from '@/adapter';
import store from '@/store';

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

const checkPermission = async (payload: any): Promise <any>  => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: "checkPermission",
    method: "post",
    baseURL: baseURL,
    ...payload
  });
}

const getProfile = async (): Promise <any>  => {
    return api({
      url: "user-profile", 
      method: "get",
    });
}
const getAvailableTimeZones = async (): Promise <any>  => {
  return api({
    url: "getAvailableTimeZones",
    method: "get",
    cache: true
  });
}
const setUserTimeZone = async (payload: any): Promise <any>  => {
  return api({
    url: "setUserTimeZone",
    method: "post",
    data: payload
  });
}

const getFacilityDetails = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload,
    cache: true
  })
}

const updateFacility = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateFacility",
    method: "post",
    data: payload
  })
}

const recycleInProgressOrders = async(payload: any): Promise<any> => {
  return api({
    url: "service/bulkRejectStoreInProgressOrders",
    method: "post",
    data: payload
  })
}

const recycleOutstandingOrders = async(payload: any): Promise<any> => {
  return api({
    url: "service/bulkRejectStoreOutstandingOrders",
    method: "post",
    data: payload
  })
}

const getInProgressOrdersCount = async(payload: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  })
}

const getOutstandingOrdersCount = async(payload: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  })
}

export const UserService = {
    login,
    getAvailableTimeZones,
    getFacilityDetails,
    getInProgressOrdersCount,
    getOutstandingOrdersCount,
    getProfile,
    recycleInProgressOrders,
    recycleOutstandingOrders,
    setUserTimeZone,
    checkPermission,
    updateFacility
}