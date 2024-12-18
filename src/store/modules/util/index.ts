import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'

const utilModule: Module<UtilState, RootState> = {
  namespaced: true,
  state: {
    rejectReasons: [],
    partyNames: {},
    shipmentMethodTypeDesc: {},
    shipmentBoxTypeDesc: {},
    facilityTypeDesc: {},
    paymentMethodTypeDesc: {},
    statusDesc: {},
    productStoreShipmentMethCount: 0,
    rejectReasonEnumTypes: [],
    enumerations: {},
    facilities: [],
    productStores: [],
    shipmentGatewayConfigs: [],
    isForceScanEnabled: false,
    fulfillmentRejectReasons: {},
    rejectReasonOptions: [],
    barcodeIdentificationPref: "internalName"
  },
  getters,
  actions,
  mutations,
}

// TODO
// store.registerModule('user', userModule);
export default utilModule;