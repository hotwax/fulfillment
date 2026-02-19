import { apiClient } from '@/adapter';
import store from '@/store';

const getInventoryAvailableByFacility = async (query: any): Promise <any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/poorti/getInventoryAvailableByFacility`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

export const StockService = {
  getInventoryAvailableByFacility
}