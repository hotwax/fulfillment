import { api } from '@/adapter';

const fetchInProgressOrders = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const packOrder = async (query: any): Promise <any> => {
  return api({
    url: "/service/packStoreFulfillmentOrder",
    method: "post",
    data: query
  })
}

const packOrders = async (query: any): Promise <any> => {
  return api({
    url: "/service/bulkPackStoreFulfillmentOrders",
    method: "post",
    data: query
  })
}

const rejectOrderItem = async (payload: any): Promise <any> => {
  return api({
    url: "rejectOrderItem",
    method: "post",
    data: payload
  });
}

export const OrderService = {
  fetchInProgressOrders,
  packOrder,
  packOrders,
  rejectOrderItem
} 