export default interface TransferShipmentState {  
  currentShipment: any,  
  shipments: {
    list: any,
    total: number,
    query: {
      viewIndex: number,
      viewSize: any,
      queryString: string,
      selectedCarrierPartyIds: Array<string>,
      selectedShipmentMethodTypeIds: Array<string>
    }
  }      
}
    