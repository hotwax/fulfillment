import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import emitter from '@/event-bus'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'


const actions: ActionTree<OrderState, RootState> = {

  // get in progress orders
  async getInProgressOrders ({ commit }, payload) {
    emitter.emit('presentLoader');
    let resp;

    try {
      resp = await OrderService.fetchInProgressOrders(payload);
      if (resp.status === 200 && !hasError(resp)) {
        console.log(resp);
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
    }

    emitter.emit('dismissLoader');
    return resp;
  }

}

export default actions;