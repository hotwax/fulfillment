import { api, client, hasError } from '@/adapter';
import store from '@/store';
import logger from '@/logger'

const fetchShipmentMethods = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const fetchTransferOrderFacets = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const fetchCarrierShipmentBoxTypes = async(params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/shippingGateways/carrierShipmentBoxTypes",
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchDefaultShipmentBox = async(query: any) : Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/systemProperties`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchRejectReasons = async(query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
  })
}

const fetchCarrierPartyIds = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query",
    method: "post",
    data: query
  });
}

const fetchConfiguredCarrierService = async(query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const generateManifest = async(payload: any): Promise<any> => {
  return api({
    url: "generateManifests",
    method: "POST",
    data: payload
  });
}

const downloadCarrierManifest = async(payload: any): Promise<any> => {
  return api({
    url: "downloadCarrierManifest",
    method: "POST",
    data: payload,
    responseType: "blob"
  });
}

const fetchPartyInformation = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/parties`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchShipmentMethodTypeDesc = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchShipmentBoxType = async (query: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/shipmentBoxTypes`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchFacilityTypeInformation = async (query: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/facilities`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchPaymentMethodTypeDesc = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/paymentMethodTypes`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchStatusDesc = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/statuses`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const findProductStoreShipmentMethCount = async (query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/shipmentMethods/counts`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: query
  });
}

const createEnumeration = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const updateEnumeration = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums/${payload.enumId}`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const deleteEnumeration = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums/${payload.enumId}`,
    method: "DELETE",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
  });
}

const fetchEnumeration = async (payload: any): Promise <any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchProductStores = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchFacilities = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/facilities",
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchProductStoreFacilities = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${params.productStoreId}/facilities`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}

const updateForceScanSetting = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createForceScanSetting = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateBarcodeIdentificationPref = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createBarcodeIdentificationPref = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const getProductStoreSetting = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${params.productStoreId}/settings`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchGiftCardFulfillmentInfo = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/giftCardFulfillments`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchFulfillmentRejectReasons = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const createEnumerationGroupMember = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const updateEnumerationGroupMember = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const isEnumExists = async (enumId: string): Promise<any> => {
  try {
    const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
    const baseURL = store.getters['user/getMaargBaseUrl'];
  
    const resp = client({
      url: `/admin/enums`,
      method: "GET",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
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

const fetchAdjustmentTypeDescription = async(payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/orderAdjustmentTypes`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchCarriers = async (params: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/carrierParties`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params,
  });
}

const fetchStoreCarrierAndMethods = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/entityData`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const fetchFacilityAddresses = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/entityData`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const fetchFacilityZPLGroupInfo = async (facilityId: string): Promise<any> => {
  let isFacilityZPLConfigured = false;
  const payload = {
    customParametersMap: {
      facilityGroupId: "ZPL_SHIPPING_LABEL",
      facilityGroupTypeId: "SHIPPING_LABEL",
    },
    selectedEntity: "co.hotwax.facility.FacilityGroupAndMember",
    filterByDate: true,
    pageLimit: 1
    //thruDate_op: "empty",
  }

  try {

    const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
    const baseURL = store.getters['user/getMaargBaseUrl'];

    const resp = await client({
      url: `/oms/entityData`,
      method: "POST",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      },
      data: payload
    });

    if (!hasError(resp) && resp.data?.entityValueList?.length > 0) {
      isFacilityZPLConfigured = true
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err)
  }
  return isFacilityZPLConfigured;
}

const fetchLabelImageType = async (carrierId : string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/systemProperties`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: {"systemResourceId": carrierId, "systemPropertyId": "shipment.carrier.labelImageType", "pageSize": 1}
  });
}

export const UtilService = {
  createBarcodeIdentificationPref,
  fetchCarriers,
  createEnumerationGroupMember,
  createForceScanSetting,
  createEnumeration,
  downloadCarrierManifest,
  fetchAdjustmentTypeDescription,
  fetchCarrierPartyIds,
  fetchDefaultShipmentBox,
  fetchEnumeration,
  fetchFacilities,
  fetchFacilityAddresses,
  fetchFacilityZPLGroupInfo,
  fetchFacilityTypeInformation,
  fetchFulfillmentRejectReasons,
  fetchGiftCardFulfillmentInfo,
  fetchPartyInformation,
  fetchProductStores,
  fetchRejectReasons,
  fetchShipmentBoxType,
  fetchShipmentMethods,
  fetchShipmentMethodTypeDesc,
  fetchStoreCarrierAndMethods,
  fetchPaymentMethodTypeDesc,
  fetchStatusDesc,
  fetchCarrierShipmentBoxTypes,
  fetchProductStoreFacilities,
  fetchConfiguredCarrierService,
  findProductStoreShipmentMethCount,
  fetchTransferOrderFacets,
  generateManifest,
  getAvailablePickers,
  getProductStoreSetting,
  isEnumExists,
  deleteEnumeration,
  updateEnumeration,
  updateBarcodeIdentificationPref,
  updateEnumerationGroupMember,
  updateForceScanSetting,
  fetchLabelImageType
}