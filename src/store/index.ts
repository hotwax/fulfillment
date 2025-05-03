import { createStore, useStore as useVuexStore } from "vuex"
import mutations  from './mutations'
import getters  from './getters'
import actions from './actions'
import RootState from './RootState'
import createPersistedState from "vuex-persistedstate";
import userModule from './modules/user';
import productModule from "./modules/product"
import orderModule from "./modules/order"
import transferOrderModule from "./modules/transferorder"
import utilModule from "./modules/util"
import stockModule from "./modules/stock"
import carrierModule from "./modules/carrier"
import { setPermissions } from '@/authorization'
import orderLookupModule from "./modules/orderLookup"
import rejectionModule from "./modules/rejection"


// TODO check how to register it from the components only
// Handle same module registering multiple time on page refresh
//store.registerModule('user', userModule);


const state: any = {

}

const persistState = createPersistedState({
    paths: ['user', 'util.productStoreShipmentMethCount', 'util.isForceScanEnabled', 'util.isForceScanEnabled', 'util.picklistItemIdentificationPref', 'util.isPicklistDownloadEnabled', 'util.barcodeIdentificationPref', 'util.carrierDesc', 'util.facilityAddresses', 'product.sampleProducts'],
    fetchBeforeUse: true
})

// Added modules here so that hydration takes place before routing
const store = createStore<RootState>({
    state,
    actions,
    mutations,
    getters,
    plugins: [ persistState ],
    modules: { 
        'user': userModule,
        'product': productModule,
        'order': orderModule,
        'orderLookup': orderLookupModule,
        'util': utilModule,
        'stock': stockModule,
        'transferorder': transferOrderModule,
        'carrier': carrierModule,
        'rejection': rejectionModule
    },
})

setPermissions(store.getters['user/getUserPermissions']);

export default store
export function useStore(): typeof store {
    return useVuexStore()
}