import { api, commonUtil } from "@common";

const createEnumerationGroupMember = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "POST",
    data: payload,
  });
}

const updateEnumerationGroupMember = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "POST",
    data: payload,
  });
}

const createEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enums`,
    method: "POST",
    data: payload,
  });
}

const updateEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enums/${payload.enumId}`,
    method: "PUT",
    data: payload,
  });
}

const deleteEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enums/${payload.enumId}`,
    method: "DELETE",
  });
}

const isEnumExists = async (enumId: string): Promise<any> => {
  try {
    const resp = await api({
      url: `/admin/enums`,
      method: "GET",
      params: { enumId }
    }) as any

    if (!commonUtil.hasError(resp) && resp.data.length) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

const fetchAdjustmentTypeDescription = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/orderAdjustmentTypes`,
    method: "GET",
    params: payload,
  });
}

const fetchProductStoreDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/productStores/${payload.productStoreId}`,
    method: "GET",
  });
}

const updateProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    data: payload
  });
}

const createProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    data: payload
  });
}

const fetchShopifyShopLocation = async (omsRedirectionUrl: string, token: any, payload: any): Promise<any> => {
  const baseURL = omsRedirectionUrl.startsWith("http") ? omsRedirectionUrl.includes("/rest/s1/oms") ? omsRedirectionUrl : `${omsRedirectionUrl}/rest/s1/oms/` : `https://${omsRedirectionUrl}.hotwax.io/rest/s1/oms/`;
  return await api({
    url: "shopifyShops/locations",
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const getAvailablePickers = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
    baseURL: commonUtil.getOmsURL()
  })
}

const getAvailableTimeZones = async (): Promise<any> => {
  return api({
    url: "admin/user/getAvailableTimeZones",
    method: "get",
    cache: true
  });
}

export const useUtil = () => {
  return {
    createEnumerationGroupMember,
    updateEnumerationGroupMember,
    createEnumeration,
    updateEnumeration,
    deleteEnumeration,
    isEnumExists,
    fetchAdjustmentTypeDescription,
    fetchProductStoreDetails,
    updateProductStoreSetting,
    createProductStoreSetting,
    fetchShopifyShopLocation,
    getAvailablePickers,
    getAvailableTimeZones
  }
}
