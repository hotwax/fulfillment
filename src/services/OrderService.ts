import { api, client, hasError } from '@/adapter';
import store from '@/store';
import { showToast } from '@/utils';
import { translate } from '@hotwax/dxp-components';
import logger from '@/logger'
import { cogOutline } from 'ionicons/icons';
import { escapeSolrSpecialChars, prepareSolrQuery } from '@/utils/solrHelper'
import { getCurrentFacilityId, getProductStoreId } from '@/utils'

const findOpenOrders = async (payload: any): Promise<any> => {
  const openOrderQuery = payload.openOrderQuery
  const shipGroupFilter = openOrderQuery.shipGroupFilter

  const params = {
    docType: 'ORDER',
    queryString: openOrderQuery.queryString,
    queryFields: 'productId productName parentProductName orderId orderName customerEmailId customerPartyId customerPartyName  search_orderIdentifications goodIdentifications',
    viewSize: openOrderQuery.viewSize,
    sort: payload.sort ? payload.sort : "orderDate asc",
    filters: {
      '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
      orderStatusId: { value: 'ORDER_APPROVED' },
      orderTypeId: { value: 'SALES_ORDER' },
      facilityId: { value: escapeSolrSpecialChars(getCurrentFacilityId()) },
      productStoreId: { value: getProductStoreId() }
    },
    solrFilters: [
      //it should be explicit what is subtracting the first part of your OR statement from
      "((*:* -fulfillmentStatus: [* TO *]) OR fulfillmentStatus:Created)"
    ]
  } as any

  if (shipGroupFilter && Object.keys(shipGroupFilter).length) {
    Object.assign(params.filters, shipGroupFilter);
  }

  if (openOrderQuery.orderId) {
    params.filters['orderId'] = { value:  openOrderQuery.orderId }
  }
  if (openOrderQuery.groupBy) {
    params.isGroupingRequired = true
    params.groupBy = openOrderQuery.groupBy
  } else {
    params.isGroupingRequired = true
    params.groupBy = "orderId"
    payload.groupBy = "orderId"
  }

  // only adding shipmentMethods when a method is selected
  if(openOrderQuery.selectedShipmentMethods.length) {
    params.filters['shipmentMethodTypeId'] = { value: openOrderQuery.selectedShipmentMethods, op: 'OR' }
  }

  if (openOrderQuery.selectedCategories.length) {
    params.filters['productType'] = { value: openOrderQuery.selectedCategories.map((category: string) => JSON.stringify(category)), op: 'OR' }
  }

  const orderQueryPayload = prepareSolrQuery(params)
  let orders = [], total = 0, resp;

  try {
    resp = await api({
      url: "solr-query",
      method: "post",
      data: orderQueryPayload
    }) as any;
    if (!hasError(resp) && resp.data.grouped[payload.groupBy]?.matches > 0) {
      total = resp.data.grouped[payload.groupBy].ngroups
      orders = resp.data.grouped[payload.groupBy].groups

      orders = orders.map((order: any) => {
        const orderItem = order.doclist.docs[0];

        return {
          category: 'open',
          customerId: orderItem.customerPartyId,
          customerName: orderItem.customerPartyName,
          orderId: orderItem.orderId,
          orderDate: orderItem.orderDate,
          orderName: orderItem.orderName,
          groupValue: order.groupValue,
          items: order.doclist.docs,
          shipGroupSeqId: orderItem.shipGroupSeqId,
          shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
          reservedDatetime: orderItem.reservedDatetime
        }
      })
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error('No outstanding orders found', err)
  }
  return { orders, total }
}

const createPicklist = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/createOrderFulfillmentWave`,
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
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];

  try {
    const resp = await client({
      url: "/poorti/Picklist.pdf",
      method: "GET",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      },
      responseType: "blob",
      params: { picklistId }
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

const printPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  try {
    const baseURL = store.getters['user/getMaargBaseUrl'];
    const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];

    // Get packing slip from the server
    const resp = await client({
      url: "/poorti/PackingSlip.pdf",
      method: "GET",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      },
      params: {
        shipmentId: shipmentIds
      },
      responseType: "blob"
    });


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
    const baseURL = store.getters['user/getMaargBaseUrl'];
    const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];

    let pdfUrls = shippingLabelPdfUrls;
    if (!pdfUrls || pdfUrls.length == 0) {
    // Get packing slip from the server
    const resp = await client({
      url: "/poorti/Label.pdf",
      method: "GET",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      },
      params: {
        shipmentId: shipmentIds
      },
      responseType: "blob"
    });

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
    const baseURL = store.getters['user/getMaargBaseUrl'];
    const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];

    // Get packing slip from the server
    const resp = await client({
      url: "/poorti/PackingSlipAndLabel.pdf",
      method: "GET",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      },
      params: {
        shipmentId: shipmentIds
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
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'shipping label and packing slip'}), { icon: cogOutline });
    }

  } catch (err) {
    showToast(translate('Failed to print shipping label and packing slip'))
    logger.error("Failed to load shipping label and packing slip", err)
  }
}

const recycleOutstandingOrders = async(payload: any): Promise<any> => {

  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/rejectOutstandingOrders`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const findShipments = async (query: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const productStoreShipmentMethCount = store.getters['util/getProductStoreShipmentMethCount'];
  
  let orders = [], total = 0;

  try {
    const params = {
      keyword: query.queryString,
      pageSize: query.viewSize,
      orderBy: 'orderDate',
      shipmentTypeId: 'SALES_SHIPMENT', 
      originFacilityId: getCurrentFacilityId(),
      productStoreId: getProductStoreId(),
    } as any
    
    if (query.orderStatusId) {
      params.orderStatusId = query.orderStatusId
      if (Array.isArray(query.orderStatusId)) {
        params.orderStatusId_op = "in"
      }
    }
    if (query.statusId) {
      params.statusId = query.statusId
      if (Array.isArray(query.statusId)) {
        params.statusId_op = "in"
      }
    }
    if (query.orderId) {
      params.orderId = query.orderId
    }
    if (query.shipmentId) {
      params.shipmentId = query.shipmentId
      query.shipmentId_op && (params.shipmentId_op = query.shipmentId_op);
      query.shipmentId_not && (params.shipmentId_not = query.shipmentId_not);
    }
    // preparing filters separately those are based on some condition
    if (query.selectedPicklist) {
      params.picklistId = query.selectedPicklist
    }

    if(query.selectedCarrierPartyIds && query.selectedCarrierPartyIds.length) {
      params.carrierPartyId = query.selectedCarrierPartyIds,
      params.carrierPartyId_op = 'in' 
    }

    // only adding shipmentMethods when a method is selected
    if(query.selectedShipmentMethods && query.selectedShipmentMethods.length) {
      params.shipmentMethodTypeId = query.selectedShipmentMethods
      params.shipmentMethodTypeId_op = "in"
    }

    const resp = await client({
      url: `/poorti/shipments`,
      method: "GET",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      },
      params
    }) as any;
    if (!hasError(resp)) {
      total = resp.data.shipmentCount
      orders = resp.data.shipments.map((shipment: any) => {
        const missingLabelImage = productStoreShipmentMethCount > 0 ? shipment?.shipmentPackageRouteSegDetails?.some((shipmentPackageRouteSeg: any) => !shipmentPackageRouteSeg.trackingCode) : false;
        return {
          ...shipment,
          missingLabelImage,
          trackingCode: shipment?.shipmentPackageRouteSegDetails[0]?.trackingCode || null,
        };
      });
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error('No inProgress orders found', err)
  }
  return { orders, total }
}

const fetchPicklists = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/picklists`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const recycleInProgressOrders = async(payload: any): Promise<any> => {

  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/rejectInProgressOrders`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });

}

const packOrder = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/shipments/${payload.shipmentId}/pack`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const packOrders = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/shipments/bulkPack`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const resetPicker = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/picklists/${payload.picklistId}`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const addShipmentBox = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/shipments/${payload.shipmentId}/shipmentPackages`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}
const shipOrder = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/shipments/${payload.shipmentId}/ship`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}
const bulkShipOrders = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/shipments/bulkShip`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const unpackOrder = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/shipments/${payload.shipmentId}`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const retryShippingLabel = async (shipmentId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/shipments/${shipmentId}/shippingLabels`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
  });
}

const fetchShipmentLabelError = async (shipmentId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  let shipmentLabelError = []

  try {
    const payload = {
      shipmentId,
      fieldsToSelect: ["shipmentId", "gatewayMessage"],
      getewayMessage_op: 'empty',
      getewayMessage_not: 'Y'

    }

    const resp = await client({
      url: `/poorti/shipmentPackageRouteSegDetails`,
      method: "GET",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      },
      params: payload,
    });

    if (hasError(resp)) {
      throw resp.data;
    }
    shipmentLabelError = resp.data
      .filter((shipmentPackageRouteSegDetail: any) => shipmentPackageRouteSegDetail.gatewayMessage)
      .map((shipmentPackageRouteSegDetail: any) => shipmentPackageRouteSegDetail.gatewayMessage);

  } catch (err) {
    logger.error('Failed to fetch shipment label error', err)
  }
  return shipmentLabelError;
}

const fetchShipmentPackageRouteSegDetails = async (shipmentId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/poorti/shipmentPackageRouteSegDetails`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: { shipmentId },
  });
}

const voidShipmentLabel = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/poorti/shipments/${payload.shipmentId}/shippingLabels/void`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const updateShipmentCarrierAndMethod = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/poorti/updateShipmentCarrierAndMethod`, //should handle the update of OISG, SRG, SPRG if needed
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}
const findOrderInvoicingInfo = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query
  });
}

const fetchOrderDetail = async (orderId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/oms/orders/${orderId}`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
  });
}

const addTrackingCode = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    url: `/poorti/updateShipmentTracking`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const fetchGiftCardItemPriceInfo = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  const currentOrder = store.getters['order/getCurrent'];
  
  let resp = {} as any;
  const itemPriceInfo = {} as any;

  try {
    if (currentOrder && Object.keys(currentOrder).length) {
      itemPriceInfo.currencyUom = currentOrder.currencyUom
    } else {
      resp = await fetchOrderDetail(payload.orderId);
      if (!hasError(resp)) {
        itemPriceInfo.currencyUom = resp.data.currencyUom
      } else {
        throw resp.data
      }
    }

    resp = await client({
      url: "/oms/orders/${payload.orderId}/items/${payload.orderItemSeqId}",
      method: "GET",
      baseURL,
      headers: {
        "api_key": omsRedirectionInfo.token,
        "Content-Type": "application/json"
      },
      params: {fieldsToSelect: ["unitPrice"]}
    });
    if (!hasError(resp)) {
      itemPriceInfo.unitPrice = resp.data[0].unitPrice
    } else {
      throw resp.data
    }
  } catch(error: any) {
    logger.error(error);
  }

  return itemPriceInfo;
}

const activateGiftCard = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/giftCardFulfillments`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const fetchOrderItems = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/orders/${payload.orderId}/items`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

export const OrderService = {
  activateGiftCard,
  addShipmentBox,
  addTrackingCode,
  bulkShipOrders,
  createPicklist,
  fetchGiftCardItemPriceInfo,
  fetchOrderDetail,
  fetchOrderItems,
  fetchPicklists,
  fetchShipmentLabelError,
  fetchShipmentPackageRouteSegDetails,
  findOpenOrders,
  findOrderInvoicingInfo,
  findShipments,
  packOrder,
  packOrders,
  printCustomDocuments,
  printPackingSlip,
  printPicklist,
  printShippingLabel,
  printShippingLabelAndPackingSlip,
  recycleOutstandingOrders,
  recycleInProgressOrders,
  resetPicker,
  retryShippingLabel,
  shipOrder,
  unpackOrder,
  updateShipmentCarrierAndMethod,
  voidShipmentLabel
}
