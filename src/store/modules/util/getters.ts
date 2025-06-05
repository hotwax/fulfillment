import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UtilState, RootState> = {
  getRejectReasons(state) {
    return state.rejectReasons ? state.rejectReasons : []
  },
  getPartyName: (state) => (partyId: string) => {
    return state.partyNames[partyId] ? state.partyNames[partyId] : ''
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
  getProductStores(state) {
    return state.productStores;
  },
  getFacilities(state) {
    return state.facilities
  },
  getShipmentGatewayConfigs(state) {
    return state.shipmentGatewayConfigs
  },
  isForceScanEnabled(state) {
    return state.isForceScanEnabled
  },
  getFulfillmentRejectReasons(state) {
    return state.fulfillmentRejectReasons
  },
  getRejectReasonOptions(state) {
    return state.rejectReasonOptions
  },
  getBarcodeIdentificationPref(state) {
    return state.barcodeIdentificationPref
  },
  getShipmentBoxUomConversions(state) {
    return state.boxUomConversions
  },
  getCarrierDesc: (state) => (partyId: string) => {
    return state.carrierDesc[partyId] ? state.carrierDesc[partyId] : partyId
  },
  getShipmentMethodsByCarrier(state) {
    return state.shipmentMethodsByCarrier
  },
  getPicklistItemIdentificationPref(state) {
    return state.picklistItemIdentificationPref
  },
  isPicklistDownloadEnabled(state) {
    return state.isPicklistDownloadEnabled
  }
}
export default getters;