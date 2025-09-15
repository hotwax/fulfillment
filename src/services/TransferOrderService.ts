import { apiClient, hasError } from "@/adapter";
import logger from "@/logger";
import store from "@/store";
import { translate } from "@hotwax/dxp-components";
import { showToast } from "@/utils";
import { cogOutline } from "ionicons/icons";
import { ZebraPrinterService } from './ZebraPrinterService';

const fetchTransferOrders = async (params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: "oms/transferOrders/",
    method: "get",
    baseURL,
    params,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
}
const fetchCompletedTransferOrders = async (params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: "poorti/transferShipments/orders/",
    method: "get",
    baseURL,
    params,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
}

const fetchTransferOrderDetail = async (orderId: string): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/transferOrders/${orderId}/shipgroups`,
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
}

const findTransferOrderItems = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `oms/transferOrders/items`,
    method: "GET",
    params: payload,
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
}

const fetchShippedTransferShipments = async (params: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: "poorti/transferShipments",
    method: "get",
    baseURL,
    params,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
};

const fetchTransferShipmentDetails = async (params: Record<string, any>): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: "poorti/transferShipments",
    method: "get",
    baseURL,
    params,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
};

const fetchRejectReasons = async(query: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enums`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

const fetchFulfillmentRejectReasons = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const cancelTransferOrderShipment = async (shipmentId: string): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `poorti/shipments/${shipmentId}`,
    method: "put",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: {
      "statusId": "SHIPMENT_CANCELLED"
    }
  });
};

const shipTransferOrderShipment = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `poorti/transferShipments/${payload.shipmentId}/ship`,
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
};

const printTransferOrderPicklist = async (orderId: string): Promise<any> => {
  try {
    const omstoken = store.getters['user/getUserToken'];
    const baseURL = store.getters['user/getMaargBaseUrl'];

    // Get packing slip from the server
    const resp: any = await apiClient({
      method: "get",
      url: `poorti/transferOrders/${orderId}/printPicklist`,
      responseType: "blob",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
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
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await apiClient({
    method: "post",
    url: "poorti/transferShipments",
    baseURL,
    data: query,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  })
};

const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string): Promise<any> => {
  try {
    const maargUrl = store.getters['user/getMaargUrl'];
    const omstoken = store.getters['user/getUserToken'];

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
      const resp: any = await apiClient({
        method: "get",
        url: "/fop/apps/pdf/PrintLabel",
        params: {
          shipmentId: shipmentIds[0]
        },
        responseType: "blob",
        baseURL: maargUrl,
        headers: {
          "Authorization": "Bearer " + omstoken,
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

const rejectOrderItems = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `poorti/transferOrders/${payload.orderId}/reject`,
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
};

const closeOrderItems = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `poorti/transferOrders/${payload.orderId}/closeFulfillment`,
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
};

const createTransferOrder = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await apiClient({
    url: 'oms/transferOrders',
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
};

const approveTransferOrder = async (orderId: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `oms/transferOrders/${orderId}/approve`,
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
};

const addProductToOrder = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: 'oms/transferOrders/orderItem',
    method: "POST",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateOrderItem = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: 'oms/transferOrders/orderItem',
    method: "PUT",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const cancelTransferOrder = async (orderId: string): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `oms/transferOrders/${orderId}/cancel`,
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    }
  });
}


export const TransferOrderService = {
  addProductToOrder,
  cancelTransferOrder,
  cancelTransferOrderShipment,
  createOutboundTransferShipment,
  fetchCompletedTransferOrders,
  fetchTransferOrders,
  findTransferOrderItems,
  fetchRejectReasons,
  fetchFulfillmentRejectReasons,
  fetchTransferOrderDetail,
  printTransferOrderPicklist,
  fetchShippedTransferShipments,
  fetchTransferShipmentDetails,
  printShippingLabel,
  shipTransferOrderShipment,
  rejectOrderItems,
  closeOrderItems,
  createTransferOrder,
  approveTransferOrder,
  updateOrderItem
};
