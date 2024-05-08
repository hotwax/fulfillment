import { api } from '@/adapter';
import { translate } from "@hotwax/dxp-components";
import { showToast } from "@/utils";
import { hasError } from '@/adapter'
import logger from '@/logger';
  

const fetchCarriers = async (params: any): Promise<any> => {
    return await api({
      url: "performFind",
      method: "get",
      params
    })
}
const fetchCarrierShipmentMethods = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchShipmentMethodTypes = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "POST",
    data: payload,
    cache: true
  })
}
const fetchProductStoreShipmentMethods = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "POST",
    data: payload,
    cache: true
  })
}
const removeCarrierShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: "service/deleteCarrierShipmentMethod",
    method: "POST",
    data: payload
  })
}
const addCarrierShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: "service/createCarrierShipmentMethod",
    method: "POST",
    data: payload
  })
}
const updateShipmentMethodType = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateShipmentMethodType",
    method: "POST",
    data: payload
  })
}
const updateCarrierShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateCarrierShipmentMethod",
    method: "POST",
    data: payload
  })
}

const createProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: "service/createProductStoreShipMeth",
    method: "POST",
    data: payload
  })
}
const updateProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreShipMeth",
    method: "POST",
    data: payload
  })
}
const removeProductStoreShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreShipMeth",
    method: "POST",
    data: payload
  })
}
const addCarrierToFacility = async (payload: any): Promise<any> => {
  return api({
    url: "service/addPartyToFacility",
    method: "POST",
    data: payload
  })
}
const removeCarrierFromFacility = async (payload: any): Promise<any> => {
  return api({
    url: "service/removePartyFromFacility",
    method: "POST",
    data: payload
  })
}
const fetchCarrierFacilities = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "POST",
    data: payload,
    cache: true
  })
}
const createShipmentMethod = async (payload: any): Promise<any> => {
  return api({
    url: "service/createShipmentMethodType",
    method: "POST",
    data: payload
  })
}

const createCarrier = async (payload: any): Promise <any> => {
  try {
    let resp = await api({
      url: "service/createPartyGroup", 
      method: "post",
      data: payload
    }) as any;

    if (!hasError(resp)) {
      const partyId = resp.data.partyId;
      if (partyId) {
        resp = await api({
          url: "service/ensurePartyRole", 
          method: "post",
          data: {partyId, "roleTypeId": "CARRIER"}
        }) as any;
        if (hasError(resp)) {
          throw resp.data
        }
      }

      showToast(translate("Carrier created successfully"));
      return partyId;
    } else {
      throw resp.data
    }
  } catch (err:any) {
    let errorMessage = translate('Failed to create carrier.');
    if (err?.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message
    }
    logger.error('error', err)
    showToast(errorMessage);
  }
}

const updateCarrier = async (payload: any): Promise <any> => {
  return api({
    url: "service/updatePartyGroup", 
    method: "post",
    data: payload
  });
}

const ensurePartyRole = async (payload: any): Promise <any> => {
  return api({
    url: "service/ensurePartyRole", 
    method: "post",
    data: payload
  });
}

export const CarrierService = {
  addCarrierShipmentMethod,
  addCarrierToFacility,
  createCarrier,
  createProductStoreShipmentMethod,
  createShipmentMethod,
  ensurePartyRole,
  fetchCarriers,
  fetchCarrierFacilities,
  fetchCarrierShipmentMethods,
  fetchProductStoreShipmentMethods,
  fetchShipmentMethodTypes,
  removeCarrierFromFacility,
  removeCarrierShipmentMethod,
  removeProductStoreShipmentMethod,
  updateCarrier,
  updateCarrierShipmentMethod,
  updateProductStoreShipmentMethod,
  updateShipmentMethodType
}
