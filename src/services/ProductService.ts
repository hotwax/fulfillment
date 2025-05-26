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

const fetchProductComponents = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/entityData`,
    method: "post",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
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
      customParametersMap: {
        facilityId,
        productId: productIds,
        productId_op: "in",
        productAverageCostTypeId: "WEIGHTED_AVG_COST",
        orderByField: "-fromDate"
      },
      selectedEntity: "org.apache.ofbiz.accounting.ledger.ProductAverageCost",
      filterByDate: true,
      pageLimit: 100, //There should be one active record per product
      //thruDate_op: "empty",
      //orderByField: "fromDate DESC",
      //fieldsToSelect: ["productId", "averageCost"]
    }
    requests.push(params)
  }

  const productAverageCostResps = await Promise.allSettled(requests.map((payload) => client({
    url: `/oms/entityData`,
    method: "post",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  })))

  const hasFailedResponse = productAverageCostResps.some((response: any) => response.status !== "fulfilled")
  if(hasFailedResponse) return {};

  productAverageCostResps.map((response: any) => {
    if(response.value.data?.entityValueList?.length) {
      response.value.data.entityValueList.map((item: any) => {
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