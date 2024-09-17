import { api} from '@/adapter';

const fetchRejectionStats = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query
  });
}

const fetchRejctedOrders = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query
  });
}

  export const RejectionService = {
    fetchRejctedOrders,
    fetchRejectionStats
  }  