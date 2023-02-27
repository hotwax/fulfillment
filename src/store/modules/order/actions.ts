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
  async fetchOpenOrders ({ commit }, payload) {
    emitter.emit('presentLoader');
    let resp;

    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      queryFields: 'orderId',
      filters: {
        quantityNotAvailable: { value: 0 },
        isPicked: { value: 'N' },
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        '-fulfillmentStatus': { value: 'Cancelled' },
        orderStatusId: { value: 'ORDER_APPROVED' },
        orderTypeId: { value: 'SALES_ORDER' },
        facilityId: { value: this.state.user.currentFacility.facilityId },
        ...payload.filters
      }
    })

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
  }
}

export default actions;