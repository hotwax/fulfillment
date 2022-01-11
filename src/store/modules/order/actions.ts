import { OrderService } from '@/services/OrderService';
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'

const actions: ActionTree <OrderState, RootState> = {
  async getCompletedOrders ({ commit }, payload) {
    let resp;
    try{
      resp = await OrderService.fetchCompletedOrders( payload );
      if (resp.status === 200 && resp.data?.grouped.orderId.groups.length > 0 && !hasError(resp)) {
        const orders = resp.data.grouped.orderId.groups
        this.dispatch('product/getProductInformations', { orders })
        commit(types.ORDER_COMPLETED_UPDATED, {orders})
      } else {
        showToast(translate("Orders not found"))
      }
    } catch(error) {
      showToast(translate("Something went wrong"));
    }
    return resp;
  }
}

export default actions;