export default interface TransferOrderState {
    carrier: {
      list: any,
      total: number,
    },
    current: any,
    shipmentMethodQuery: any,
    shipmentMethods: any,
    carrierShipmentMethodsByProductStore: any
    facilityCarriers: any,
    productStoreShipmentMethods: any;
    shipmentBoxes: any;
  }