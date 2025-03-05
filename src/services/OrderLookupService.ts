import { api, client } from "@/adapter"
import store from '@/store';

const findOrder = async (payload: any): Promise<any> => {
  return api({
    url: "/solr-query",
    method: "post",
    data: payload
  });
}

const fetchOrderDetail = async (orderId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/oms/orders/${orderId}`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
  });
}

const fetchCarrierTrackingUrls = async (payload: any): Promise<any> => {
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
    params: payload
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
    params: payload
  });
}

const fetchOrderFacilityChange = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/orders/${payload.orderId}/facilityChange`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchOrderItems = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/orders/${payload.orderId}/items`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const findShipments = async (orderId: string): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  const params = {
    orderId: orderId,
    statusId: ['SHIPMENT_INPUT', 'SHIPMENT_CANCELLED'],
    statusId_op: "in",
    statusId_not: "Y",
    pageSize: 100,
    shipmentTypeId: 'SALES_SHIPMENT', 
  } as any

  return await client({
    url: `/poorti/shipments`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  }) as any;
}

const fetchFacilities = async (payload: any): Promise <any>  => {
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
    params: payload
  });
}

export const OrderLookupService = {
  fetchCarrierTrackingUrls,
  fetchFacilities,
  findOrder,
  fetchOrderDetail,
  fetchOrderFacilityChange,
  fetchOrderItems,
  fetchPartyInformation,
  findShipments
}