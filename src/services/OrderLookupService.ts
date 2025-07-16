import { api, apiClient, hasError } from "@/adapter"
import store from '@/store';
import logger from '@/logger';
import { showToast } from '@/utils';
import { translate } from '@hotwax/dxp-components'
import { cogOutline } from 'ionicons/icons';
import { ZebraPrinterService } from './ZebraPrinterService';

const findOrder = async (payload: any): Promise<any> => {
  return api({
    url: "/solr-query",
    method: "post",
    data: payload
  });
}

const fetchOrderDetail = async (orderId: string): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await apiClient({
    url: `/oms/orders/${orderId}`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
  });
}

const fetchCarrierTrackingUrls = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return await apiClient({
    url: `/admin/systemProperties`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchPartyInformation = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/parties`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchOrderFacilityChange = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/orders/${payload.orderId}/facilityChange`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchOrderItems = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/orders/${payload.orderId}/items`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const findShipments = async (orderId: string): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  const params = {
    orderId: orderId,
    statusId: ['SHIPMENT_INPUT', 'SHIPMENT_CANCELLED'],
    statusId_op: "in",
    statusId_not: "Y",
    pageSize: 100,
    shipmentTypeId: 'SALES_SHIPMENT', 
  } as any

  return await apiClient({
    url: `/poorti/shipments`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  }) as any;
}

const fetchFacilities = async (payload: any): Promise <any>  => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: `/oms/facilities`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const findOrderInvoicingInfo = async (payload: any): Promise<any> => {
  const omstoken = store.getters['user/getUserToken'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return apiClient({
    url: "/oms/dataDocumentView",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload,
  });
}

const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string): Promise<any> => {
  try {
    const baseURL = store.getters['user/getMaargBaseUrl'];
    const omstoken = store.getters['user/getUserToken'];

    let pdfUrls = shippingLabelPdfUrls?.filter((pdfUrl: any) => pdfUrl);
    if (!pdfUrls || pdfUrls.length == 0) {
      let labelImageType = imageType || "PNG";

      if(!imageType && shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
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
      const resp = await apiClient({
        url: "/poorti/Label.pdf",
        method: "GET",
        baseURL,
        headers: {
          "Authorization": "Bearer " + omstoken,
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