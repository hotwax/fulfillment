import { api, hasError, client } from "@/adapter";
import logger from "@/logger";
import store from "@/store";
import { getCurrentFacilityId } from "@/utils";
import { translate } from "@hotwax/dxp-components";
import { showToast, formatPhoneNumber } from "@/utils";
import { cogOutline } from "ionicons/icons";
import { prepareSolrQuery } from "@/utils/solrHelper";

const fetchTransferOrderFacets = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
  });
};

const fetchTransferOrders = async (): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `oms/transferOrders/?orderStatusId=ORDER_APPROVED&originFacilityId=${getCurrentFacilityId()}`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

const fetchOrderDetailMoqui = async (orderId: string): Promise<any> => { // TODO: pass the order id
console.log("fetchOrderDetailMoqui for orderId", orderId);
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `/oms/transferOrders/${orderId}`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
};

const fetchShippedOrdersMoqui = async (orderId: string): Promise<any> => { // TODO: pass the order id

  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `poorti/transferShipments?orderId=${orderId}&shipmentStatusId=SHIPMENT_SHIPPED`, 
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
};

const printTransferOrderPicklist = async (orderId: string): Promise<any> => {

  try {

  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

    // Get packing slip from the server
    const resp: any = await client({
      method: "get",
      url: `poorti/transferOrders/${orderId}/printPicklist`,
      responseType: "blob",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
    }
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    } catch {
      showToast(
        translate("Unable to open as browser is blocking pop-ups.", {
          documentName: "picklist",
        }),
        { icon: cogOutline }
      );
    }
  } catch (err) {
    showToast(translate("Failed to print picklist"));
    logger.error("Failed to load picklist", err);
  }
};

const createOutboundTransferShipmentOrder = async (query: any): Promise<any> => { // TODO: pass the order id

 const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

    // Get packing slip from the server
    return await client({
      method: "post",
      url: "poorti/transferShipments",
    baseURL,
data:query,
    headers: {
      "api_key": omsRedirectionInfo.token,
    }
    })
};

const fetchShipmentItems = async (orderId: string, shipmentId: string): Promise<any> => {
  console.log("fetchShipmentItems for shipmentId", shipmentId);
  return client({
    url: `https://05ae2724-ed6c-4ca7-9bde-6f6c3ae2d241.mock.pstmn.io/transferShipments?shipmentId=${shipmentId}`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
    },
  });
};



const findTransferOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query,
  });
};

const printTransferOrder = async (orderId: string): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: "get",
      url: "TransferOrder.pdf",
      params: {
        orderId: orderId,
      },
      responseType: "blob",
    });

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    } catch {
      showToast(
        translate("Unable to open as browser is blocking pop-ups.", {
          documentName: "picklist",
        }),
        { icon: cogOutline }
      );
    }
  } catch (err) {
    showToast(translate("Failed to print picklist"));
    logger.error("Failed to load picklist", err);
  }
};

const updateShipment = async (payload: any): Promise<any> => {
  return api({
    url: "updateShipment",
    method: "POST",
    data: payload,
  });
};

const updateShipmentRouteSegment = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateShipmentRouteSegment",
    method: "POST",
    data: payload,
  });
};
const updateShipmentPackageRouteSeg = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateShipmentPackageRouteSeg",
    method: "POST",
    data: payload,
  });
};

const retryShippingLabel = async (
  shipmentIds: Array<string>,
  forceRateShop = false
): Promise<any> => {
  try {
    const resp = await api({
      method: "POST",
      url: "retryShippingLabel", // TODO: update the api
      data: {
        shipmentIds,
        forceRateShop: forceRateShop ? "Y" : "N",
        generateLabel: "Y", // This is needed to generate label after the new changes in backend related to auto generation of label.
      },
    });
    if (hasError(resp)) {
      throw resp?.data;
    }
  } catch (error) {
    logger.error(error);
  }
};

const rejectOrderItems = async (payload: any): Promise<any> => {
  return api({
    url: "rejectOrderItems",
    method: "post",
    data: payload,
  });
};

const printShippingLabel = async (
  shipmentIds: Array<string>,
  shippingLabelPdfUrls?: Array<string>
): Promise<any> => {
  try {
    let pdfUrls = shippingLabelPdfUrls?.filter((pdfUrl: any) => pdfUrl);
    if (!pdfUrls || pdfUrls.length == 0) {
      // Get packing slip from the server
      const resp: any = await api({
        method: "get",
        url: "ShippingLabel.pdf",
        params: {
          shipmentId: shipmentIds,
        },
        responseType: "blob",
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
      } catch {
        showToast(
          translate("Unable to open as browser is blocking pop-ups.", {
            documentName: "shipping label",
          }),
          { icon: cogOutline }
        );
      }
    });
  } catch (err) {
    showToast(translate("Failed to print shipping label"));
    logger.error("Failed to load shipping label", err);
  }
};

const fetchOrderHeader = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params,
  });
};

const fetchOrderItems = async (orderId: string): Promise<any> => {
  let viewIndex = 0;
  let orderItems = [] as any,
    resp;

  try {
    do {
      resp = (await api({
        url: "performFind",
        method: "get",
        params: {
          entityName: "OrderItemAndProduct",
          inputFields: {
            orderId: orderId,
          },
          fieldList: [
            "orderId",
            "orderItemSeqId",
            "statusId",
            "shipGroupSeqId",
            "productId",
            "productName",
            "internalName",
            "quantity",
          ],
          viewIndex: viewIndex,
          viewSize: 250, // maximum records we could have
          distinct: "Y",
          noConditionFind: "Y",
        },
      })) as any;

      if (!hasError(resp) && resp.data.count) {
        orderItems = orderItems.concat(resp.data.docs);
        viewIndex++;
      } else {
        throw resp.data;
      }
    } while (resp.data.docs.length >= 250);
  } catch (error) {
    logger.error(error);
  }
  return orderItems;
};

const fetchShippedQuantity = async (orderId: string): Promise<any> => {
  let docCount = 0;
  let shippedItemQuantitySum = [] as any;
  let viewIndex = 0;

  do {
    const params = {
      entityName: "ShippedItemQuantitySum",
      inputFields: {
        orderId: orderId,
      },
      fieldList: ["orderId", "orderItemSeqId", "productId", "shippedQuantity"],
      viewSize: 250, // maximum records we could have
      distinct: "Y",
      viewIndex,
    } as any;

    const resp = (await api({
      url: "performFind",
      method: "get",
      params,
    })) as any;

    if (!hasError(resp) && resp.data.count) {
      shippedItemQuantitySum = [...shippedItemQuantitySum, ...resp.data.docs];
      docCount = resp.data.docs.length;
      viewIndex++;
    } else {
      docCount = 0;
    }
  } while (docCount >= 250);

  return shippedItemQuantitySum;
};


const fetchShipmentPackages = async (
  shipmentIds: Array<string>,
  isTrackingRequired = false
): Promise<any> => {
  let shipmentPackages = [];
  let trackingCodeFilters = {};

  if (!isTrackingRequired) {
    trackingCodeFilters = {
      trackingCode_op: "empty",
      trackingCode_grp: "1",
      carrierServiceStatusId: "SHRSCS_VOIDED",
      carrierServiceStatusId_grp: "2",
    };
  }

  const params = {
    entityName: "ShipmentPackageRouteSegDetail",
    inputFields: {
      shipmentId: shipmentIds,
      shipmentId_op: "in",
      shipmentItemSeqId_op: "not-empty",
      ...trackingCodeFilters,
    },
    fieldList: [
      "shipmentId",
      "shipmentRouteSegmentId",
      "shipmentPackageSeqId",
      "shipmentBoxTypeId",
      "packageName",
      "primaryOrderId",
      "carrierPartyId",
      "isTrackingRequired",
      "primaryShipGroupSeqId",
      "labelImageUrl",
      "carrierServiceStatusId",
    ],
    viewSize: 250, // maximum records we could have
    distinct: "Y",
  };

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params,
    });

    if (!hasError(resp)) {
      shipmentPackages = resp?.data.docs;
      shipmentPackages.map((shipmentPackage: any) => {
        if (shipmentPackage.carrierServiceStatusId === "SHRSCS_VOIDED") {
          shipmentPackage.trackingCode = "";
          shipmentPackage.labelImageUrl = "";
          shipmentPackage.internationalInvoiceUrl = "";
        }
      });
    } else if (
      !resp?.data.error ||
      (resp.data.error && resp.data.error !== "No record found")
    ) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error("Failed to fetch shipment packages information", err);
  }

  return shipmentPackages;
};


const fetchShipmentCarrierDetail = async (
  shipmentIds: Array<string>
): Promise<any> => {
  let shipmentCarriers = [];
  const params = {
    entityName: "ShipmentRouteSegment",
    inputFields: {
      shipmentId: shipmentIds,
      shipmentId_op: "in",
    },
    fieldList: [
      "shipmentId",
      "carrierPartyId",
      "carrierServiceStatusId",
      "shipmentMethodTypeId",
      "trackingIdNumber",
    ],
    viewSize: 250, // maximum records we could have
    distinct: "Y",
  };

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params,
    });

    if (!hasError(resp)) {
      shipmentCarriers = resp?.data.docs;
    } else if (
      !resp?.data.error ||
      (resp.data.error && resp.data.error !== "No record found")
    ) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error("Failed to fetch carrier details for shipments", err);
  }

  return shipmentCarriers;
};

const fetchRejectReasons = async (query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get", // TODO: cache this api request
    params: query,
    cache: true,
  });
};

const fetchShipmentShippedStatusHistory = async (
  shipmentIds: Array<string>
): Promise<any> => {
  let shipmentStatuses = [];
  const params = {
    entityName: "ShipmentStatus",
    inputFields: {
      shipmentId: shipmentIds,
      shipmentId_op: "in",
      statusId: "SHIPMENT_SHIPPED",
    },
    fieldList: ["shipmentId", "statusId", "statusDate", "changeByUserLoginId"],
    viewSize: 250,
    distinct: "Y",
  };

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params,
    });

    if (!hasError(resp)) {
      shipmentStatuses = resp?.data.docs;
    } else if (
      !resp?.data.error ||
      (resp.data.error && resp.data.error !== "No record found")
    ) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error("Failed to fetch shipment status history for shipments", err);
  }

  return shipmentStatuses;
};

const addTrackingCode = async (payload: any): Promise<any> => {
  try {
    let resp = await updateShipmentPackageRouteSeg({
      shipmentId: payload.shipmentId,
      shipmentRouteSegmentId: payload.shipmentRouteSegmentId,
      shipmentPackageSeqId: payload.shipmentPackageSeqId,
      trackingCode: payload.trackingCode,
      labelImage: "",
      labelIntlSignImage: "",
      labelHtml: "",
      labelImageUrl: "",
      internationalInvoiceUrl: "",
    });
    if (!hasError(resp)) {
      resp = await updateShipmentRouteSegment({
        shipmentId: payload.shipmentId,
        shipmentRouteSegmentId: payload.shipmentRouteSegmentId,
        trackingIdNumber: payload.trackingCode,
        carrierServiceStatusId: "SHRSCS_ACCEPTED",
      });
      if (hasError(resp)) {
        throw resp.data;
      }
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to add tracking code", err);
  }
};

export const TransferOrderService = {
  addTrackingCode,
  createOutboundTransferShipmentOrder,
  fetchTransferOrderFacets,
  fetchOrderHeader,
  fetchTransferOrders,
  fetchOrderDetailMoqui,
  printTransferOrderPicklist,
  fetchOrderItems,
  fetchShippedOrdersMoqui,
  fetchShippedQuantity,
  fetchShipmentItems,
  fetchShipmentCarrierDetail,
  fetchShipmentPackages,
  fetchRejectReasons,
  fetchShipmentShippedStatusHistory,
  findTransferOrders,
  printTransferOrder,
  printShippingLabel,
  retryShippingLabel,
  rejectOrderItems,
  updateShipment,
  updateShipmentRouteSegment,
  updateShipmentPackageRouteSeg,
};
