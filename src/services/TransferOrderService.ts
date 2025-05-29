import { api, hasError, client } from "@/adapter";
import logger from "@/logger";
import store from "@/store";
import { translate } from "@hotwax/dxp-components";
import { showToast } from "@/utils";
import { cogOutline } from "ionicons/icons";
import { ZebraPrinterService } from './ZebraPrinterService';

const fetchTransferOrders = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "oms/transferOrders/",
    method: "get",
    baseURL,
    params,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

const fetchTransferOrderDetail = async (orderId: string): Promise<any> => {
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

const fetchShippedTransferShipments = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "poorti/transferShipments",
    method: "get",
    baseURL,
    params,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
};

const fetchTransferShipmentDetails = async (params: Record<string, any>): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "poorti/transferShipments",
    method: "get",
    baseURL,
    params,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
};

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

const cancelTransferOrderShipment = async (shipmentId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `poorti/shipments/${shipmentId}`,
    method: "put",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: {
      "statusId": "SHIPMENT_CANCELLED"
    }
  });
};

const shipTransferOrderShipment = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `poorti/transferShipments/${payload.shipmentId}/ship`,
    method: "post",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
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

const createOutboundTransferShipment = async (query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await client({
    method: "post",
    url: "poorti/transferShipments",
    baseURL,
    data: query,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  })
};

const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string): Promise<any> => {
  try {
    const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
    const baseURL = store.getters['user/getMaargBaseUrl'];

    let pdfUrls = shippingLabelPdfUrls?.filter((pdfUrl: any) => pdfUrl);
    if (!pdfUrls || pdfUrls.length == 0) {
      let labelImageType = imageType || "PNG";

      if (!imageType && shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
        labelImageType = await store.dispatch("util/fetchLabelImageType", shipmentPackages[0].carrierPartyId);
      }

      const labelImages = [] as Array<string>
      if (labelImageType === "ZPLII") {
        shipmentPackages?.map((shipmentPackage: any) => {
          shipmentPackage.labelImage && labelImages.push(shipmentPackage.labelImage)
        })
        await ZebraPrinterService.printZplLabels(labelImages);
        return;
      }

      // Get packing slip from the server
      const resp: any = await client({
        method: "get",
        url: "ShippingLabel.pdf",
        params: {
          shipmentId: shipmentIds[0]
        },
        responseType: "blob",
        baseURL,
        headers: {
          "api_key": omsRedirectionInfo.token,
        }
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

const rejectOrderItems = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `poorti/transferOrders/${payload.orderId}/reject`,
    method: "post",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    data: payload
  });
};

export const TransferOrderService = {
  cancelTransferOrderShipment,
  createOutboundTransferShipment,
  fetchTransferOrders,
  fetchRejectReasons,
  fetchFulfillmentRejectReasons,
  fetchTransferOrderDetail,
  printTransferOrderPicklist,
  fetchShippedTransferShipments,
  fetchTransferShipmentDetails,
  printShippingLabel,
  retryShippingLabel,
  shipTransferOrderShipment,
  rejectOrderItems
};
