import api from '@/api';

const fetchCompletedOrders = async (payload: any): Promise<any> => {
  return api({
    url: "/solr-query",
    method: "POST",
    data: payload,
  });
}

export const OrderService = {
  fetchCompletedOrders
}