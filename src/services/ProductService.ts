import { api, client } from '@/adapter';
import store from '@/store';


const fetchProducts = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "searchProducts", 
    method: "post",
    data: query,
    cache: true
  });
}

const fetchProductComponents = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/products/${params.productId}/variants`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params,
  });
}

const fetchSampleProducts = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/products`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params,
  });
}

const fetchProductsAverageCost = async (productIds: any, facilityId: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  
  if(!productIds.length) return []
  const requests = [], productIdList = productIds, productAverageCostDetail = {} as any;

  while(productIdList.length) {
    const productIds = productIdList.splice(0, 100)
    const params = {
      facilityId,
      productId: productIds,
      productId_op: "in",
      productAverageCostTypeId: "WEIGHTED_AVG_COST",
      pageSize: 250, // maximum view size
      //thruDate_op: "empty",
      orderByField: "fromDate DESC",
      fieldsToSelect: ["productId", "averageCost"]
    }
    requests.push(params)
  }

  const productAverageCostResps = await Promise.allSettled(requests.map((params) => client({
    url: `/oms/products/averageCosts`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params,
  })))

  const hasFailedResponse = productAverageCostResps.some((response: any) => response.status !== "fulfilled")
  if(hasFailedResponse) return {};

  productAverageCostResps.map((response: any) => {
    if(response.value.data?.length) {
      response.value.data.map((item: any) => {
        if(!productAverageCostDetail[item.productId]) productAverageCostDetail[item.productId] = item.averageCost
      })
    }
  })

  return productAverageCostDetail;
}

export const ProductService = {
  fetchProducts,
  fetchProductComponents,
  fetchProductsAverageCost,
  fetchSampleProducts
}