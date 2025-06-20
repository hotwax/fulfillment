import { client } from '@/adapter';
import store from '@/store';
  

const fetchCarriers = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/carrierShipmentMethods/counts`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}
const fetchCarrierShipmentMethods = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchShipmentMethodTypes = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}
const fetchProductStoreShipmentMethodsByCarrier = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/oms/entityData`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const  fetchProductStoreShipmentMethods = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/oms/entityData`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const removeCarrierShipmentMethod = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "DELETE",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const addCarrierShipmentMethod = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const updateShipmentMethodType = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/shipmentMethodTypes/${payload.shipmentMethodTypeId}`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const updateCarrierShipmentMethod = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const updateProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const removeProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const addCarrierToFacility = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/facilities/${payload.facilityId}/parties`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const removeCarrierFromFacility = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/facilities/${payload.facilityId}/parties`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}
const fetchCarrierFacilities = async (payload: any): Promise<any> => {
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
    data: payload
  });
}
const fetchFacilityCarriers = async (payload: any): Promise<any> => {
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
    data: payload
  });
}
const createShipmentMethod = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createCarrier = async (payload: any): Promise <any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/carrierParties`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateCarrier = async (payload: any): Promise <any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/organization/${payload.partyId}`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const fetchCarrierTrackingUrls = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/admin/systemProperties`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchShipmentGatewayConfigs = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/config`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
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
  removeCarrierFromFacility,
  removeCarrierShipmentMethod,
  removeProductStoreShipmentMethod,
  updateCarrier,
  updateCarrierShipmentMethod,
  updateProductStoreShipmentMethod,
  updateShipmentMethodType
}
