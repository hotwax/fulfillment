import api from '@/api';

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

export const OrderService = {
  fetchInProgressOrders,
  packOrder
} 