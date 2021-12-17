import api from '@/api';

const fetchOpenOrders = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "wms-orders", 
    method: "get",
    data: query
  });
}

export const OrderService = {
  fetchOpenOrders
}