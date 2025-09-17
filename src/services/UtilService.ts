import { api, apiClient, hasError } from '@/adapter';
import store from '@/store';
import logger from '@/logger'

const fetchShipmentMethods = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const fetchCarrierShipmentBoxTypes = async(params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: "/oms/shippingGateways/carrierShipmentBoxTypes",
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchDefaultShipmentBox = async(query: any) : Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/systemProperties`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchRejectReasons = async(query: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enums`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchRejectReasonEnumTypes = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enumTypes`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
  })
}

const fetchConfiguredCarrierService = async(payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/poorti/shipmentRequests`,
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const generateManifest = async(payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/poorti/generateManifest`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const downloadCarrierManifest = async(params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/poorti/Manifest.pdf`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchPartyInformation = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/parties`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchShipmentMethodTypeDesc = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchShipmentBoxType = async (query: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/shippingGateways/shipmentBoxTypes`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchFacilityTypeInformation = async (query: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilities`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchPaymentMethodTypeDesc = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/paymentMethodTypes`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchStatusDesc = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/statuses`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const findProductStoreShipmentMethCount = async (query: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/shipmentMethods/counts`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query
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
    data: payload,
  });
}

const updateEnumeration = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enums/${payload.enumId}`,
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const deleteEnumeration = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enums/${payload.enumId}`,
    method: "DELETE",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
  });
}

const fetchEnumeration = async (payload: any): Promise <any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enums`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchProductStores = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchFacilities = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: "/oms/facilities",
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchProductStoreFacilities = async (params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/productStores/${params.productStoreId}/facilities`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchProductStoreSetting = async (params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/dataDocumentView`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: {
      dataDocumentId: "ProductStoreSetting",
      customParametersMap: params
    }
  });
}

const fetchGiftCardFulfillmentInfo = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/poorti/giftCardFulfillments`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchFulfillmentRejectReasons = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const createEnumerationGroupMember = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const updateEnumerationGroupMember = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload,
  });
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

const fetchAdjustmentTypeDescription = async(payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/orderAdjustmentTypes`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchCarriers = async (params: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/shippingGateways/carrierParties`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params,
  });
}

const fetchStoreCarrierAndMethods = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/dataDocumentView`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const fetchFacilityAddresses = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilityContactMechs`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchFacilityZPLGroupInfo = async (facilityId: string): Promise<any> => {
  let isFacilityZPLConfigured = false;
  const payload = {
    customParametersMap: {
      facilityGroupId: "ZPL_SHIPPING_LABEL",
      facilityGroupTypeId: "SHIPPING_LABEL",
      pageIndex: 0,
      pageSize: 1
    },
    dataDocumentId: "FacilityGroupAndMember",
    filterByDate: true,
  }

  try {

    const omstoken = store.getters['user/getUserToken'];
    const baseURL = store.getters['user/getMaargBaseUrl'];

    const resp = await apiClient({
      url: `/oms/dataDocumentView`,
      method: "POST",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
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
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/systemProperties`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: {"systemResourceId": carrierId, "systemPropertyId": "shipment.carrier.labelImageType", "pageSize": 1}
  });
}
const getFacilityGroupAndMemberDetails = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/dataDocumentView`,
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateProductStoreSetting = async (payload: any): Promise<any> => {
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

const createProductStoreSetting = async (payload: any): Promise<any> => {
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

export const UtilService = {
  fetchCarriers,
  createEnumerationGroupMember,
  createEnumeration,
  downloadCarrierManifest,
  fetchAdjustmentTypeDescription,
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
  fetchRejectReasonEnumTypes,
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
  generateManifest,
  getAvailablePickers,
  fetchProductStoreSetting,
  isEnumExists,
  deleteEnumeration,
  updateEnumeration,
  updateEnumerationGroupMember,
  fetchLabelImageType,
  updateProductStoreSetting,
  createProductStoreSetting,
  getFacilityGroupAndMemberDetails
}