import { api } from '@/adapter';

const getInventoryAvailableByFacility = async (query: any): Promise <any> => {
  return api({
    url: "service/getInventoryAvailableByFacility", 
    method: "post",
    data: query
  });
}

export const StockService = {
  getInventoryAvailableByFacility
}