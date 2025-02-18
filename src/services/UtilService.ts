import { api, client, hasError } from '@/adapter';
import logger from '@/logger';
import store from '@/store';
import { getCurrentFacilityId } from '@/utils';

const fetchShipmentMethods = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const fetchTransferOrderFacets = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const fetchPicklistInformation = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const findShipmentIdsForOrders = async(picklistBinIds: Array<string>, orderIds: Array<string>, statusId = ["SHIPMENT_APPROVED", "SHIPMENT_INPUT"]): Promise<any> => {
  let shipmentIdsForOrders = {};

  const params = {
    "entityName": "Shipment",
    "inputFields": {
      "primaryOrderId": orderIds,
      "primaryOrderId_op": "in",
      "picklistBinId": picklistBinIds,
      "picklistBinId_op": "in",
      "originFacilityId": getCurrentFacilityId(),
      "statusId": statusId,
      "statusId_op": "in"
    },
    "fieldList": ["shipmentId", "primaryOrderId", "picklistBinId"],
    "viewSize": 200,  // maximum records we have for orders
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
      shipmentIdsForOrders = resp?.data.docs.reduce((shipmentIdsForOrders: any, shipment: any) => {
        // creating key in this pattern as the same order can have multiple picklist bin and in that we need to find to which picklist bin shipment is associated
        const key = `${shipment.primaryOrderId}_${shipment.picklistBinId}`
        if(shipmentIdsForOrders[key]) {
          shipmentIdsForOrders[key].push(shipment.shipmentId)
        } else {
          shipmentIdsForOrders[key] = [shipment.shipmentId]
        }
        return shipmentIdsForOrders
      }, {})
    } else if (resp?.data.error && resp.data.error !== "No record found") {
      return Promise.reject(resp.data.error);
    }
  } catch(err) {
    logger.error('Failed to fetch shipmentIds for orders', err)
    return Promise.reject(err);
  }

  return shipmentIdsForOrders;
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

const findShipmentPackageContents = async (shipmentIds: Array<string>): Promise<any> => {
  let viewIndex = 0;
  let shipmentPackageContents: any[] = [];
  let shipmentPackageContentInfo: { [key: string]: any[] } = {}; 
  let resp;

  try {
    do {
      resp = await api({
        url: "performFind",
        method: "get",
        params: {
          "entityName": "ShipmentPackageAndContent",
          "inputFields": {
            "shipmentId": shipmentIds,
            "shipmentId_op": "in"
          },
          "fieldList": ["shipmentId", "shipmentItemSeqId", "shipmentPackageSeqId", "packageName", "quantity"],
          viewIndex,
          "viewSize": 250,
          "distinct": "Y"
        }
      }) as any;

      if (!hasError(resp) && resp.data.count) {
        shipmentPackageContents = shipmentPackageContents.concat(resp.data.docs);
        viewIndex++;
      } else {
        throw resp;
      }
    } while (resp.data.docs.length >= 250);
  } catch (error) {
    logger.error(error);
  }

  shipmentPackageContentInfo = shipmentPackageContents.reduce((contents: any, shipmentPackageContent: any) => {
    if (contents[shipmentPackageContent.shipmentId]) {
      contents[shipmentPackageContent.shipmentId].push(shipmentPackageContent);
    } else {
      contents[shipmentPackageContent.shipmentId] = [shipmentPackageContent];
    }
    return contents;
  }, {});

  return shipmentPackageContentInfo;
};


const findCarrierPartyIdsForShipment = async(shipmentIds: Array<string>): Promise<any> => {
  let carrierPartyIdsByShipment = {};
  const params = {
    "entityName": "ShipmentRouteSegment",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in"
    },
    "fieldList": ["carrierPartyId", "shipmentId"],
    "viewSize": shipmentIds.length, // TODO: check about the maximum carriers available for a shipment
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if(resp?.status == 200 && !hasError(resp) && resp.data.count) {
      carrierPartyIdsByShipment = resp.data.docs.reduce((carrierPartyIdsByShipment: any, shipment: any) => {
        if(carrierPartyIdsByShipment[shipment.shipmentId]) {
          carrierPartyIdsByShipment[shipment.shipmentId].push(shipment)
        } else {
          carrierPartyIdsByShipment[shipment.shipmentId] = [shipment]
        }
        return carrierPartyIdsByShipment
      }, {})
    } else {
      throw resp?.data
    }
  } catch(err) {
    logger.error('Failed to fetch carrierPartyIds for shipment', err)
  }

  return carrierPartyIdsByShipment;
}

const fetchCarrierShipmentBoxTypes = async(params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/shippingGateways/carrierShipmentBoxTypes",
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}

const findShipmentItemInformation = async(shipmentIds: Array<string>): Promise<any> => {
  let shipmentItemsInformation = {}
  const params = {
    "entityName": "ShipmentItemDetail",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in"
    },
    "fieldList": ["shipmentItemSeqId", "orderItemSeqId", "orderId", "shipmentId", "productId"],
    "viewSize": 250, // TODO: Need to fetch all data paginated
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if(resp?.status == 200 && !hasError(resp) && resp.data.count) {
      shipmentItemsInformation = resp.data.docs.reduce((shipmentItems: any, shipmentItem: any) => {
        if(shipmentItems[shipmentItem.orderId]) {
          shipmentItems[shipmentItem.orderId].push(shipmentItem)
        } else {
          shipmentItems[shipmentItem.orderId] = [shipmentItem]
        }
        return shipmentItems
      }, {})
    } else {
      throw resp?.data
    }
  } catch(err) {
    logger.error('Failed to fetch shipmentItem information', err)
  }

  return shipmentItemsInformation;
}

const fetchDefaultShipmentBox = async(query: any) : Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/systemProperties`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchRejectReasons = async(query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
  })
}

const createPicklist = async (query: any): Promise <any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  return api({
    url: 'createPicklist',
    method: 'POST',
    data: query,
    baseURL,
    headers: { "Content-Type": "multipart/form-data" },
  })
}

const fetchCarrierPartyIds = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query",
    method: "post",
    data: query
  });
}

const fetchPartyInformation = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchShipmentMethodTypeDesc = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/shippingGateways/shipmentMethodTypes`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchShipmentBoxTypeDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchFacilityTypeInformation = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchPaymentMethodTypeDesc = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/paymentMethodTypes`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchStatusDesc = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/statuses`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const findProductStoreShipmentMethCount = async (query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchRejectReasonEnumTypes = async (query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query,
    cache: true
  })
}

const createEnumeration = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const updateEnumeration = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums/${payload.enumId}`,
    method: "PUT",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const deleteEnumeration = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums/${payload.enumId}`,
    method: "DELETE",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
  });
}

const fetchEnumeration = async (query: any): Promise <any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enums`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
  });
}

const fetchProductStores = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/productStores`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchFacilities = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/facilities",
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchShipmentGatewayConfigs = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "POST",
    data: payload,
    cache: true
  })
}

const updateForceScanSetting = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/productStores/${params.productStoreId}/settings",
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createForceScanSetting = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/productStores/${params.productStoreId}/settings",
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateBarcodeIdentificationPref = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/productStores/${params.productStoreId}/settings",
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createBarcodeIdentificationPref = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/productStores/${params.productStoreId}/settings",
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const getProductStoreSetting = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "/oms/productStores/${params.productStoreId}/settings",
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchGiftCardFulfillmentInfo = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/poorti/giftCardFulfillments`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const fetchFulfillmentRejectReasons = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const createEnumerationGroupMember = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const updateEnumerationGroupMember = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const isEnumExists = async (enumId: string): Promise<any> => {
  try {
    const resp = await api({
      url: 'performFind',
      method: 'POST',
      data: {
        entityName: "Enumeration",
        inputFields: {
          enumId
        },
        viewSize: 1,
        fieldList: ["enumId"],
        noConditionFind: 'Y'
      }
    }) as any

    if (!hasError(resp) && resp.data.docs.length) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

const fetchOrderPayment = async(payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  })
}

const fetchAdjustmentTypeDescription = async(payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  })
}

const fetchOrderShipGroupInfo = async(payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  })
}

export const UtilService = {
  createBarcodeIdentificationPref,
  createEnumerationGroupMember,
  createForceScanSetting,
  createPicklist,
  createEnumeration,
  fetchAdjustmentTypeDescription,
  fetchCarrierPartyIds,
  fetchDefaultShipmentBox,
  fetchEnumeration,
  fetchFacilities,
  fetchFacilityTypeInformation,
  fetchFulfillmentRejectReasons,
  fetchGiftCardFulfillmentInfo,
  fetchOrderShipGroupInfo,
  fetchPartyInformation,
  fetchPicklistInformation,
  fetchProductStores,
  fetchRejectReasonEnumTypes,
  fetchRejectReasons,
  fetchShipmentGatewayConfigs,
  fetchShipmentBoxTypeDesc,
  fetchShipmentMethods,
  fetchShipmentMethodTypeDesc,
  fetchPaymentMethodTypeDesc,
  fetchStatusDesc,
  findCarrierPartyIdsForShipment,
  fetchCarrierShipmentBoxTypes,
  fetchOrderPayment,
  findProductStoreShipmentMethCount,
  findShipmentIdsForOrders,
  findShipmentItemInformation,
  findShipmentPackages,
  findShipmentPackageContents,
  fetchTransferOrderFacets,
  getAvailablePickers,
  getProductStoreSetting,
  isEnumExists,
  deleteEnumeration,
  updateEnumeration,
  updateBarcodeIdentificationPref,
  updateEnumerationGroupMember,
  updateForceScanSetting
}