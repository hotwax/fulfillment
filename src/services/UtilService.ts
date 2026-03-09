import { api } from '@common';
import { commonUtil } from "@common/utils/commonUtil";
import logger from '@common/core/logger'
import { useUserStore } from "@/store/user";

const fetchShipmentMethods = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
    baseURL: commonUtil.getOmsURL()
  });
}

const fetchCarrierShipmentBoxTypes = async (params: any): Promise<any> => {
  return api({
    url: "/oms/shippingGateways/carrierShipmentBoxTypes",
    method: "GET",
    params
  });
}

const fetchDefaultShipmentBox = async (query: any): Promise<any> => {
  return api({
    url: `/admin/systemProperties`,
    method: "GET",
    params: query,
  });
}

const fetchRejectReasons = async (query: any): Promise<any> => {
  return api({
    url: `/admin/enums`,
    method: "GET",
    params: query,
  });
}

const fetchRejectReasonEnumTypes = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enumTypes`,
    method: "GET",
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

const fetchConfiguredCarrierService = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipmentRequests`,
    method: "get",
    params: payload,
  });
}

const generateManifest = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/generateManifest`,
    method: "POST",
    data: payload,
  });
}

const downloadCarrierManifest = async (params: any): Promise<any> => {
  return api({
    url: `/poorti/Manifest.pdf`,
    method: "GET",
    params
  });
}

const fetchPartyInformation = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/parties`,
    method: "GET",
    params: payload,
  });
}

const fetchShipmentMethodTypeDesc = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "GET",
    params: payload,
  });
}

const fetchShipmentBoxType = async (query: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/shipmentBoxTypes`,
    method: "GET",
    params: query,
  });
}

const fetchFacilityTypeInformation = async (query: any): Promise<any> => {
  return api({
    url: `/oms/facilities`,
    method: "GET",
    params: query,
  });
}

const fetchPaymentMethodTypeDesc = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/paymentMethodTypes`,
    method: "GET",
    params: payload
  });
}

const fetchStatusDesc = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/statuses`,
    method: "GET",
    params: payload
  });
}

const findProductStoreShipmentMethCount = async (query: any): Promise<any> => {
  return api({
    url: `/oms/productStores/shipmentMethods/counts`,
    method: "GET",
    params: query
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

const fetchEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enums`,
    method: "GET",
    params: payload
  });
}

const fetchProductStores = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/productStores`,
    method: "GET",
    params: payload
  });
}

const fetchProductStoreDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/productStores/${payload.productStoreId}`,
    method: "GET",
  });
}

const fetchFacilities = async (payload: any): Promise<any> => {
  return api({
    url: "/oms/facilities",
    method: "GET",
    params: payload
  });
}

const fetchProductStoreFacilities = async (): Promise<any> => {
  try {
    const productStoreId = useUserStore().getCurrentEComStore?.productStoreId;

    if (!productStoreId) {
      logger.error('Product store ID not found');
      return [];
    }

    // Define parameters before API call
    const params = {
      facilityTypeId: 'VIRTUAL_FACILITY',
      facilityTypeId_op: 'equals',
      facilityTypeId_not: 'Y',
      parentFacilityTypeId: 'VIRTUAL_FACILITY',
      parentFacilityTypeId_op: 'equals',
      parentFacilityTypeId_not: 'Y',
      pageSize: 250,
    };

    const resp = await api({
      url: `/oms/productStores/${productStoreId}/facilities`,
      method: "GET",
      params
    });

    if (!commonUtil.hasError(resp)) {
      return resp.data;
    } else {
      logger.error('Failed to fetch product store facilities:', resp.data);
      return [];
    }
  } catch (err) {
    logger.error('Failed to fetch product store facilities:', err);
    return [];
  }
}

const fetchProductStoreSetting = async (params: any): Promise<any> => {
  return api({
    url: `/oms/dataDocumentView`,
    method: "POST",
    data: {
      dataDocumentId: "ProductStoreSetting",
      customParametersMap: params
    }
  });
}

const fetchGiftCardFulfillmentInfo = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/giftCardFulfillments`,
    method: "GET",
    params: payload,
  });
}

const fetchFulfillmentRejectReasons = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "GET",
    params: payload,
  });
}

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

const fetchCarriers = async (params: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/carrierParties`,
    method: "GET",
    params,
  });
}

const fetchStoreCarrierAndMethods = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/dataDocumentView`,
    method: "POST",
    data: payload,
  });
}

const fetchFacilityAddresses = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilityContactMechs`,
    method: "GET",
    params: payload,
  });
}

const fetchFacilityZPLGroupInfo = async (): Promise<any> => {
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
    const resp = await api({
      url: `/oms/dataDocumentView`,
      method: "POST",
      data: payload
    });

    if (!commonUtil.hasError(resp) && resp.data?.entityValueList?.length > 0) {
      isFacilityZPLConfigured = true
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err)
  }
  return isFacilityZPLConfigured;
}

const fetchLabelImageType = async (carrierId: string): Promise<any> => {
  return api({
    url: `/admin/systemProperties`,
    method: "GET",
    params: { "systemResourceId": carrierId, "systemPropertyId": "shipment.carrier.labelImageType", "pageSize": 1 }
  });
}
const getFacilityGroupAndMemberDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/dataDocumentView`,
    method: "post",
    data: payload
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

const getAvailableTimeZones = async (): Promise<any> => {
  return api({
    url: "admin/user/getAvailableTimeZones",
    method: "get",
    cache: true
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
  fetchProductStoreDetails,
  fetchRejectReasons,
  fetchRejectReasonEnumTypes,
  fetchShipmentBoxType,
  fetchShipmentMethods,
  fetchShipmentMethodTypeDesc,
  fetchShopifyShopLocation,
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
  getFacilityGroupAndMemberDetails,
  getAvailableTimeZones
}
