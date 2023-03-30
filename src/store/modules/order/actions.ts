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
  async findOpenOrders ({ commit, dispatch, state }, payload = {}) {
    emitter.emit('presentLoader');
    let resp;

    const openOrderQuery = JSON.parse(JSON.stringify(state.open.query))

    const params = {
      ...payload,
      queryString: openOrderQuery.queryString,
      viewSize: openOrderQuery.viewSize,
      queryFields: 'orderId',
      filters: {
        quantityNotAvailable: { value: 0 },
        isPicked: { value: 'N' },
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        '-fulfillmentStatus': { value: 'Cancelled' },
        orderStatusId: { value: 'ORDER_APPROVED' },
        orderTypeId: { value: 'SALES_ORDER' },
        facilityId: { value: this.state.user.currentFacility.facilityId },
        productStoreId: { value: this.state.user.currentEComStore.productStoreId }
      }
    }

    // only adding shipmentMethods when a method is selected
    if(openOrderQuery.selectedShipmentMethods.length) {
      params.filters['shipmentMethodTypeId'] = { value: openOrderQuery.selectedShipmentMethods, op: 'OR' }
    }

    const orderQueryPayload = prepareOrderQuery(params)
    let orders = [];
    let total = 0;

    try {
      resp = await OrderService.findOpenOrders(orderQueryPayload);
      if (resp.status === 200 && resp.data.grouped.orderId.matches > 0 && !hasError(resp)) {
        total = resp.data.grouped.orderId.ngroups
        orders = resp.data.grouped.orderId.groups
        this.dispatch('product/getProductInformation', { orders })
      } else {
        console.error('No orders found')
      }
    } catch (err) {
      console.error('error', err)
      showToast(translate('Something went wrong'))
    }

    openOrderQuery.viewSize = orders.length

    commit(types.ORDER_OPEN_QUERY_UPDATED, { ...openOrderQuery })
    commit(types.ORDER_OPEN_UPDATED, {list: orders, total})

    emitter.emit('dismissLoader');
    return resp;
  },

  async clearOrders ({ commit }) {
    commit(types.ORDER_OPEN_CLEARED, {
      list: {},
      total: 0,
      query: {
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        selectedShipmentMethods: []
      }
    })
  },

  async updateOpenQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
    await dispatch('findOpenOrders');
  }
}

export default actions;