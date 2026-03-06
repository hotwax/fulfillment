import { api } from '@common';
import { getOmsURL } from '@common/utils/commonUtil';
const fetchRejectionStats = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
    baseURL: getOmsURL()
  });
}

const fetchRejctedOrders = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
    baseURL: getOmsURL()
  });
}

const findRejectedOrdersDetail = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
    baseURL: getOmsURL()
  });
}

export const RejectionService = {
  fetchRejctedOrders,
  findRejectedOrdersDetail,
  fetchRejectionStats,
}  
