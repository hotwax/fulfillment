import { api } from '@/adapter';

const fetchShipmentMethods = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

export const UtilService = {
  fetchShipmentMethods
}