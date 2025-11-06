import { api, apiClient } from '@/adapter';
import store from '@/store';
import logger from '@/logger';
import { hasError } from '@/adapter';

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "searchProducts", 
    method: "post",
    data: query,
    cache: true
  });
}

const fetchProductComponents = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/dataDocumentView`,
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const fetchProductAverageCost = async (productId: string, facilityId: string): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  if(!productId) return;
  let productAverageCost = ''

  const payload = {
    customParametersMap: {
      facilityId,
      productId,
      orderByField: "-fromDate",
      pageIndex: 0,
      pageSize: 1
    },
    dataDocumentId: "ProductWeightedAverageCost",
    filterByDate: true
  };

  try {
    const resp = await apiClient({
      url: `/oms/dataDocumentView`,
      method: "post",
      baseURL,
      headers: {
        "Authorization": `Bearer ${omstoken}`,
        "Content-Type": "application/json"
      },
      data: payload
    });

    if(!hasError(resp) && resp.data?.entityValueList?.length) {
      const list = resp.data.entityValueList;
      productAverageCost = list[0].averageCost;
    }
  } catch (err) {
    logger.error("Failed to fetch product average cost", err);
    return;
  }

  return productAverageCost;
};

const fetchBarcodeIdentificationDesc = async (params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/goodIdentificationTypes`,
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

export const ProductService = {
  fetchProducts,
  fetchProductComponents,
  fetchProductAverageCost,
  fetchBarcodeIdentificationDesc
}