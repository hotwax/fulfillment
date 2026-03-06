import { api } from '@common';


const fetchCarriers = async (params: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/carrierShipmentMethods/counts`,
    method: "GET",
    params
  });
}
const fetchCarrierShipmentMethods = async (params: any): Promise<any> => {
  return await api({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "GET",
    params
  });
}

const fetchShipmentMethodTypes = async (params: any): Promise<any> => {
  return await api({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "GET",
    params
  });
}
const fetchProductStoreShipmentMethodsByCarrier = async (payload: any): Promise<any> => {
  return await api({
    url: `/oms/dataDocumentView`,
    method: "POST",
    data: payload
  });
}
const fetchProductStoreShipmentMethods = async (payload: any): Promise<any> => {
  return await api({
    url: `/oms/dataDocumentView`,
    method: "POST",
    data: payload
  });
}
const removeCarrierShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "DELETE",
    data: payload
  });
}
const addCarrierShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "POST",
    data: payload
  });
}
const updateShipmentMethodType = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/shipmentMethodTypes/${payload.shipmentMethodTypeId}`,
    method: "PUT",
    data: payload
  });
}
const updateCarrierShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/carrierShipmentMethods`,
    method: "PUT",
    data: payload
  });
}

const createProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "POST",
    data: payload
  });
}
const updateProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "PUT",
    data: payload
  });
}
const removeProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/productStores/${payload.productStoreId}/shipmentMethods`,
    method: "PUT",
    data: payload
  });
}
const addCarrierToFacility = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}/parties`,
    method: "POST",
    data: payload
  });
}
const removeCarrierFromFacility = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}/parties`,
    method: "PUT",
    data: payload
  });
}
const fetchCarrierFacilities = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/dataDocumentView`,
    method: "POST",
    data: payload
  });
}
const fetchFacilityCarriers = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/dataDocumentView`,
    method: "POST",
    data: payload
  });
}
const createShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "POST",
    data: payload
  });
}

const createCarrier = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/carrierParties`,
    method: "POST",
    data: payload
  });
}

const updateCarrier = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/organizations/${payload.partyId}`,
    method: "POST",
    data: payload
  });
}

const fetchCarrierTrackingUrls = async (params: any): Promise<any> => {
  return await api({
    url: `/admin/systemProperties`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
    params
  });
}

const fetchShipmentGatewayConfigs = async (params: any): Promise<any> => {
  return api({
    url: `/oms/shippingGateways/config`,
    method: "GET",
    params
  });
}

const fetchShippingRates = async (params: any): Promise<any> => {
  return api({
    url: 'poorti/shippingRate/',
    method: "GET",
    params,
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
