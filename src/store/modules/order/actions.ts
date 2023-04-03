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
  async fetchInProgressOrders ({ commit, state }, payload) {
    emitter.emit('presentLoader');
    let resp;
    let orders = [];
    let total = 0;

    try {
      const inProgressQuery = JSON.parse(JSON.stringify(state.inProgress.query))

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

      resp = await OrderService.fetchInProgressOrders(orderQueryPayload);
      if (resp.status === 200 && resp.data.grouped?.picklistBinId.matches > 0 && !hasError(resp)) {
        total = resp.data.grouped.picklistBinId.ngroups
        orders = resp.data.grouped.picklistBinId.groups
        const availableShipmentIds: Array<string> = [];

        // using for loop as map does not supports working with async code
        for (const order of orders) {
          const shipmentInformation = await UtilService.fetchShipmentInformationForOrder(order.groupValue, order.doclist.docs[0].orderId)
          order.shipment = shipmentInformation.shipment;
          order.shipmentIds = shipmentInformation.shipmentIds;
          availableShipmentIds.push(...shipmentInformation.shipmentIds)
        }

        // using flat to have the shipmentIds at a single level and then filtered the shipmentId to handle the case if we might not have the shipmentId available for an order
        const shipmentIds = orders.map((order: any) => order.shipmentIds).flat().filter((shipmentId: string) => shipmentId)

        // TODO: handle case when shipmentIds is empty
        const shipmentPackages = await UtilService.fetchShipmentPackages(shipmentIds)

        const itemInformationByShipment = await UtilService.fetchShipmentItemInformation(availableShipmentIds)

        const carrierPartyIdsByShipment = await UtilService.fetchCarrierPartyIdsForShipment(availableShipmentIds)

        const carrierPartyIds = [...new Set(Object.values(carrierPartyIdsByShipment).map((carrierPartyIds: any) => carrierPartyIds.map((carrier: any) => carrier.carrierPartyId)).flat())]

        const carrierShipmentBoxType = await UtilService.fetchCarrierShipmentBoxType(carrierPartyIds)

        orders.map((order: any) => {
          order['shipmentPackages'] = shipmentPackages[order.doclist.docs[0].orderId]
          order['carrierPartyIds'] = [...new Set(availableShipmentIds.map((id: any) => carrierPartyIdsByShipment[id].map((carrierParty: any) => carrierParty.carrierPartyId)).flat())]

          order['shipmentBoxTypeByCarrierParty'] = order['carrierPartyIds'].reduce((shipmentBoxType: any, carrierPartyId: string) => {
            if(shipmentBoxType[carrierPartyId]) {
              shipmentBoxType[carrierPartyId].push(carrierShipmentBoxType[carrierPartyId])
            } else {
              shipmentBoxType[carrierPartyId] = carrierShipmentBoxType[carrierPartyId]
            }

            return shipmentBoxType
          }, {})

          order.doclist.docs.map((item: any) => {
            // assigning segmentSelected at item level as we have option to change segment for each item
            item.segmentSelected = 'pack'

            // fetching shipmentItemInformation for the current order item and then assigning the shipmentItemSeqId to item
            const shipmentItem = itemInformationByShipment[item.orderId]?.find((shipmentItem: any) => shipmentItem.productId === item.productId)

            if(shipmentItem) {
              item.shipmentItemSeqId = shipmentItem.shipmentItemSeqId

              // TODO: check if we can handle this case directly
              // clearning the productId from the found shipmentItem as when we have multiple products having the same productId
              // then there is no unique information available in ShipmentAndItemAndProduct entity to uniquely identify the products
              // thus every time when a shipmentItem is found assigning it's shipmentItemSeqId and then clearning the productId
              // so that the items will not have the same shipmentItemSeqId
              shipmentItem.productId = ''
            }

            item.selectedBox = order.shipmentPackages.find((shipmentPackage: any) => shipmentPackage.shipmentId === item.shipmentId)?.packageName
          })
        })

        inProgressQuery.viewSize = orders.length

        commit(types.ORDER_INPROGRESS_QUERY_UPDATED, { ...inProgressQuery })
        commit(types.ORDER_INPROGRESS_UPDATED, {orders, total})
        this.dispatch('product/getProductInformation', { orders })
      } else {
        console.error('No orders found')
      }
    } catch (err) {
      console.error('error', err)
    }
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
      if (resp.status === 200 && resp.data.grouped.orderId.matches > 0 && !hasError(resp)) {
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

  async clearOrders ({ commit }) {
    commit(types.ORDER_INPROGRESS_CLEARED, {
      list: [],
      total: 0,
      query: {
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        selectedPicklists: [],
        queryString: ''
      }
    })
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

  async updateOrder({ commit }, payload) {

    try {
      const resp = await OrderService.updateOrder(payload)

      if(!hasError(resp)) {
        showToast(translate('Order updated successfully'))
      } else {
        throw resp.data;
      }
    } catch (err) {
      showToast(translate('Failed to update order'))
      console.error(err)
    }

  },

  async updateOpenQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
    await dispatch('findOpenOrders');
  },

  async updateInProgressQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, payload)
    await dispatch('findInProgressOrders');
  }
}

export default actions;