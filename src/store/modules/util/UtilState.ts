export default interface UtilState {
  rejectReasons: [];
  partyNames: any;
  shipmentMethodTypeDesc: any;
  shipmentBoxTypeDesc: any;
  facilityTypeDesc: any;
  paymentMethodTypeDesc: any;
  statusDesc: any;
  productStoreShipmentMethCount: number;
  rejectReasonEnumTypes: [];
  enumerations: any;
  productStores: any;
  facilities: any;
  isForceScanEnabled: boolean;
  fulfillmentRejectReasons: any;
  rejectReasonOptions: any;
  barcodeIdentificationPref: string;
  carrierShipmentBoxTypes: {};
  carrierDesc: any;
  shipmentMethodsByCarrier: any;
  facilityAddresses: any;
  facilityShippingLabelImageType: any;
  isPicklistDownloadEnabled: boolean;
  excludeOrderBrokerDays: any;
  partialOrderRejectionConfig: any;
  collateralRejectionConfig: any;
  affectQohConfig: any;
  isShipNowDisabled: boolean;
  isUnpackDisabled: boolean;
  isReservationFacilityFieldEnabled:boolean;
  productStoreSettings: Record<string, any>;
  isAutoShippingLabelEnabled: boolean;

}