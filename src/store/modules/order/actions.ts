import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import emitter from '@/event-bus'
import { OrderService } from '@/services/OrderService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { prepareOrderQuery } from '@/utils/solrHelper'
import { UtilService } from '@/services/UtilService'
import logger from '@/logger'


const actions: ActionTree<OrderState, RootState> = {
  async fetchInProgressOrdersAdditionalInformation({ commit, state }, payload = { viewIndex: 0 }) {
    // getting all the orders from state
    const cachedOrders = JSON.parse(JSON.stringify(state.inProgress.list)); // maintaining cachedOrders as to prepare the orders payload
    let inProgressOrders = JSON.parse(JSON.stringify(state.inProgress.list)); // maintaining inProgreesOrders as update the orders information once information in fetched

    const picklistBinIds: Array<string> = [];
    const orderIds: Array<string> = [];

    // splitting the orders in batches to fetch the additional orders information
    const orders = cachedOrders.splice(payload.viewIndex * (process.env.VUE_APP_VIEW_SIZE as any), process.env.VUE_APP_VIEW_SIZE)

    orders.map((order: any) => {
      picklistBinIds.push(order.picklistBinId)
      orderIds.push(order.orderId)
    })

    try {
      // maintaining an object containing information of shipmentIds for each order
    const shipmentIdsForOrderAndPicklistBin = await UtilService.findShipmentIdsForOrders(picklistBinIds, orderIds);

    let shipmentPackagesByOrderAndPicklistBin = {} as any, itemInformationByOrder = {} as any, carrierPartyIdsByShipment = {} as any, carrierShipmentBoxType = {} as any

    // storing all the shipmentIds for all the orders in an array to use furthur
    const orderShipmentIds = [...(new Set(Object.values(shipmentIdsForOrderAndPicklistBin).flat()))] as Array<string>

    // TODO: handle case when shipmentIds is empty
    // https://stackoverflow.com/questions/28066429/promise-all-order-of-resolved-values
    const [shipmentPackagesByOrderInformationAndPicklistBin, itemInformationByOrderInformation, carrierPartyIdsByShipmentInformation] = await Promise.all([UtilService.findShipmentPackages(orderShipmentIds), UtilService.findShipmentItemInformation(orderShipmentIds), UtilService.findCarrierPartyIdsForShipment(orderShipmentIds)])

    // TODO: try fetching the carrierPartyIds when fetching packages information, as ShipmentPackageRouteSegDetail entity contain carrierPartyIds as well
    const carrierPartyIds = [...new Set(Object.values(carrierPartyIdsByShipmentInformation).map((carrierPartyIds: any) => carrierPartyIds.map((carrier: any) => carrier.carrierPartyId)).flat())]

    shipmentPackagesByOrderAndPicklistBin = {
      ...shipmentPackagesByOrderAndPicklistBin,
      ...shipmentPackagesByOrderInformationAndPicklistBin
    }

    itemInformationByOrder = {
      ...itemInformationByOrder,
      ...itemInformationByOrderInformation
    }

    carrierPartyIdsByShipment = {
      ...carrierPartyIdsByShipment,
      ...carrierPartyIdsByShipmentInformation
    }

    carrierShipmentBoxType = {
      ...carrierShipmentBoxType,
      ...await UtilService.findCarrierShipmentBoxType(carrierPartyIds)
    }

    inProgressOrders = inProgressOrders.map((order: any) => {

      // if for an order shipment information is not available then returning the same order information again
      if(!shipmentIdsForOrderAndPicklistBin[`${order.orderId}_${order.picklistBinId}`]) {
          // if there are no shipment for the order, there is some issue with the order
          if (picklistBinIds.includes(order.picklistBinId) && orderIds.includes(order.orderId)) {
            return {
              ...order,
              hasMissingInfo: true,
            }
          }
          return order
      }

      order.items.map((item: any) => {
        // fetching shipmentItemInformation for the current order item and then assigning the shipmentItemSeqId to item
        const shipment = itemInformationByOrder[item.orderId]?.find((shipmentItem: any) => shipmentItem.orderItemSeqId === item.orderItemSeqId)

        if(shipment) {
          item.shipmentId = shipment.shipmentId
          item.shipmentItemSeqId = shipment.shipmentItemSeqId
        }

        item.selectedBox = shipmentPackagesByOrderAndPicklistBin[`${item.orderId}_${item.picklistBinId}`]?.find((shipmentPackage: any) => shipmentPackage.shipmentId === item.shipmentId)?.packageName
      })

      const orderItem = order.items[0];
      const carrierPartyIds = [...new Set(orderShipmentIds.map((id: any) => carrierPartyIdsByShipment[id]?.map((carrierParty: any) => carrierParty.carrierPartyId)).flat())];

      const shipmentBoxTypeByCarrierParty = carrierPartyIds.reduce((shipmentBoxType: any, carrierPartyId: any) => {
        if(shipmentBoxType[carrierPartyId]) {
          shipmentBoxType[carrierPartyId].push(carrierShipmentBoxType[carrierPartyId])
        } else {
          shipmentBoxType[carrierPartyId] = carrierShipmentBoxType[carrierPartyId]
        }

        return shipmentBoxType
      }, {});

      const shipmentPackages = shipmentPackagesByOrderAndPicklistBin[`${orderItem.orderId}_${orderItem.picklistBinId}`].map((shipmentPackage: any) => {
        return {
          ...shipmentPackage,
          shipmentBoxTypes: shipmentBoxTypeByCarrierParty[shipmentPackage.carrierPartyId] ? shipmentBoxTypeByCarrierParty[shipmentPackage.carrierPartyId] : []
        }
      });

      return {
        ...order,
        shipmentIds: shipmentIdsForOrderAndPicklistBin[`${orderItem.orderId}_${orderItem.picklistBinId}`],
        shipmentPackages: shipmentPackages,
        carrierPartyIds,
        shipmentBoxTypeByCarrierParty: shipmentBoxTypeByCarrierParty
      }
    })

    this.dispatch('util/fetchShipmentBoxTypeDesc', [...new Set(Object.values(carrierShipmentBoxType).flat())])
    } catch(err) {
      inProgressOrders = inProgressOrders.map((order: any) => {
        orderIds.includes(order.orderId) && (order.hasMissingInfo = true);
        return order;
      });
      logger.error('Failed to fetch shipmentIds for orders', err)
    }

    // updating the state with the updated orders information
    commit(types.ORDER_INPROGRESS_UPDATED, {orders: inProgressOrders, total: state.inProgress.total})
  },

  async fetchCompletedOrdersAdditionalInformation({ commit, state }) {
    // getting all the orders from state
    const cachedOrders = JSON.parse(JSON.stringify(state.completed.list)); // maintaining cachedOrders as to prepare the orders payload
    let completedOrders = JSON.parse(JSON.stringify(state.completed.list)); // maintaining completedOrders as update the orders information once information in fetched

    // Split orders in batch of 40
    const batchSize = 20;
    const requestParams = [];
    // fetch shipments for orders 
    while(cachedOrders.length) {
      const picklistBinIds: Array<string> = [];
      const orderIds: Array<string> = [];

      // splitting the orders in batches to fetch the additional orders information
      const orders = cachedOrders.splice(0, batchSize)

      orders.map((order: any) => {
        picklistBinIds.push(order.picklistBinId)
        orderIds.push(order.orderId)
      })
      requestParams.push({ picklistBinIds, orderIds })
    }

    try {
      const shipmentbatches = await Promise.all(requestParams.map((params) => OrderService.fetchShipments(params.picklistBinIds, params.orderIds, this.state.user.currentFacility.facilityId)))
      // TODO simplify below logic by returning shipments list
      const shipments = shipmentbatches.flat();

      const shipmentIds = [...new Set(shipments.map((shipment: any) => shipment.shipmentId))]
      // Get packed shipmentIds
      let shipmentPackages = [] as any;
      let shipmentTrackingCodes = [] as any;
      if (shipmentIds.length > 0) {
        try {
            const shipmentIdBatches = [];
            while(shipmentIds.length) {
              shipmentIdBatches.push(shipmentIds.splice(0, batchSize))
            }
            const shipmentPackagesBatches = await Promise.all(shipmentIdBatches.map((shipmentIds) => OrderService.fetchShipmentPackages(shipmentIds)))
            const trackingCodes = await Promise.all(shipmentIdBatches.map((shipmentIds) => OrderService.fetchTrackingCodes(shipmentIds)))
            shipmentPackages = shipmentPackagesBatches.flat();
            shipmentTrackingCodes = trackingCodes.flat();
          } catch(err) {
            completedOrders = completedOrders.map((order: any) => {
              order.hasMissingPackageInfo = true;
              return order;
            });
            logger.error('Failed to fetch shipment packages for orders', err)
          }
      }

      // Transforming the resp
      completedOrders = completedOrders.map((order: any) => {

        const orderShipments = shipments.filter((shipment: any) => order.orderId === shipment.primaryOrderId && shipment.picklistBinId === order.picklistBinId);

        // if for an order shipment information is not available then returning the same order information again
        if(!orderShipments || orderShipments.length === 0) {
          return order
        }

        const currentShipmentPackages = orderShipments.reduce((currentShipmentPackages: any, shipment: any) => {
          currentShipmentPackages.push(...shipmentPackages.filter((shipmentPackage: any) => shipmentPackage.shipmentId === shipment.shipmentId ));
          return currentShipmentPackages;
        }, []);

        const trackingCode = shipmentTrackingCodes.find((shipmentTrackingCode: any) => shipmentTrackingCode.shipmentId == order.shipmentId)?.trackingCode

        // If there is any shipment package with missing tracking code, retry shipping label
        const missingLabelImage = currentShipmentPackages.length > 0;

        return {
          ...order,
          shipments: orderShipments,
          missingLabelImage,
          trackingCode,
          shipmentPackages: currentShipmentPackages  // ShipmentPackages information is required when performing retryShippingLabel action
        }
      })
    } catch(err) {
      completedOrders = completedOrders.map((order: any) => {
        //  TODO check if we need to check for picklistBinId as well
        order.hasMissingShipmentInfo = true;
        return order;
      });
      logger.error('Failed to fetch shipmentIds for orders', err)
    }

    // updating the state with the updated orders information
    commit(types.ORDER_COMPLETED_UPDATED, { list: completedOrders, total: state.completed.total })
  },

  // get in-progress orders
  async findInProgressOrders ({ commit, dispatch, state }, payload = {}) {
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
      if (inProgressQuery.selectedPicklist) {
        params.filters['picklistId'] = { value: inProgressQuery.selectedPicklist }
      }

      const orderQueryPayload = prepareOrderQuery(params)

      resp = await OrderService.findInProgressOrders(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.picklistBinId.matches > 0) {
        total = resp.data.grouped.picklistBinId.ngroups
        orders = resp.data.grouped.picklistBinId.groups

        // TODO get only product visible
        this.dispatch('product/getProductInformation', { orders })

        orders = orders.map((order: any) => {
          const orderItem = order.doclist.docs[0];
          return {
            customerId: orderItem.customerId,
            customerName: orderItem.customerName,
            orderId: orderItem.orderId,
            orderDate: orderItem.orderDate,
            orderName: orderItem.orderName,
            groupValue: order.groupValue,
            picklistBinId: orderItem.picklistBinId,
            items: order.doclist.docs,
            shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
            shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
            shippingInstructions: orderItem.shippingInstructions
          }
        })
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('No inProgress orders found', err)
    }

    inProgressQuery.viewSize = orders.length

    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, { ...inProgressQuery })
    commit(types.ORDER_INPROGRESS_UPDATED, {orders, total})

    // fetching the additional information like shipmentRoute, carrierParty information
    // If no orders then no need to fetch any additional information
    if(orders.length){      
      dispatch('fetchInProgressOrdersAdditionalInformation');
    }

    emitter.emit('dismissLoader');
    return resp;
  },
  
  updateInProgressOrder ({ commit, state }, updatedOrder) {
    const orders = state.inProgress.list.map((order: any) => {
      if (updatedOrder.orderId === order.orderId && updatedOrder.picklistBinId === order.picklistBinId) {
        return {
          ...order,
          ...updatedOrder
        };
      }
      return order;
    })

    commit(types.ORDER_INPROGRESS_UPDATED, {orders, total: state.inProgress.total})
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
      sort: payload.sort ? payload.sort : "orderDate asc",
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
      if (!hasError(resp) && resp.data.grouped?.orderId.matches > 0) {
        total = resp.data.grouped.orderId.ngroups
        orders = resp.data.grouped.orderId.groups
        this.dispatch('product/getProductInformation', { orders })

        orders = orders.map((order: any) => {
          const orderItem = order.doclist.docs[0];
          return {
            customerId: orderItem.customerId,
            customerName: orderItem.customerName,
            orderId: orderItem.orderId,
            orderDate: orderItem.orderDate,
            orderName: orderItem.orderName,
            groupValue: order.groupValue,
            items: order.doclist.docs,
            shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
            shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
            shippingInstructions: orderItem.shippingInstructions,
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

  async findCompletedOrders ({ commit, dispatch, state }, payload = {}) {
    emitter.emit('presentLoader');
    let resp;

    const completedOrderQuery = JSON.parse(JSON.stringify(state.completed.query))

    const params = {
      ...payload,
      queryString: completedOrderQuery.queryString,
      viewSize: completedOrderQuery.viewSize,
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
        throw resp.data
      }
    } catch (err) {
      logger.error('No completed orders found', err)
    }

    completedOrderQuery.viewSize = orders.length

    // Transforming the resp
    orders = orders.map((order: any) => {
      const orderItem = order.doclist.docs[0]; // basic information for the order

      return {
        customerId: orderItem.customerId,
        customerName: orderItem.customerName,
        orderId: orderItem.orderId,
        orderDate: orderItem.orderDate,
        orderName: orderItem.orderName,
        reservedDatetime: orderItem.reservedDatetime,
        groupValue: order.groupValue,
        picklistBinId: orderItem.picklistBinId,
        items: order.doclist.docs,
        shipmentId: orderItem.shipmentId,
        shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
        shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
        shippingInstructions: orderItem.shippingInstructions,
        isGeneratingShippingLabel: false,
        isGeneratingPackingSlip: false
      }
    })

    commit(types.ORDER_COMPLETED_QUERY_UPDATED, { ...completedOrderQuery })
    commit(types.ORDER_COMPLETED_UPDATED, {list: orders, total})
    
    // fetching the additional information like shipmentRoute, carrierParty information
    // TODO make it async and use skelatal pattern
    // If no orders then no need to fetch any additional information
    if(orders.length){
      await dispatch('fetchCompletedOrdersAdditionalInformation');
    }

    emitter.emit('dismissLoader');
    return resp;
  },
  async fetchShippingAddress ({ commit }, currentOrder) {
    let resp;

    try {
      resp = await OrderService.fetchOrderItemShipGroup(currentOrder);
      if (resp) {
        const contactMechId = resp.contactMechId;

        resp = await OrderService.fetchShippingAddress(contactMechId);
        if (resp) {
          currentOrder = {
            ...currentOrder,
            shippingAddress: resp
          }  
        }
      }
    } catch (err: any) {
      logger.error("Error in setting current order", err);
    }
    commit(types.ORDER_CURRENT_UPDATED, { order: currentOrder })
  },

  async clearOrders ({ commit }) {
    commit(types.ORDER_INPROGRESS_CLEARED)
    commit(types.ORDER_OPEN_CLEARED)
    commit(types.ORDER_COMPLETED_CLEARED)
  },

  async clearOpenOrders({ commit }) {
    commit(types.ORDER_OPEN_CLEARED)
  },

  async clearInProgressOrders({ commit }) {
    commit(types.ORDER_INPROGRESS_CLEARED)
  },

  async clearCompletedOrders({ commit }) {
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
  },

  async updateInProgressIndex({ commit, dispatch }, payload) {
    // TODO handle API failure
    await dispatch('fetchInProgressOrdersAdditionalInformation', { viewIndex: payload.viewIndex});
    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, payload)
  },

  async updateCompletedOrderIndex({ commit }, payload) {
    commit(types.ORDER_COMPLETED_QUERY_UPDATED, payload)
  },

  async updateOpenOrderIndex({ commit }, payload) {
    commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
  },

  async fetchShipGroupForOrder({ dispatch }, orderId) {
    const params = {
      groupBy: 'shipGroupSeqId',
      filters: {
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        orderId: { value: orderId }
      },
      docType: 'ORDER'
    }

    const orderQueryPayload = prepareOrderQuery(params)

    let resp, total, shipGroups;
    const facilityTypeIds: Array<string> = [];

    try {
      resp = await OrderService.findOrderShipGroup(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.shipGroupSeqId.matches > 0) {
        total = resp.data.grouped.shipGroupSeqId.ngroups
        shipGroups = resp.data.grouped.shipGroupSeqId.groups

        // creating the key as orders as the product information action accept only the orders as a param
        this.dispatch('product/getProductInformation', { orders: shipGroups })
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch ship group information for order', err)
    }

    shipGroups = shipGroups.map((shipGroup: any) => {
      const shipItem = shipGroup.doclist.docs[0]

      facilityTypeIds.push(shipItem.facilityTypeId)

      return {
        items: shipGroup.doclist.docs,
        facilityId: shipItem.facilityId,
        facilityTypeId: shipItem.facilityTypeId,
        facilityName: shipItem.facilityName,
        shippingMethod: shipItem.shippingMethod,
        orderId: shipItem.orderId,
        shipGroupSeqId: shipItem.shipGroupSeqId
      }
    })

    this.dispatch('util/fetchFacilityTypeInformation', facilityTypeIds)

    // fetching reservation information for shipGroup from OISGIR doc
    // return dispatch('fetchAdditionalShipGroupForOrder', { shipGroups, orderId });
    return await dispatch('fetchAdditionalShipGroupForOrder', { shipGroups, orderId });
  },

  async fetchAdditionalShipGroupForOrder({ commit }, payload) {
    const shipGroupSeqIds = payload.shipGroups.map((shipGroup: any) => shipGroup.shipGroupSeqId)
    const orderId = payload.orderId

    const params = {
      groupBy: 'shipGroupSeqId',
      filters: {
        'shipGroupSeqId': { value: shipGroupSeqIds },
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        orderId: { value: orderId }
      }
    }

    const orderQueryPayload = prepareOrderQuery(params)

    let resp, total, shipGroups: any;

    try {
      resp = await OrderService.findOrderShipGroup(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.shipGroupSeqId.matches > 0) {
        total = resp.data.grouped.shipGroupSeqId.ngroups
        shipGroups = resp.data.grouped.shipGroupSeqId.groups
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch ship group information for order', err)
    }

    shipGroups = payload.shipGroups.map((shipGroup: any) => {
      const reservedShipGroupForOrder = shipGroups.find((group: any) => shipGroup.shipGroupSeqId === group.doclist.docs[0].shipGroupSeqId)

      const reservedShipGroup = reservedShipGroupForOrder.groupValue ? reservedShipGroupForOrder.doclist.docs[0] : ''

      return reservedShipGroup ? {
        ...shipGroup,
        carrierPartyId: reservedShipGroup.carrierPartyId,
        shipmentId: reservedShipGroup.shipmentId,
        groupCategory: '',  // category defines that the order is in which state like open, inProgress or completed
      } : {
        ...shipGroup
      }
    })

    const carrierPartyIds: Array<string> = [];
    const shipmentIds: Array<string> = [];

    if(total) {
      shipGroups.map((shipGroup: any) => {
        if(shipGroup.shipmentId) shipmentIds.push(shipGroup.shipmentId)
        if(shipGroup.carrierPartyId) carrierPartyIds.push(shipGroup.carrierPartyId)
      })
    }

    try {
      this.dispatch('util/fetchPartyInformation', carrierPartyIds)
      const shipmentTrackingCodes = await OrderService.fetchTrackingCodes(shipmentIds)

      shipGroups.find((shipGroup: any) => {
        const trackingCode = shipmentTrackingCodes.find((shipmentTrackingCode: any) => shipGroup.shipmentId === shipmentTrackingCode.shipmentId)?.trackingCode

        // TODO: Remove default value check
        shipGroup.trackingCode = trackingCode ? trackingCode : 'TRACKING CODE';
      })
    } catch(err) {
      logger.error('Failed to fetch information for ship groups', err)
    }

    return shipGroups;
  },

  // TODO clear current on logout
  async updateCurrent ({ commit, dispatch }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, { order: payload })
    await dispatch('fetchShippingAddress', payload);
  },
}

export default actions;