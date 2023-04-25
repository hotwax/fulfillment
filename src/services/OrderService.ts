import { api } from '@/adapter';
import logger from '@/logger';
import { hasError } from '@/utils';

const findOpenOrders = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const findCompletedOrders = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const findInProgressOrders = async (query: any): Promise <any>  => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const packOrder = async (query: any): Promise <any> => {
  return api({
    url: "/service/packStoreFulfillmentOrder",
    method: "post",
    data: query
  })
}

const packOrders = async (query: any): Promise <any> => {
  return api({
    url: "/service/bulkPackStoreFulfillmentOrders",
    method: "post",
    data: query
  })
}

const bulkShipOrders = async (query: any): Promise<any> => {
  return api({
    url: "service/bulkShipOrders",
    method: "post",
    data: query
  })
}

const unpackOrder = async (query: any): Promise<any> => {
  return api({
    url: "service/unlockStoreFulfillmentOrder",
    method: "post",
    data: query
  })
}

const rejectOrderItem = async (payload: any): Promise <any> => {
  return api({
    url: "rejectOrderItem",
    method: "post",
    data: payload
  });
}

const addShipmentBox = async (payload: any): Promise <any> => {
  return api({
    url: "addShipmentPackage",
    method: "post",
    data: payload
  });
}

const updateOrder = async (payload: any): Promise <any> => {
  return api({
    url: "updateOrder",
    method: "post",
    data: payload.data,
    headers: payload.headers
  })
}

const printPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'PackingSlip.pdf',
      params: {
        shipmentIds
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    (window as any).open(pdfUrl, "_blank").focus();

  } catch(err) {
    logger.error("Failed to load packing slip", err)
  }
}

const printShippingLabel = async (shipmentIds: Array<string>): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'ShippingLabel.pdf',
      params: {
        shipmentIds
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    (window as any).open(pdfUrl, "_blank").focus();

  } catch(err) {
    logger.error("Failed to load shipping label", err)
  }
}

const printPicklist = async (picklistId: string): Promise<any> => {
  try {
    // Get picklist from the server
    const resp: any = await api({
      method: 'get',
      url: 'PrintPicklist.pdf',
      params: {
        picklistId
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    (window as any).open(pdfUrl, "_blank").focus();

  } catch(err) {
    logger.error("Failed to print picklist", err)
  }
}

export const OrderService = {
  addShipmentBox,
  bulkShipOrders,
  findCompletedOrders,
  findInProgressOrders,
  findOpenOrders,
  packOrder,
  packOrders,
  printPackingSlip,
  printPicklist,
  printShippingLabel,
  rejectOrderItem,
  unpackOrder,
  updateOrder
}
