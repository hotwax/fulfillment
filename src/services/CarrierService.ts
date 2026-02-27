import { apiClient } from '@/adapter';
import { useUserStore } from "@/store/user";
  
const getAuth = () => {
  const userStore = useUserStore();
  return {
    omstoken: userStore.getUserToken,
    baseURL: userStore.getMaargBaseUrl
  };
};

const fetchCarriers = async (params: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/shippingGateways/carrierShipmentMethods/counts`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}
const fetchCarrierShipmentMethods = async (params: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return await apiClient({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchShipmentMethodTypes = async (params: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return await apiClient({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}
const fetchProductStoreShipmentMethodsByCarrier = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return await apiClient({
    url: `/oms/dataDocumentView`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const  fetchProductStoreShipmentMethods = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return await apiClient({
    url: `/oms/dataDocumentView`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const removeCarrierShipmentMethod = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "DELETE",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const addCarrierShipmentMethod = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const updateShipmentMethodType = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/shippingGateways/shipmentMethodTypes/${payload.shipmentMethodTypeId}`,
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const updateCarrierShipmentMethod = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const updateProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const removeProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const addCarrierToFacility = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/facilities/${payload.facilityId}/parties`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const removeCarrierFromFacility = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/facilities/${payload.facilityId}/parties`,
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const fetchCarrierFacilities = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/dataDocumentView`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const fetchFacilityCarriers = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/dataDocumentView`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const createShipmentMethod = async (payload: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createCarrier = async (payload: any): Promise <any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/shippingGateways/carrierParties`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateCarrier = async (payload: any): Promise <any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/admin/organizations/${payload.partyId}`,
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const fetchCarrierTrackingUrls = async (params: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return await apiClient({
    url: `/admin/systemProperties`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchShipmentGatewayConfigs = async (params: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/oms/shippingGateways/config`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchShippingRates = async (params: any): Promise<any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: 'poorti/shippingRate/',
    method: "GET",
    baseURL,
    params,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
}

export const CarrierService = {
  addCarrierShipmentMethod,
  addCarrierToFacility,
  createCarrier,
  createProductStoreShipmentMethod,
  createShipmentMethod,
  fetchCarriers,
  fetchCarrierFacilities,
  fetchCarrierShipmentMethods,
  fetchCarrierTrackingUrls,
  fetchFacilityCarriers,
  fetchProductStoreShipmentMethods,
  fetchProductStoreShipmentMethodsByCarrier,
  fetchShipmentGatewayConfigs,
  fetchShipmentMethodTypes,
  fetchShippingRates,
  removeCarrierFromFacility,
  removeCarrierShipmentMethod,
  removeProductStoreShipmentMethod,
  updateCarrier,
  updateCarrierShipmentMethod,
  updateProductStoreShipmentMethod,
  updateShipmentMethodType
}
