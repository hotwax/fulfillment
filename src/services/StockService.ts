import { api } from '@common';
const getInventoryAvailableByFacility = async (query: any): Promise<any> => {
  return api({
    url: `/poorti/getInventoryAvailableByFacility`,
    method: "GET",
    params: query,
  });
}

export const StockService = {
  getInventoryAvailableByFacility
}
