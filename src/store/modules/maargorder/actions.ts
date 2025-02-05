import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './MaargOrderState'
import emitter from '@/event-bus'
import { MaargOrderService } from '@/services/MaargOrderService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { escapeSolrSpecialChars, prepareOrderQuery } from '@/utils/solrHelper'
import logger from '@/logger'
import { removeKitComponents } from '@/utils/order'
import { getCurrentFacilityId, getProductStoreId } from '@/utils'

const actions: ActionTree<OrderState, RootState> = {

  // get open orders
  async findOpenOrders ({ commit, state }, payload = {}) {
    emitter.emit('presentLoader');
    let resp;

    const openOrderQuery = JSON.parse(JSON.stringify(state.open.query))

    const params = {
      ...payload,
      docType: 'ORDER',
      queryString: openOrderQuery.queryString,
      queryFields: 'productId productName parentProductName orderId orderName customerEmailId customerPartyId customerPartyName  search_orderIdentifications goodIdentifications',
      viewSize: openOrderQuery.viewSize,
      sort: payload.sort ? payload.sort : "orderDate asc",
      filters: {
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        '-fulfillmentStatus': { value: '[* TO *]' },
        orderStatusId: { value: 'ORDER_APPROVED' },
        orderTypeId: { value: 'SALES_ORDER' },
        facilityId: { value: escapeSolrSpecialChars(getCurrentFacilityId()) },
        productStoreId: { value: getProductStoreId() }
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
      resp = await MaargOrderService.findOpenOrders(orderQueryPayload);
      if (!hasError(resp) && resp.data.grouped?.orderId.matches > 0) {
        total = resp.data.grouped.orderId.ngroups
        orders = resp.data.grouped.orderId.groups
        await this.dispatch('product/getProductInformation', { orders })

        orders = orders.map((order: any) => {
          const orderItem = order.doclist.docs[0];

          return {
            category: 'open',
            customerId: orderItem.customerPartyId,
            customerName: orderItem.customerPartyName,
            orderId: orderItem.orderId,
            orderDate: orderItem.orderDate,
            orderName: orderItem.orderName,
            groupValue: order.groupValue,
            items: removeKitComponents({items: order.doclist.docs}),
            shipGroupSeqId: orderItem.shipGroupSeqId,
            shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
            reservedDatetime: orderItem.reservedDatetime
          }
        })
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('No outstanding orders found', err)
    }

    openOrderQuery.viewSize = orders.length

    commit(types.ORDER_OPEN_QUERY_UPDATED, { ...openOrderQuery })
    commit(types.ORDER_OPEN_UPDATED, {list: orders, total})

    emitter.emit('dismissLoader');
    return resp;
  },

  async findInProgressOrders ({ commit, dispatch, state }, payload = {}) {
    emitter.emit('presentLoader');
    let resp;
    let orders = [];
    let total = 0;

    const inProgressQuery = JSON.parse(JSON.stringify(state.inProgress.query))

    try {
      const params = {
        ...payload,
        keyword: inProgressQuery.queryString,
        pageSize: inProgressQuery.viewSize,
        orderBy: 'orderDate',
        statusId: 'SHIPMENT_APPROVED',
        shipmentTypeId: 'SALES_SHIPMENT', 
        facilityId: getCurrentFacilityId(),
        productStoreId: getProductStoreId(),
      }

      // preparing filters separately those are based on some condition
      if (inProgressQuery.selectedPicklist) {
        params.picklistId = inProgressQuery.selectedPicklist
      }

      resp = await MaargOrderService.findInProgressOrders(params);
      if (!hasError(resp)) {
        total = resp.data.shipmentCount
        orders = resp.data.shipments

        const productIds = [
          ...new Set(orders.flatMap((order:any) => order.items.map((item:any) => item.productId)))
        ];

        // TODO get only product visible
        await this.dispatch('product/fetchProducts', { productIds })
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('No inProgress orders found', err)
    }

    inProgressQuery.viewSize = total

    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, { ...inProgressQuery })
    commit(types.ORDER_INPROGRESS_UPDATED, {orders, total})

    emitter.emit('dismissLoader');
    return resp;
  },
  updateInProgressOrder ({ commit, state }, updatedOrder) {
    const orders = state.inProgress.list.map((order: any) => {
      if (updatedOrder.shipmentId === order.shipmentId) {
        return {
          ...order,
          ...updatedOrder
        };
      }
      return order;
    })

    commit(types.ORDER_INPROGRESS_UPDATED, {orders, total: state.inProgress.total})
  },
  async updateOpenQuery({ commit, dispatch }, payload) {
      commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
      await dispatch('findOpenOrders');
  },
  async clearOpenOrders({ commit }) {
      commit(types.ORDER_OPEN_CLEARED)
  },
  async clearInProgressOrders({ commit }) {
      commit(types.ORDER_INPROGRESS_CLEARED)
  },
  async updateInProgressQuery({ commit, dispatch }, payload) {
      commit(types.ORDER_INPROGRESS_QUERY_UPDATED, payload)
      await dispatch('findInProgressOrders');
  }
}

export default actions;