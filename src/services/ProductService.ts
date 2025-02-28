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
    data: params,
  });
}

export const ProductService = {
  fetchProducts,
  fetchProductComponents
}