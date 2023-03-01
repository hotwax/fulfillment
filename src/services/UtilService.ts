import { api } from '@/adapter';

const fetchPickersInformation = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "solr-query", 
    method: "post",
    data: query,
    cache: true
  });
}

export const UtilService = {
  fetchPickersInformation
}