import { api } from '@/adapter';

const fetchPartyInformation = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

export const partyService = {
  fetchPartyInformation
}