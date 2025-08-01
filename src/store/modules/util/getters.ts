import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UtilState, RootState> = {
  getRejectReasons(state) {
    return state.rejectReasons ? state.rejectReasons : []
  },
  getPartyName: (state) => (partyId: string) => {
    return state.partyNames[partyId] ? state.partyNames[partyId] : partyId
  },
  getShipmentMethodDesc: (state) => (shipmentMethodId: string) => {
    return state.shipmentMethodTypeDesc[shipmentMethodId] ? state.shipmentMethodTypeDesc[shipmentMethodId] : shipmentMethodId
  },
  getShipmentBoxDesc: (state) => (shipmentBoxId: string) => {
    return state.shipmentBoxTypeDesc[shipmentBoxId] ? state.shipmentBoxTypeDesc[shipmentBoxId] : shipmentBoxId
  },
  getFacilityTypeDesc: (state) => (facilityTypeId: string) => {
    return state.facilityTypeDesc[facilityTypeId] ? state.facilityTypeDesc[facilityTypeId] : ''
  },
  getPaymentMethodDesc: (state) => (paymentMethodTypeId: string) => {
    return state.paymentMethodTypeDesc[paymentMethodTypeId] ? state.paymentMethodTypeDesc[paymentMethodTypeId] : paymentMethodTypeId
  },
  getStatusDesc: (state) => (statusId: string) => {
    return state.statusDesc[statusId] ? state.statusDesc[statusId] : statusId
  },
  getProductStoreShipmentMethCount(state) {
    return state.productStoreShipmentMethCount
  },
  getRejectReasonEnumTypes(state) {
    return state.rejectReasonEnumTypes
  },
  getEnumerations(state) {
    return state.enumerations
  },
  getEnumerationDesc: (state) => (enumId: string) => {
    return state.enumerations[enumId] ? state.enumerations[enumId] :  enumId
  },
  getProductStores(state) {
    return state.productStores;
  },
  getFacilities(state) {
    return state.facilities
  },
  isForceScanEnabled(state) {
    // return state.isForceScanEnabled //previously stored from individual state
    return state.productStoreSettings.FULFILL_FORCE_SCAN ?? false
  },
  getFulfillmentRejectReasons(state) {
    return state.fulfillmentRejectReasons
  },
  getRejectReasonOptions(state) {
    return state.rejectReasonOptions
  },
  getBarcodeIdentificationPref(state) {
    // return state.barcodeIdentificationPref //previously stored from individual state
    return state.productStoreSettings.BARCODE_IDEN_PREF
  },
  getCarrierShipmentBoxTypes(state) {
    return state.carrierShipmentBoxTypes
  },
  getCarrierDesc: (state) => (partyId: string) => {
    return state.carrierDesc[partyId] ? state.carrierDesc[partyId] : partyId
  },
  getShipmentMethodsByCarrier(state) {
    return state.shipmentMethodsByCarrier
  },
  isPicklistDownloadEnabled(state) {
    // return state.isPicklistDownloadEnabled
    return state.productStoreSettings.FF_DOWNLOAD_PICKLIST ?? false
  },
  getExcludeOrderBrokerDays(state) {
    // return state.excludeOrderBrokerDays 
    return state.productStoreSettings.EXCLUDE_ODR_BKR_DAYS ?? '0'
  },
  getPartialOrderRejectionConfig(state) {
    // return  state.partialOrderRejectionConfig;
    return state.productStoreSettings.FULFILL_PART_ODR_REJ ?? false
  },
  getCollateralRejectionConfig(state) {
    // return  state.collateralRejectionConfig;
    return state.productStoreSettings.FF_COLLATERAL_REJ ?? false
  },
  getAffectQohConfig(state) {
    // return  state.affectQohConfig;
    return state.productStoreSettings.AFFECT_QOH_ON_REJ ?? false
  },
  isShipNowDisabled(state) {
    // return state.isShipNowDisabled;
    return state.productStoreSettings.DISABLE_SHIPNOW ?? false
  },
  isUnpackDisabled(state) {
    // return state.isUnpackDisabled;
    return state.productStoreSettings.DISABLE_UNPACK ?? false
  },
  isReservationFacilityFieldEnabled(state) {
    // return state.isReservationFacilityFieldEnabled;
    return state.productStoreSettings.USE_RES_FACILITY_ID ?? false
  }
  // getProductStoreSetting: (state) => (settingTypeEnumId: string) => {
  //   return state.productStoreSettings[settingTypeEnumId] ?? null;
  // }
}
export default getters;