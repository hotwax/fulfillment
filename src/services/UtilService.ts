import { api } from '@/adapter'

const fetchPicklistInformation = async (query: any): Promise <any>  => {
  return api({
    url: "performFind", 
    method: "post",
    data: query
  });
}

export const UtilService = {
  fetchPicklistInformation
}