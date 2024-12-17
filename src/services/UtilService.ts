import { api, hasError } from '@/adapter';
import logger from '@/logger';
import store from '@/store';
import { isPdf, getCurrentFacilityId } from '@/utils';

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
        if (shipmentPackage.labelImageUrl && isPdf(shipmentPackage.labelImageUrl)) {
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

const findCarrierShipmentBoxType = async(carrierPartyIds: Array<string>): Promise<any> => {
  let shipmentBoxType = {}
  const params = {
    "entityName": "CarrierShipmentBoxType",
    "inputFields": {
      "partyId": carrierPartyIds,
      "partyId_op": "in"
    },
    "fieldList": ["shipmentBoxTypeId", "partyId"],
    "viewSize": carrierPartyIds.length * 10,  // considering that one carrierPartyId will have maximum of 10 box type
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params,
      cache: true
    })

    if(resp?.status == 200 && !hasError(resp) && resp.data.count) {
      shipmentBoxType = resp.data.docs.reduce((shipmentBoxTypes: any, boxType: any) => {
        if(shipmentBoxTypes[boxType.partyId]) {
          shipmentBoxTypes[boxType.partyId].push(boxType.shipmentBoxTypeId)
        } else {
          shipmentBoxTypes[boxType.partyId] = [boxType.shipmentBoxTypeId]
        }
        return shipmentBoxTypes
      }, {})
    } else {
      throw resp?.data
    }
  } catch(err) {
    logger.error('Failed to fetch carrier shipment box type information', err)
  }

  return shipmentBoxType;
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

const fetchShipmentRouteSegmentInformation = async(query: any) : Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  })
}

const fetchDefaultShipmentBox = async(query: any) : Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query,
    cache: true
  })
}

const fetchRejectReasons = async(query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get", // TODO: cache this api request
    params: query,
    cache: true
  })
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

const fetchShipmentMethodTypeDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchShipmentBoxTypeDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const resetPicker = async (payload: any): Promise<any> => {
  return api({
    url: "/service/resetPicker",
    method: "post",
    data: payload
  })
}

const fetchFacilityTypeInformation = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchPaymentMethodTypeDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchStatusDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
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
  return api({
    url: "/service/createEnumeration",
    method: "post",
    data: payload
  })
}

const updateEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: "/service/updateEnumeration",
    method: "post",
    data: payload
  })
}

const deleteEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: "/service/deleteEnumeration",
    method: "post",
    data: payload
  })
}

const fetchEnumeration = async (query: any): Promise <any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query,
    cache: true
  })
}

const fetchFacilities = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "POST",
    data: payload,
    cache: true
  })
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
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload
  });
}

const createForceScanSetting = async (payload: any): Promise<any> => {
  return api({
    url: "service/createProductStoreSetting",
    method: "post",
    data: payload
  });
}

const updateBarcodeIdentificationPref = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload
  });
}

const createBarcodeIdentificationPref = async (payload: any): Promise<any> => {
  return api({
    url: "service/createProductStoreSetting",
    method: "post",
    data: payload
  });
}

const getProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const fetchGiftCardItemPriceInfo = async (payload: any): Promise<any> => {
  // Todo: find a better alternative for fetching unitPrice and currency together
  let resp = {} as any;
  const itemPriceInfo = {} as any;

  const params = {
    inputFields: {
      orderId: payload.orderId,
      orderItemSeqId: payload.orderItemSeqId
    },
    entityName: "OrderItem",
    fieldList: ["unitPrice"],
    viewSize: 1
  }

  try {
    resp = await api({
      url: "performFind",
      method: "post",
      data: params
    });

    if(!hasError(resp)) {
      itemPriceInfo.unitPrice = resp.data.docs[0].unitPrice

      resp = await api({
        url: "performFind",
        method: "post",
        data: {
          inputFields: {
            orderId: payload.orderId,
            orderItemSeqId: payload.orderItemSeqId
          },
          entityName: "OrderHeader",
          fieldList: ["currencyUom"],
          viewSize: 1
        }
      });

      if(!hasError(resp)) {
        itemPriceInfo.currencyUom = resp.data.docs[0].currencyUom
      } else {
        throw resp.data;
      }
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error);
  }

  return itemPriceInfo;
}

const fetchGiftCardFulfillmentInfo = async (payload: any): Promise<any> => {
  return await api({
    url: 'performFind',
    method: 'POST',
    data: payload
  }) as any
}

const activateGiftCard = async (payload: any): Promise<any> => {
  return api({
    url: "service/createGcFulFillmentRecord",
    method: "post",
    data: payload
  });
}

const fetchFulfillmentRejectReasons = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const createEnumerationGroupMember = async (payload: any): Promise<any> => {
  return api({
    url: "service/createEnumerationGroupMember",
    method: "post",
    data: payload
  });
}

const updateEnumerationGroupMember = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateEnumerationGroupMember",
    method: "post",
    data: payload
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

export const UtilService = {
  activateGiftCard,
  createBarcodeIdentificationPref,
  createEnumerationGroupMember,
  createForceScanSetting,
  createPicklist,
  createEnumeration,
  fetchCarrierPartyIds,
  fetchDefaultShipmentBox,
  fetchEnumeration,
  fetchFacilities,
  fetchFacilityTypeInformation,
  fetchFulfillmentRejectReasons,
  fetchGiftCardFulfillmentInfo,
  fetchGiftCardItemPriceInfo,
  fetchPartyInformation,
  fetchPicklistInformation,
  fetchRejectReasonEnumTypes,
  fetchRejectReasons,
  fetchShipmentGatewayConfigs,
  fetchShipmentBoxTypeDesc,
  fetchShipmentMethods,
  fetchShipmentMethodTypeDesc,
  fetchPaymentMethodTypeDesc,
  fetchStatusDesc,
  fetchShipmentRouteSegmentInformation,
  findCarrierPartyIdsForShipment,
  findCarrierShipmentBoxType,
  findProductStoreShipmentMethCount,
  findShipmentIdsForOrders,
  findShipmentItemInformation,
  findShipmentPackages,
  findShipmentPackageContents,
  fetchTransferOrderFacets,
  getAvailablePickers,
  getProductStoreSetting,
  isEnumExists,
  resetPicker,
  deleteEnumeration,
  updateEnumeration,
  updateBarcodeIdentificationPref,
  updateEnumerationGroupMember,
  updateForceScanSetting
}