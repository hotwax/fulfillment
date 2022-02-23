import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import emitter from '@/event-bus'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import * as types from './mutation-types'


const actions: ActionTree<OrderState, RootState> = {

  // get in progress orders
  async fetchInProgressOrders ({ commit, state, dispatch }, payload) {
    emitter.emit('presentLoader');
    let resp;

    try {
      resp = await OrderService.fetchInProgressOrders(payload);
      if (resp.status === 200 && resp.data.grouped.orderId.matches > 0 && !hasError(resp)) {
        let orders = resp.data.grouped.orderId.groups;

        if (payload.json.params.start && payload.json.params.start > 0) orders = state.inProgress.list.inProgress.concat(orders)

        commit(types.ORDER_IN_PROGRESS_UPDATED, {inProgress: orders, total: resp.data.grouped.orderId.ngroups, items: resp.data.grouped.orderId.matches })
        this.dispatch('product/getProductInformation', { orders })
        dispatch('getShipmentBoxInformation', { orders })
      } else {
        commit(types.ORDER_IN_PROGRESS_UPDATED, {inProgress: {}, total: 0, items: 0 })
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
    }
    emitter.emit('dismissLoader');
    return resp;
  },

  async packOrder ({ commit }, payload) {
    emitter.emit('presentLoader');
    let resp;

    try {
      resp = await OrderService.packOrder(payload);
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate(resp.data.successMessage));
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
    }
    emitter.emit('dismissLoader');
    return resp;
  },

  async addShipmentBox(store, payload) {
    let resp;

    const params = {
      'carrierPartyId': '',
      'shipmentMethodTypeId': payload[0].shipmentMethodTypeId,
      'picklistBinId': payload[0].picklistBinId,
      'shipmentMethodBoxId': ''
    }

    try {
      resp = await OrderService.addShipmentBox(params);

      if (resp.status == 200) {
        console.log(resp)
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch(err) {
      showToast(translate('Somthing went wrong'))
    }
  },

  async getShipmentBoxInformation({ commit }, payload) {
    let resp;
    try {
      payload.orders.map(async (order: any) => {
        const query = {
          "entityName": "ShipmentPackageRouteSegDetail",
          "inputFields": {
            "primaryOrderId": order.doclist.docs[0].orderId
          },
          "fieldList": ["shipmentId", "shipmentPackageSeqId", "shipmentBoxTypeId", "packageName", "primaryOrderId"]
        }
        resp = await OrderService.getShipmentBoxInfo(query)
        if (resp.status == 200 && resp.data.count > 0) {
          commit(types.ORDER_SHIPMENT_BOX_INFO, { orderId: order.doclist.docs[0].orderId, boxInformation: resp.data.docs })
        }
      })
    } catch(err) {
      console.log(err)
    }
  }

}

export default actions;