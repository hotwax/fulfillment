import { api, client, hasError } from '@/adapter';
import { translate } from '@/i18n';
import logger from '@/logger';
import { showToast } from '@/utils';
import store from '@/store';

const findOpenOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const findCompletedOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const findInProgressOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const packOrder = async (payload: any): Promise<any> => {
  return api({
    url: "/service/packStoreFulfillmentOrder",
    method: "post",
    data: payload
  })
}

const packOrders = async (payload: any): Promise<any> => {
  return api({
    url: "/service/bulkPackStoreFulfillmentOrders",
    method: "post",
    data: payload
  })
}

const bulkShipOrders = async (payload: any): Promise<any> => {
  return api({
    url: "service/bulkShipOrders",
    method: "post",
    data: payload
  })
}

const unpackOrder = async (payload: any): Promise<any> => {
  return api({
    url: "service/unlockStoreFulfillmentOrder",
    method: "post",
    data: payload
  })
}

const rejectOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: "rejectOrderItem",
    method: "post",
    data: payload
  });
}

const addShipmentBox = async (payload: any): Promise<any> => {
  return api({
    url: "addShipmentPackage",
    method: "post",
    data: payload
  });
}
const shipOrder = async (payload: any): Promise<any> => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: 'shipOrder',
    method: 'POST',
    data: payload,
    baseURL,
    headers: { "Content-Type": "multipart/form-data" },
  })
}

const updateOrder = async (payload: any): Promise<any> => {
  return api({
    url: "updateOrder",
    method: "post",
    data: payload.data,
    headers: payload.headers
  })
}

const fetchShipments = async (picklistBinIds: Array<string>, orderIds: Array<string>, originFacilityId: string, statusId = ["SHIPMENT_SHIPPED", "SHIPMENT_PACKED"]): Promise<any> => {
  let shipments = [];

  const params = {
    "entityName": "Shipment",
    "inputFields": {
      "primaryOrderId": orderIds,
      "primaryOrderId_op": "in",
      "picklistBinId": picklistBinIds,
      "picklistBinId_op": "in",
      "originFacilityId": originFacilityId,
      "statusId": statusId,
      "statusId_op": "in"
    },
    "fieldList": ["primaryOrderId", "picklistBinId", "shipmentId", "shipmentMethodTypeId", "statusId", "shipmentTypeId"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    // TODO: handle case when viewSize is more than 250 as performFind api does not return more than 250 records at once
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipments = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipments for orders', err)
  }

  return shipments;
}

const fetchShipmentPackages = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentPackages = [];
  const params = {
    "entityName": "ShipmentPackageRouteSegDetail",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "trackingCode_op": "empty",
      "shipmentItemSeqId_op": "not-empty"
    },
    "fieldList": ["shipmentId", "shipmentPackageSeqId", "shipmentBoxTypeId", "packageName", "primaryOrderId", "carrierPartyId"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipmentPackages = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipment packages information', err)
  }

  return shipmentPackages;
}

const printPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'PackingSlip.pdf',
      params: {
        shipmentId: shipmentIds
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

  } catch (err) {
    showToast(translate('Failed to print packing slip'))
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
        shipmentId: shipmentIds
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

  } catch (err) {
    showToast(translate('Failed to print shipping label'))
    logger.error("Failed to load shipping label", err)
  }
}


const printShippingLabelAndPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'LabelAndPackingSlip.pdf',
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

  } catch (err) {
    showToast(translate('Failed to print shipping label and packing slip'))
    logger.error("Failed to load shipping label and packing slip", err)
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

  } catch (err) {
    showToast(translate('Failed to print picklist'))
    logger.error("Failed to print picklist", err)
  }
}

const retryShippingLabel = async (shipmentIds: Array<string>): Promise<any> => {
  return api({
    method: 'POST',
    url: 'retryShippingLabel',  // TODO: update the api
    data: {
      shipmentIds
    }
  })
}

const fetchShipmentLabelError = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentLabelError = [];
  const params = {
    "entityName": "ShipmentPackageRouteSeg",
    "inputFields": {
      "shipmentId": shipmentIds,
      "gatewayMessage": null,
      "gatewayMessage_op": "not-equal",
      "gatewayStatus": "error",
      "gatewayStatus_op": "equals"
    }
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipmentLabelError = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipment label error', err)
  }
  return shipmentLabelError;
}

export const OrderService = {
  addShipmentBox,
  bulkShipOrders,
  fetchShipments,
  fetchShipmentPackages,
  findCompletedOrders,
  findInProgressOrders,
  findOpenOrders,
  packOrder,
  packOrders,
  printPackingSlip,
  printPicklist,
  printShippingLabel,
  printShippingLabelAndPackingSlip,
  rejectOrderItem,
  retryShippingLabel,
  shipOrder,
  unpackOrder,
  updateOrder,
  fetchShipmentLabelError
}
