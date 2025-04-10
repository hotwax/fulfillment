import { api, hasError, client } from '@/adapter';
import { translate } from '@hotwax/dxp-components'
import logger from '@/logger';
import { showToast } from '@/utils';
import { closeSharp, cogOutline } from 'ionicons/icons';
import store from '@/store'


const findTransferOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    //TODO: update certain filter according to status.(moqui migration)
    url: "solr-query",
    method: "post",
    data: query
  });
}
const fetchOrderHeader = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  return client({
    url: `/oms/orders/${params}`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

const fetchOrderItems = async (orderId: string): Promise<any> => {
  let pageIndex = 0;
  let orderItems = [] as any, resp;
  try {
    const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
    const baseURL = store.getters['user/getMaargBaseUrl'];
    
    do{
      resp = await client({
        url: `/oms/orders/${orderId}/items`,
        method: "get",
        baseURL,
        headers: {
          "api_key": omsRedirectionInfo.token,
          "Content-Type": "application/json"
        },
        params: {
          pageIndex: pageIndex,
          pageSize:250
        }
      })  as any

      if (!hasError(resp) && resp.data.length) {
        orderItems = orderItems.concat(resp.data)
        pageIndex++;
      } else {
        throw resp.data;
      }
    }
    while(resp.data.length >=250)
  } catch (error) {
    logger.error(error);
  }
  return orderItems
}

const fetchShippedQuantity = async (orderId: string): Promise<any> => {
  let docCount = 0;
  let shippedItemQuantitySum = [] as any
  let viewIndex = 0;

  do {
    const params = {
      "entityName": "ShippedItemQuantitySum",
      "inputFields": {
        "orderId": orderId,
      },
      "fieldList": ["orderId", "orderItemSeqId", "productId", "shippedQuantity"],
      "viewSize": 250,  // maximum records we could have
      "distinct": "Y",
      viewIndex
    } as any;

    const resp = await api({
      url: "performFind",
      method: "get",
      params
    }) as any

    if (!hasError(resp) && resp.data.count) {
      shippedItemQuantitySum = [...shippedItemQuantitySum, ...resp.data.docs]
      docCount = resp.data.docs.length;
      viewIndex++;
    } else {
      docCount = 0
    }
  } while(docCount >= 250);

  return shippedItemQuantitySum;
}

const createOutboundTransferShipment = async (query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  return client({
    url: "/poorti/transferShipments",
    method: "post",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: query
  });
}

const fetchShipmentItems = async (orderId: string, shipmentId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  let pageIndex = 0;
  let shipmentItems = [] as any, resp;
  
  try {
    do {
      resp = await client({
        url: `/poorti/shipments/`,
        method: "get",
        baseURL,
        headers: {
          "api_key": omsRedirectionInfo.token,
          "Content-Type": "application/json"
        },
        params: {
          pageIndex: pageIndex,
          pageSize:250,
          orderId,
          shipmentId
        }
      })  as any

      if (!hasError(resp) && resp.data.shipmentCount) {
        shipmentItems = shipmentItems.concat(resp.data.shipments)
        pageIndex++;
      } else {
        throw resp.data;
      }
    }
    while (resp.data.shipmentCount >= 250);
  } catch (error) {
    logger.error(error);
  }
  return shipmentItems
}

const fetchShipmentPackages = async (shipmentIds: Array<string>, isTrackingRequired = false): Promise<any> => {
  let shipmentPackages = [];
  let trackingCodeFilters = {};

  if(!isTrackingRequired) {
    trackingCodeFilters = {
      "trackingCode_op": "empty",
      "trackingCode_grp": "1",
      "carrierServiceStatusId": "SHRSCS_VOIDED",
      "carrierServiceStatusId_grp": "2"
    }
  }

  const params = {
    "entityName": "ShipmentPackageRouteSegDetail",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "shipmentItemSeqId_op": "not-empty",
      ...trackingCodeFilters
    },
    "fieldList": ["shipmentId", "shipmentRouteSegmentId", "shipmentPackageSeqId", "shipmentBoxTypeId", "packageName", "primaryOrderId", "carrierPartyId", "isTrackingRequired", "primaryShipGroupSeqId", "labelImageUrl", "carrierServiceStatusId"],
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
      shipmentPackages.map((shipmentPackage: any) => {
        if(shipmentPackage.carrierServiceStatusId === "SHRSCS_VOIDED") {
          shipmentPackage.trackingCode = ""
          shipmentPackage.labelImageUrl = ""
          shipmentPackage.internationalInvoiceUrl = ""
        }
      })
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipment packages information', err)
  }

  return shipmentPackages;
}
const fetchShipmentCarrierDetail = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentCarriers = [];
  const params = {
    "entityName": "ShipmentRouteSegment",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
    },
    "fieldList": ["shipmentId", "carrierPartyId", "carrierServiceStatusId", "shipmentMethodTypeId", "trackingIdNumber"],
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
      shipmentCarriers = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch carrier details for shipments', err)
  }

  return shipmentCarriers;
}

const fetchShipmentShippedStatusHistory = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentStatuses = [];
  const params = {
    "entityName": "ShipmentStatus",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "statusId": "SHIPMENT_SHIPPED"
    },
    "fieldList": ["shipmentId", "statusId", "statusDate", "changeByUserLoginId"],
    "viewSize": 250,
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipmentStatuses = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipment status history for shipments', err)
  }

  return shipmentStatuses;
}
const fetchRejectReasons = async(query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get", // TODO: cache this api request
    params: query,
    cache: true
  })
}

const findShipmentPackages = async(shipmentIds: Array<string>): Promise<any> => {
  let shipmentPackages = {};
  const params = {
    "entityName": "ShipmentPackageRouteSegDetail",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in"
    },
    "fieldList": ["shipmentId", "shipmentPackageSeqId", "shipmentRouteSegmentId", "shipmentMethodTypeId", "shipmentBoxTypeId", "packageName", "primaryOrderId", "carrierPartyId", "picklistBinId", "isTrackingRequired", "trackingCode", "internationalInvoiceUrl", "labelImageUrl", "carrierServiceStatusId"],
    "viewSize": 250, //max size perform find support, need to update this logic to fetch the paginated detail
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if(resp?.status == 200 && !hasError(resp) && resp.data.count) {
      shipmentPackages = resp.data.docs.reduce((shipmentForOrders: any, shipmentPackage: any) => {
        // creating key in this pattern as the same order can have multiple picklist bin and in that we need to find to which picklist bin shipment is associated
        const key = `${shipmentPackage.primaryOrderId}_${shipmentPackage.picklistBinId}`
        if(shipmentPackage.carrierServiceStatusId === "SHRSCS_VOIDED") {
            shipmentPackage.trackingCode = ""
            shipmentPackage.labelImageUrl = ""
            shipmentPackage.internationalInvoiceUrl = ""
        }
        if (shipmentPackage.labelImageUrl) {
          shipmentPackage.labelPdfUrl = shipmentPackage.labelImageUrl;
        }
        if(shipmentForOrders[key]) {
          shipmentForOrders[key].push(shipmentPackage)
        } else {
          shipmentForOrders[key] = [shipmentPackage]
        }
        return shipmentForOrders
      }, {})
    } else if (resp?.data.error && resp.data.error !== "No record found") {
      return Promise.reject(resp.data.error);
    }
  } catch(err) {
    logger.error('Failed to fetch shipment packages information', err)
  }

  return shipmentPackages;
}

const fetchTransferOrderFacets = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const printTransferOrder = async (orderId: string): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'TransferOrder.pdf',
      params: {
        orderId: orderId
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data
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
    logger.error("Failed to load picklist", err)
  }
  //TODO: update when the endpoint is live.
  
  //const baseURL = store.getters['user/getMaargBaseUrl'];
  // try {
  //   // Get packing slip from the server
  //   const resp = client({
  //   url: `/poorti/transferOrders/${orderId}/printPicklist`,
  //   method: "get",
  //   baseURL,
  //   headers: {
  //     "api_key": omsRedirectionInfo.token,
  //     "Content-Type": "application/json"
  //   }
  //   });
    
  //   if (!resp || resp.status !== 200 || hasError(resp)) {
  //     throw resp.data
  //   }

  //   // Generate local file URL for the blob received
  //   const pdfUrl = window.URL.createObjectURL(resp);
  //   // Open the file in new tab
  //   try {
  //     (window as any).open(pdfUrl, "_blank").focus();
  //   }
  //   catch {
  //     showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'picklist'}), { icon: cogOutline });
  //   }

  // } catch (err) {
  //   showToast(translate('Failed to print picklist'))
  //   logger.error("Failed to load picklist", err)
  // }
}
const updateShipment = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const resp =  client({
    url: `/poorti/shipments/${payload.shipmentId}`,
    method: "put",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload.statusId
  });
  return resp;
}

const retryShippingLabel = async (shipmentIds: Array<string>, forceRateShop = false): Promise<any> => {
  return api({
    method: 'POST',
    url: 'retryShippingLabel',  // TODO: update the api
    data: {
      shipmentIds,
      forceRateShop: forceRateShop ? 'Y' : 'N',
      generateLabel: "Y" // This is needed to generate label after the new changes in backend related to auto generation of label.
    }
  })
}

const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>): Promise<any> => {
  try {
    let pdfUrls = shippingLabelPdfUrls?.filter((pdfUrl: any) => pdfUrl);
    if (!pdfUrls || pdfUrls.length == 0) {
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
    pdfUrls = [pdfUrl];
    }
    // Open the file in new tab
    pdfUrls.forEach((pdfUrl: string) => {
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'shipping label'}), { icon: cogOutline });
    }
    })

  } catch (err) {
    showToast(translate('Failed to print shipping label'))
    logger.error("Failed to load shipping label", err)
  }
}

const rejectOrderItems = async (payload: any): Promise <any> => {
  return api({
    url: "rejectOrderItems",
    method: "post",
    data: payload
  });
}

const addTrackingCode = async (payload: any): Promise<any> => {
  try {
    let resp = await updateShipmentPackageRouteSeg({
      "shipmentId": payload.shipmentId,
      "shipmentRouteSegmentId": payload.shipmentRouteSegmentId,
      "shipmentPackageSeqId": payload.shipmentPackageSeqId,
      "trackingCode": payload.trackingCode,
      "labelImage": "",
      "labelIntlSignImage": "",
      "labelHtml": "",
      "labelImageUrl": "",
      "internationalInvoiceUrl": ""
    });
    if (!hasError(resp)) {
      resp = await updateShipmentRouteSegment({
        "shipmentId": payload.shipmentId,
        "shipmentRouteSegmentId": payload.shipmentRouteSegmentId,
        "trackingIdNumber": payload.trackingCode,
        "carrierServiceStatusId": "SHRSCS_ACCEPTED"
      });
      if (hasError(resp)) {
        throw resp.data;
      }
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to add tracking code', err)
  }
}
const updateShipmentRouteSegment = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateShipmentRouteSegment",
    method: "POST",
    data: payload
  })
}
const updateShipmentPackageRouteSeg = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateShipmentPackageRouteSeg",
    method: "POST",
    data: payload
  })
}

export const TransferOrderService = {
  addTrackingCode,
  createOutboundTransferShipment,
  fetchOrderHeader,
  fetchOrderItems,
  fetchRejectReasons,
  fetchShipmentCarrierDetail,
  fetchShipmentItems,
  fetchShipmentShippedStatusHistory,
  fetchShippedQuantity,
  fetchShipmentPackages,
  fetchTransferOrderFacets,
  findShipmentPackages,
  findTransferOrders,
  printShippingLabel,
  printTransferOrder,
  rejectOrderItems,
  retryShippingLabel,
  updateShipment
}