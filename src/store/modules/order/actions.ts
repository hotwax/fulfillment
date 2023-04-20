import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import emitter from '@/event-bus'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import * as types from './mutation-types'
import { prepareOrderQuery } from '@/utils/solrHelper'
import { UtilService } from '@/services/UtilService'


const actions: ActionTree<OrderState, RootState> = {

  // get in-progress orders
  async findInProgressOrders ({ commit, state }, payload = {}) {
    emitter.emit('presentLoader');
    let resp;
    let orders = [];
    let total = 0;

    const inProgressQuery = JSON.parse(JSON.stringify(state.inProgress.query))

    try {
      const params = {
        ...payload,
        queryString: inProgressQuery.queryString,
        viewSize: inProgressQuery.viewSize,
        queryFields: 'productId productName virtualProductName orderId search_orderIdentifications productSku customerId customerName goodIdentifications',
        sort: 'orderDate asc',
        groupBy: 'picklistBinId',
        filters: {
          picklistItemStatusId: { value: 'PICKITEM_PENDING' },
          '-fulfillmentStatus': { value: 'Rejected' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: this.state.user.currentFacility.facilityId },
          productStoreId: { value: this.state.user.currentEComStore.productStoreId }
        }
      }

      // preparing filters separately those are based on some condition
      if(inProgressQuery.selectedPicklists.length) {
        params.filters['picklistId'] = {value: inProgressQuery.selectedPicklists, op: 'OR'}
      }

      const orderQueryPayload = prepareOrderQuery(params)

      resp = await OrderService.findInProgressOrders(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.picklistBinId.matches > 0) {
        total = resp.data.grouped.picklistBinId.ngroups
        orders = resp.data.grouped.picklistBinId.groups

        const picklistBinIds: Array<string> = [];
        const orderIds: Array<string> = [];

        orders.map((order: any) => {
          picklistBinIds.push(order.groupValue)
          orderIds.push(order.doclist.docs[0].orderId)
        })

        const shipmentIds: Array<string> = [...(await UtilService.findShipmentIdsForOrders(picklistBinIds, orderIds)).flat()]

        // TODO: handle case when shipmentIds is empty
        // https://stackoverflow.com/questions/28066429/promise-all-order-of-resolved-values
        const [shipmentPackagesByOrder, itemInformationByOrder, carrierPartyIdsByShipment] = await Promise.all([UtilService.findShipmentPackages(shipmentIds), UtilService.findShipmentItemInformation(shipmentIds), UtilService.findCarrierPartyIdsForShipment(shipmentIds)])

        // TODO: try fetching the carrierPartyIds when fetching packages information, as ShipmentPackageRouteSegDetail entity contain carrierPartyIds as well
        const carrierPartyIds = [...new Set(Object.values(carrierPartyIdsByShipment).map((carrierPartyIds: any) => carrierPartyIds.map((carrier: any) => carrier.carrierPartyId)).flat())]

        const carrierShipmentBoxType = await UtilService.findCarrierShipmentBoxType(carrierPartyIds)

        this.dispatch('product/getProductInformation', { orders })

        orders = orders.map((order: any) => {

          order.doclist.docs.map((item: any) => {
            // fetching shipmentItemInformation for the current order item and then assigning the shipmentItemSeqId to item
            item.shipmentItemSeqId = itemInformationByOrder[item.orderId]?.find((shipmentItem: any) => shipmentItem.orderItemSeqId === item.orderItemSeqId)?.shipmentItemSeqId

            item.selectedBox = shipmentPackagesByOrder[item.orderId].find((shipmentPackage: any) => shipmentPackage.shipmentId === item.shipmentId)?.packageName
          })

          const orderItem = order.doclist.docs[0];
          const carrierPartyIds = [...new Set(shipmentIds.map((id: any) => carrierPartyIdsByShipment[id].map((carrierParty: any) => carrierParty.carrierPartyId)).flat())]

          return {
            customerId: orderItem.customerId,
            customerName: orderItem.customerName,
            orderId: orderItem.orderId,
            orderDate: orderItem.orderDate,
            groupValue: order.groupValue,
            picklistBinId: orderItem.picklistBinId,
            shipmentIds,
            items: order.doclist.docs,
            shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
            shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
            shipmentPackages: shipmentPackagesByOrder[orderItem.orderId],
            carrierPartyIds,
            shipmentBoxTypeByCarrierParty: carrierPartyIds.reduce((shipmentBoxType: any, carrierPartyId: string) => {
              if(shipmentBoxType[carrierPartyId]) {
                shipmentBoxType[carrierPartyId].push(carrierShipmentBoxType[carrierPartyId])
              } else {
                shipmentBoxType[carrierPartyId] = carrierShipmentBoxType[carrierPartyId]
              }

              return shipmentBoxType
            }, {}),
          }
        })
      } else {
        console.error('No orders found')
      }
    } catch (err) {
      console.error('error', err)
    }

    inProgressQuery.viewSize = orders.length

    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, { ...inProgressQuery })
    commit(types.ORDER_INPROGRESS_UPDATED, {orders, total})
    emitter.emit('dismissLoader');
    return resp;
  },
  
  // get open orders
  async findOpenOrders ({ commit, state }, payload = {}) {
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
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.orderId.matches > 0) {
        total = resp.data.grouped.orderId.ngroups
        orders = resp.data.grouped.orderId.groups
        this.dispatch('product/getProductInformation', { orders })
      } else {
        console.error('No orders found')
      }
    } catch (err) {
      console.error('error', err)
    }

    openOrderQuery.viewSize = orders.length

    commit(types.ORDER_OPEN_QUERY_UPDATED, { ...openOrderQuery })
    commit(types.ORDER_OPEN_UPDATED, {list: orders, total})

    emitter.emit('dismissLoader');
    return resp;
  },

  async findCompletedOrders ({ commit, state }, payload = {}) {
    emitter.emit('presentLoader');
    let resp;

    const completedOrderQuery = JSON.parse(JSON.stringify(state.completed.query))

    const params = {
      ...payload,
      queryString: completedOrderQuery.queryString,
      viewSize: completedOrderQuery.viewSize,
      queryFields: 'productId productName virtualProductName orderId search_orderIdentifications productSku customerId customerName goodIdentifications',
      groupBy: 'picklistBinId',
      sort: 'orderDate asc',
      filters: {
        picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        facilityId: { value: this.state.user.currentFacility.facilityId },
        productStoreId: { value: this.state.user.currentEComStore.productStoreId }
      }
    }

    if(completedOrderQuery.selectedCarrierPartyIds.length) {
      params.filters['manifestContentId'] = { value: completedOrderQuery.selectedCarrierPartyIds, op: 'OR' }
    }

    // only adding shipmentMethods when a method is selected
    if(completedOrderQuery.selectedShipmentMethods.length) {
      params.filters['shipmentMethodTypeId'] = { value: completedOrderQuery.selectedShipmentMethods, op: 'OR' }
    }

    const orderQueryPayload = prepareOrderQuery(params)
    let orders = [];
    let total = 0;

    try {
      resp = await OrderService.findCompletedOrders(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.picklistBinId.matches > 0) {
        total = resp.data.grouped.picklistBinId.ngroups
        orders = resp.data.grouped.picklistBinId.groups
        this.dispatch('product/getProductInformation', { orders })
      } else {
        console.error('No orders found')
      }
    } catch (err) {
      console.error('error', err)
      showToast(translate('Something went wrong'))
    }

    completedOrderQuery.viewSize = orders.length

    // Transforming the resp
    orders = orders.map((order: any) => ({
      customerId: order.doclist.docs[0].customerId,
      customerName: order.doclist.docs[0].customerName,
      orderId: order.doclist.docs[0].orderId,
      orderDate: order.doclist.docs[0].orderDate,
      groupValue: order.groupValue,
      items: order.doclist.docs,
      shipmentMethodTypeId: order.doclist.docs[0].shipmentMethodTypeId,
      shipmentMethodTypeDesc: order.doclist.docs[0].shipmentMethodTypeDesc
    }))

    commit(types.ORDER_COMPLETED_QUERY_UPDATED, { ...completedOrderQuery })
    commit(types.ORDER_COMPLETED_UPDATED, {list: orders, total})

    emitter.emit('dismissLoader');
    return resp;
  },

  async clearOrders ({ commit }) {
    commit(types.ORDER_INPROGRESS_CLEARED)
    commit(types.ORDER_OPEN_CLEARED)
    commit(types.ORDER_COMPLETED_CLEARED)
  },

  async updateOpenQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
    await dispatch('findOpenOrders');
  },

  async updateCompletedQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_COMPLETED_QUERY_UPDATED, payload)
    await dispatch('findCompletedOrders');
  },

  async updateInProgressQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, payload)
    await dispatch('findInProgressOrders');
  }
}

export default actions;