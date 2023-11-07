import { api } from '@/adapter';

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

const shipTransferShipment = async (payload: any): Promise<any> => {
  //TODO: Need to confirm the service that will mark the transfer shipment as shipped. 
  //The updateShipment service is currently used to mark sales shipment as shipped.
  return api({
    url: "updateShipment",
    method: "post",
    data: payload
  });
}

export const TransferShipmentService = {
    fetchTransferShipments,
    getShipmentDetail,
    fetchShipmentMethodAndCarriers,
    shipTransferShipment
}
  
