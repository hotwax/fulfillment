import { api, commonUtil, logger, translate } from "@common";
import { useUtilStore } from "@/store/util";

import { cogOutline } from "ionicons/icons";
import { ZebraPrinterService } from './ZebraPrinterService';

const fetchTransferOrders = async (params: any): Promise<any> => {
  return api({
    url: "oms/transferOrders/",
    method: "get",
    params,
  });
}
const fetchCompletedTransferOrders = async (params: any): Promise<any> => {
  return api({
    url: "poorti/transferShipments/orders/",
    method: "get",
    params,
  });
}

const fetchTransferOrderDetail = async (orderId: string): Promise<any> => {
  return api({
    url: `/oms/transferOrders/${orderId}`,
    method: "get",
  });
}

const fetchShippedTransferShipments = async (params: any): Promise<any> => {
  return api({
    url: "poorti/transferShipments",
    method: "get",
    params,
  });
};

const fetchTransferShipmentDetails = async (params: Record<string, any>): Promise<any> => {
  return api({
    url: "poorti/transferShipments",
    method: "get",
    params,
  });
};

const fetchRejectReasons = async (query: any): Promise<any> => {
  return api({
    url: `/admin/enums`,
    method: "GET",
    params: query,
  });
}

const fetchFulfillmentRejectReasons = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "GET",
    params: payload,
  });
}

const cancelTransferOrderShipment = async (shipmentId: string): Promise<any> => {
  return api({
    url: `poorti/shipments/${shipmentId}`,
    method: "put",
    data: {
      "statusId": "SHIPMENT_CANCELLED"
    }
  });
};

const shipTransferOrderShipment = async (payload: any): Promise<any> => {
  return await api({
    url: `poorti/transferShipments/${payload.shipmentId}/ship`,
    method: "post",
    data: payload
  });
};

const printTransferOrderPicklist = async (orderId: string): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: "get",
      url: `poorti/transferOrders/${orderId}/printPicklist`,
      responseType: "blob",
    })

    if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    } catch {
      commonUtil.showToast(
        translate("Unable to open as browser is blocking pop-ups.", {
          documentName: "picklist",
        }),
        { icon: cogOutline }
      );
    }
  } catch (err) {
    commonUtil.showToast(translate("Failed to print picklist"));
    logger.error("Failed to load picklist", err);
  }
};

const createOutboundTransferShipment = async (query: any): Promise<any> => {
  return await api({
    method: "post",
    url: "poorti/transferShipments",
    data: query,
  })
};

const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string): Promise<any> => {
  try {
    let pdfUrls = shippingLabelPdfUrls?.filter((pdfUrl: any) => pdfUrl);
    if (!pdfUrls || pdfUrls.length == 0) {
      let labelImageType = imageType || "PNG";

      if (!imageType && shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
        labelImageType = await useUtilStore().fetchLabelImageType(shipmentPackages[0].carrierPartyId);
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
      const resp: any = await api({
        method: "get",
        url: "/fop/apps/pdf/PrintLabel",
        params: {
          shipmentId: shipmentIds[0]
        },
        responseType: "blob",
        baseURL: getMaargBaseURL(),
      });

      if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
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
        commonUtil.showToast(
          translate("Unable to open as browser is blocking pop-ups.", {
            documentName: "shipping label",
          }),
          { icon: cogOutline }
        );
      }
    });
  } catch (err) {
    commonUtil.showToast(translate("Failed to print shipping label"));
    logger.error("Failed to load shipping label", err);
  }
};

const rejectOrderItems = async (payload: any): Promise<any> => {
  return api({
    url: `poorti/transferOrders/${payload.orderId}/reject`,
    method: "post",
    data: payload
  });
};

const closeOrderItems = async (payload: any): Promise<any> => {
  return api({
    url: `poorti/transferOrders/${payload.orderId}/closeFulfillment`,
    method: "post",
    data: payload
  });
};

const createTransferOrder = async (payload: any): Promise<any> => {
  return await api({
    url: 'oms/transferOrders',
    method: "post",
    data: payload
  });
};

const approveTransferOrder = async (orderId: any): Promise<any> => {
  return api({
    url: `oms/transferOrders/${orderId}/approve`,
    method: "post",
  });
};

const addOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: 'oms/transferOrders/orderItem',
    method: "POST",
    data: payload
  });
}

const updateOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: 'oms/transferOrders/orderItem',
    method: "PUT",
    data: payload
  });
}

const cancelTransferOrder = async (orderId: string): Promise<any> => {
  return api({
    url: `oms/transferOrders/${orderId}/cancel`,
    method: "post",
  });
}


export const TransferOrderService = {
  addOrderItem,
  cancelTransferOrder,
  cancelTransferOrderShipment,
  createOutboundTransferShipment,
  fetchCompletedTransferOrders,
  fetchTransferOrders,
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
