import { api } from '@common';
import { commonUtil } from "@common/utils/commonUtil";
import { useUtilStore } from "@/store/util";
import logger from '@common/core/logger';
import { translate } from "@common";
import { cogOutline } from 'ionicons/icons';
import { ZebraPrinterService } from './ZebraPrinterService';

const findOrder = async (payload: any): Promise<any> => {
  return api({
    url: "/solr-query",
    method: "post",
    data: payload,
    baseURL: commonUtil.getOmsURL()
  });
}

const fetchOrderDetail = async (orderId: string): Promise<any> => {
  return await api({
    url: `/poorti/orders/${orderId}`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
  });
}

const fetchCarrierTrackingUrls = async (payload: any): Promise<any> => {
  return await api({
    url: `/admin/systemProperties`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
    params: payload
  });
}

const fetchPartyInformation = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/parties`,
    method: "GET",
    params: payload
  });
}

const fetchOrderFacilityChange = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/orders/${payload.orderId}/facilityChange`,
    method: "GET",
    params: payload
  });
}

const fetchOrderItems = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/orders/${payload.orderId}/items`,
    method: "GET",
    params: payload
  });
}

const findShipments = async (orderId: string): Promise<any> => {
  const params = {
    orderId: orderId,
    pageSize: 100,
    customParametersMap: {
      statusId: ['SHIPMENT_INPUT', 'SHIPMENT_CANCELLED'],
      statusId_op: "in",
      statusId_not: "Y",
    },
    shipmentTypeId: 'SALES_SHIPMENT',
  } as any

  return await api({
    url: `/poorti/shipments`,
    method: "GET",
    params
  }) as any;
}

const fetchFacilities = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities`,
    method: "GET",
    params: payload
  });
}

const findOrderInvoicingInfo = async (payload: any): Promise<any> => {
  return api({
    url: "/oms/dataDocumentView",
    method: "post",
    data: payload,
  });
}

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
      const resp = await api({
        url: "/poorti/Label.pdf",
        method: "GET",
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
        commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'shipping label' }), { icon: cogOutline });
      }
    })

  } catch (err) {
    commonUtil.showToast(translate('Failed to print shipping label'))
    logger.error("Failed to load shipping label", err)
  }
}

export const OrderLookupService = {
  fetchCarrierTrackingUrls,
  fetchFacilities,
  findOrder,
  fetchOrderDetail,
  fetchOrderFacilityChange,
  fetchOrderItems,
  fetchPartyInformation,
  findOrderInvoicingInfo,
  findShipments,
  printShippingLabel
}
