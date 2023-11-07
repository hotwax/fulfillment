import { api, hasError } from '@/adapter';
import logger from '@/logger';
import { showToast } from '@/utils';
import { translate } from '@hotwax/dxp-components';
import { cogOutline } from 'ionicons/icons';

const fetchTransferShipments = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: payload
  });
}

const getShipmentDetail= async (payload: any): Promise<any> => {
  return api({
    url: "shipment-detail",
    data: payload,
    method: 'post'
  });
}

const fetchShipmentMethodAndCarriers = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: payload
  });
}

const printPackingSlip = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: payload
  });
}

const shipTransferShipment = async (payload: any): Promise<any> => {
  //TODO: Need to confirm the service that will mark the transfer shipment as shipped. 
  //The updateShipment service is currently used to mark sales shipment as shipped.
  return api({
    url: "updateShipment",
    method: "post",
    data: payload
  });
}

const printShippingLabel = async (shipmentId: any): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'ShippingLabel.pdf',
      params: {
        shipmentId
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
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'shipping label'}), { icon: cogOutline });
    }

  } catch (err) {
    showToast(translate('Failed to print shipping label'))
    logger.error("Failed to load shipping label", err)
  }
}

export const TransferShipmentService = {
    fetchTransferShipments,
    getShipmentDetail,
    fetchShipmentMethodAndCarriers,
    shipTransferShipment,
    printPackingSlip,
    printShippingLabel
}
  
