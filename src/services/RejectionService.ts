import { api } from '@common';
import { commonUtil } from "@common";
const fetchRejectionStats = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
    baseURL: commonUtil.getOmsURL()
  });
}

const fetchRejctedOrders = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
    baseURL: commonUtil.getOmsURL()
  });
}

const findRejectedOrdersDetail = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
    baseURL: commonUtil.getOmsURL()
  });
}

export const RejectionService = {
  fetchRejctedOrders,
  findRejectedOrdersDetail,
  fetchRejectionStats,
}  
