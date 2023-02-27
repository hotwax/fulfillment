import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import emitter from '@/event-bus'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import * as types from './mutation-types'
import { prepareOrderQuery } from '@/utils/solrHelper'


const actions: ActionTree<OrderState, RootState> = {

  // get open orders
  async fetchOpenOrders ({ commit, state }, payload) {
    emitter.emit('presentLoader');
    let resp;

    const params = {
      ...payload,
      viewSize: this.state.picklist.size,
      queryFields: 'orderId',
      filters: {
        quantityNotAvailable: { value: 0 },
        isPicked: { value: 'N' },
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        '-fulfillmentStatus': { value: 'Cancelled' },
        orderStatusId: { value: 'ORDER_APPROVED' },
        orderTypeId: { value: 'SALES_ORDER' },
        facilityId: { value: this.state.user.currentFacility.facilityId },
      }
    }

    // only adding shipmentMethods when a method is selected
    if(state.selectedShipmentMethods.length) {
      params.filters['shipmentMethodTypeId'] = { value: state.selectedShipmentMethods, op: 'OR' }
    }

    const orderQueryPayload = prepareOrderQuery(params)

    try {
      resp = await OrderService.fetchOpenOrders(orderQueryPayload);
      if (resp.status === 200 && resp.data.grouped.orderId.matches > 0 && !hasError(resp)) {
        const total = resp.data.grouped.orderId.ngroups
        commit(types.ORDER_OPEN_UPDATED, {open: resp.data.grouped.orderId.groups, total})
        this.dispatch('product/getProductInformation', {orders: resp.data.grouped.orderId.groups})
      } else {
        console.error('No orders found')
      }
    } catch (err) {
      console.error('error', err)
      showToast(translate('Something went wrong'))
    }

    emitter.emit('dismissLoader');
    return resp;
  },

  async clearOrders ({ commit }) {
    commit(types.ORDER_OPEN_UPDATED, {open: {}, total: 0})
  },

  updateSelectedShipmentMethods({ commit, dispatch, state }, method) {
    const selectedShipmentMethods = JSON.parse(JSON.stringify(state.selectedShipmentMethods))
    const index = selectedShipmentMethods.indexOf(method)
    if (index < 0) {
      selectedShipmentMethods.push(method)
    } else {
      selectedShipmentMethods.splice(index, 1)
    }
    console.log('updated selected shipment methods')
    commit(types.ORDER_SELECTED_SHIPMENT_METHODS_UPDATED, selectedShipmentMethods)
    dispatch('fetchOpenOrders');
  }
}

export default actions;