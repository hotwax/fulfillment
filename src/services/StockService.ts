import { client } from '@/adapter';
import store from '@/store';

const getInventoryAvailableByFacility = async (query: any): Promise <any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/getInventoryAvailableByFacility`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

export const StockService = {
  getInventoryAvailableByFacility
}