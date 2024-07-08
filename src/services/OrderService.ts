import { api, client, hasError } from '@/adapter';
import { translate } from '@hotwax/dxp-components'
import logger from '@/logger';
import { showToast, formatPhoneNumber } from '@/utils';
import store from '@/store';
import { cogOutline } from 'ionicons/icons';

const fetchOrderHeader = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}
const fetchOrderItems = async (orderId: string): Promise<any> => {
  let viewIndex = 0;
  let orderItems = [] as any, resp;

  try {
    do {
      resp = await api({
        url: "performFind",
        method: "get",
        params : {
          "entityName": "OrderItemAndProduct",
          "inputFields": {
            "orderId": orderId,
          },
          "fieldList": ["orderId", "orderItemSeqId", "statusId", "shipGroupSeqId", "productId", "productName", "internalName", "quantity"],
          "viewIndex": viewIndex,
          "viewSize": 250,  // maximum records we could have
          "distinct": "Y",
          "noConditionFind": "Y"
        }
      }) as any;

      if (!hasError(resp) && resp.data.count) {
        orderItems = orderItems.concat(resp.data.docs)
        viewIndex++;
      } else {
        throw resp.data;
      }
    }
    while (resp.data.docs.length >= 250);
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

const fetchShipmentItems = async (orderId: string, shipmentId: string): Promise<any> => {
  let viewIndex = 0;
  let shipmentItems = [] as any, resp;

  try {
    const inputFields = {} as any;
    if (orderId) {
      inputFields['orderId'] = orderId;
    }
    if (shipmentId) {
      inputFields['shipmentId'] = shipmentId;
    }

    do {
      resp = await api({
        url: "performFind",
        method: "get",
        params: {
          "entityName": "ShipmentItemDetail",
          inputFields,
          "fieldList": ["shipmentId", "shipmentStatusId", "shipmentItemSeqId", "orderId", "orderItemSeqId", "productId", "productName", "internalName", "quantity", "orderedQuantity"],
          "viewIndex": viewIndex,
          "viewSize": 250,
          "distinct": "Y"
        }
      }) as any;

      if (!hasError(resp) && resp.data.count) {
        shipmentItems = shipmentItems.concat(resp.data.docs)
        viewIndex++;
      } else {
        throw resp.data;
      }
    }
    while (resp.data.docs.length >= 250);
  } catch (error) {
    logger.error(error);
  }
  return shipmentItems
}

const createOutboundTransferShipment = async (query: any): Promise<any> => {
  return api({
    url: "createSalesShipment",
    method: "post",
    data: query
  });
}

const updateShipment = async (payload: any): Promise<any> => {
  return api({
    url: "updateShipment",
    method: "POST",
    data: payload
  })
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

const addTrackingCode = async (payload: any): Promise<any> => {
  try {
    let resp = await updateShipmentRouteSegment({
      "shipmentId": payload.shipmentId,
      "shipmentRouteSegmentId": payload.shipmentRouteSegmentId,
      "carrierServiceStatusId": "SHRSCS_CONFIRMED"
    }) as any;
    if (!hasError(resp)) {
      resp = await updateShipmentPackageRouteSeg({
        "shipmentId": payload.shipmentId,
        "shipmentRouteSegmentId": payload.shipmentRouteSegmentId,
        "shipmentPackageSeqId": payload.shipmentPackageSeqId,
        "trackingCode": payload.trackingCode
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
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to add tracking code', err)
  }
}

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

const findTransferOrders = async (query: any): Promise<any> => {
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
  const baseURL = store.getters['user/getBaseUrl'];
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

const rejectFulfillmentReadyOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: "service/rejectFulfillmentReadyOrderItem",
    method: "post",
    data: payload.data,
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
    "fieldList": ["shipmentId", "shipmentRouteSegmentId", "shipmentPackageSeqId", "shipmentBoxTypeId", "packageName", "primaryOrderId", "carrierPartyId", "isTrackingRequired"],
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

const fetchTrackingCodes = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentTrackingCodes = [];
  const params = {
    "entityName": "ShipmentPackageRouteSeg",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "shipmentItemSeqId_op": "not-empty"
    },
    "fieldList": ["shipmentId", "shipmentPackageSeqId", "trackingCode"],
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
      shipmentTrackingCodes = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch tracking codes for shipments', err)
  }

  return shipmentTrackingCodes;
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
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'packing slip'}), { icon: cogOutline });
    }

  } catch (err) {
    showToast(translate('Failed to print packing slip'))
    logger.error("Failed to load packing slip", err)
  }
}

const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>): Promise<any> => {
  try {
    let pdfUrls = shippingLabelPdfUrls;
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

const printCustomDocuments = async (internationalInvoiceUrls: Array<string>): Promise<any> => {
  if (!internationalInvoiceUrls || internationalInvoiceUrls.length === 0) {
    return;
  }
  try {
    internationalInvoiceUrls.forEach((url: string) => {
      try {
        (window as any).open(url, "_blank").focus();
      } catch {
        showToast(translate('Unable to open as the browser is blocking pop-ups.', { documentName: 'custom document' }), { icon: cogOutline });
      }
    });
  } catch (err) {
    showToast(translate('Failed to print custom document'));
    logger.error("Failed to load custom document", err);
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
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'shipping label and packing slip'}), { icon: cogOutline });
    }

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

const retryShippingLabel = async (shipmentIds: Array<string>, forceRateShop = false): Promise<any> => {
  return api({
    method: 'POST',
    url: 'retryShippingLabel',  // TODO: update the api
    data: {
      shipmentIds,
      forceRateShop: forceRateShop ? 'Y' : 'N'
    }
  })
}

const fetchShipmentLabelError = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentLabelError = [];
  const params = {
    "entityName": "ShipmentPackageRouteSeg",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "gatewayMessage": null,
      "gatewayMessage_op": "notEqual",
      "gatewayStatus": "error", 
      "gatewayStatus_op": "equals"
    },
    "fieldList": ["shipmentId", "gatewayMessage"],
    "viewSize": 20,
  }

  try {
    const resp: any = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }
    shipmentLabelError = resp.data.docs.map((doc: any) => doc.gatewayMessage);
  } catch (err) {
    logger.error('Failed to fetch shipment label error', err)
  }
  return shipmentLabelError;
}

const findOrderShipGroup = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const fetchAdditionalShipGroupForOrder = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchOrderItemShipGroup = async (order: any): Promise<any> => {
  let shipGroup = {};

  const params = {
    "entityName": "OrderItemShipGroup",
    "inputFields": {
      "orderId": order.orderId,
      "shipGroupSeqId": order.shipGroupSeqId,
    },
    "fieldList": ["orderId", "shipGroupSeqId", "facilityId", "shipmentMethodTypeId", "contactMechId"],
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipGroup = resp?.data.docs[0];
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipments for orders', err)
  }

  return shipGroup;
}

const fetchOrderPaymentPreferences = async (orderId: any): Promise<any> => {
  const params = {
    "entityName": "OrderPaymentPreference",
    "inputFields": {
      "orderId": orderId,
    },
    "fieldList": ["orderId", "paymentMethodTypeId", "statusId"],
    "distinct": "Y"
  }

  return await api({
    url: "performFind",
    method: "get",
    params
  });
}

const fetchShippingAddress = async (contactMechId: string): Promise<any> => {
  let shippingAddress = {};

  const params = {
    "entityName": "PostalAddressAndGeo",
    "inputFields": {
      "contactMechId": contactMechId,
    },
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shippingAddress = resp?.data.docs[0];
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipments for orders', err)
  }
  return shippingAddress;
}

const getShippingPhoneNumber = async (orderId: string): Promise<any> => {
  let phoneNumber = '' as any
  try {
    let resp: any = await api({
      url: "performFind",
      method: "get",
      params: {
        "entityName": "OrderContactMech",
        "inputFields": {
          orderId,
          "contactMechPurposeTypeId": "PHONE_SHIPPING"
        },
        "fieldList": ["orderId", "contactMechPurposeTypeId", "contactMechId"],
        "viewSize": 1
      }
    })

    if (!hasError(resp)) {
      const contactMechId = resp.data.docs[0].contactMechId
      resp = await api({
        url: "performFind",
        method: "get",
        params: {
          "entityName": "TelecomNumber",
          "inputFields": {
            contactMechId,
          },
          "fieldList": ["contactNumber", "countryCode", "areaCode", "contactMechId"],
          "viewSize": 1
        }
      })
      
      if (!hasError(resp)) {
        const { contactNumber, countryCode, areaCode } =  resp.data.docs[0]
        phoneNumber = formatPhoneNumber(countryCode, areaCode, contactNumber)
      } else {
        throw resp.data
      }
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error('Failed to fetch customer phone number', err)
  }
  return phoneNumber
}

export const OrderService = {
  addShipmentBox,
  addTrackingCode,
  bulkShipOrders,
  createOutboundTransferShipment,
  fetchAdditionalShipGroupForOrder,
  fetchOrderHeader,
  fetchOrderItems,
  fetchShipmentCarrierDetail,
  fetchShipmentItems,
  fetchShipments,
  fetchShipmentPackages,
  fetchShipmentShippedStatusHistory,
  fetchShippedQuantity,
  fetchTrackingCodes,
  findCompletedOrders,
  findInProgressOrders,
  findTransferOrders,
  findOpenOrders,
  findOrderShipGroup,
  packOrder,
  packOrders,
  printCustomDocuments,
  printPackingSlip,
  printPicklist,
  printShippingLabel,
  printShippingLabelAndPackingSlip,
  rejectFulfillmentReadyOrderItem,
  rejectOrderItem,
  retryShippingLabel,
  shipOrder,
  unpackOrder,
  updateOrder,
  updateShipment,
  fetchShipmentLabelError,
  fetchOrderItemShipGroup,
  fetchShippingAddress,
  fetchOrderPaymentPreferences,
  getShippingPhoneNumber
}
