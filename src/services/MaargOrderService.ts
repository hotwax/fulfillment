import { api, client, hasError } from '@/adapter';
import store from '@/store';
import { showToast } from '@/utils';
import { translate } from '@hotwax/dxp-components';
import logger from '@/logger'
import { cogOutline } from 'ionicons/icons';

const findOpenOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const createPicklist = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `createOrderFulfillmentWave`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const printPicklist = async (picklistId: string): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  try {
    const resp = await client({
      url: "printPicklist.pdf",
      method: "GET",
      baseURL,
      headers: {
        "Content-Type": "application/json"
      },
      responseType: "blob"
    });
    
    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }
  
    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'picklist'}), { icon: cogOutline });
    }
  } catch (err) {
    showToast(translate('Failed to print picklist'))
    logger.error("Failed to print picklist", err)
  }
}

const recycleOutstandingOrders = async(payload: any): Promise<any> => {

  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `bulkRejectStoreOutstandingOrders`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

export const MaargOrderService = {
  createPicklist,
  findOpenOrders,
  printPicklist,
  recycleOutstandingOrders
}
