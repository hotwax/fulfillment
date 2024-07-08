import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import emitter from '@/event-bus'
import { OrderService } from '@/services/OrderService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { escapeSolrSpecialChars, prepareOrderQuery } from '@/utils/solrHelper'
import { UtilService } from '@/services/UtilService'
import logger from '@/logger'
import { getOrderCategory, removeKitComponents } from '@/utils/order'

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

      const orderShipmentPackages = this.state.util.productStoreShipmentMethCount > 0 ? await OrderService.fetchShipmentPackages(orderShipmentIds) : [];

      inProgressOrders = inProgressOrders.map((order: any) => {

        // if for an order shipment information is not available then returning the same order information again
        if (!shipmentIdsForOrderAndPicklistBin[`${order.orderId}_${order.picklistBinId}`]) {
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
          //Added a check for shipmentItem.productId === orderItem.productId to identify the correct shipment item. In the case of a kit, the ShipmentItem will be created with the same orderItemSeqId for both the kit and its components.
          const shipment = itemInformationByOrder[item.orderId]?.find((shipmentItem: any) => shipmentItem.orderItemSeqId === item.orderItemSeqId && shipmentItem.productId === item.productId)

          if (shipment) {
            item.shipmentId = shipment.shipmentId
            item.shipmentItemSeqId = shipment.shipmentItemSeqId
          }

          item.selectedBox = shipmentPackagesByOrderAndPicklistBin[`${item.orderId}_${item.picklistBinId}`]?.find((shipmentPackage: any) => shipmentPackage.shipmentId === item.shipmentId)?.packageName
        })

        const orderItem = order.items[0];
        const carrierPartyIds = [...new Set(orderShipmentIds.map((id: any) => carrierPartyIdsByShipment[id]?.map((carrierParty: any) => carrierParty.carrierPartyId)).flat())];

        const shipmentBoxTypeByCarrierParty = carrierPartyIds.reduce((shipmentBoxType: any, carrierPartyId: any) => {
          if (shipmentBoxType[carrierPartyId]) {
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

        const currentShipmentPackages = shipmentPackagesByOrderAndPicklistBin[`${orderItem.orderId}_${orderItem.picklistBinId}`].reduce((currentShipmentPackages: any, shipment: any) => {
          currentShipmentPackages.push(...orderShipmentPackages.filter((shipmentPackage: any) => shipmentPackage.shipmentId === shipment.shipmentId));
          return currentShipmentPackages;
        }, []);

        // When the shipment method for product store is configured then only check for shipmentPackages otherwise we won't show missing label error button
        const missingLabelImage = this.state.util.productStoreShipmentMethCount > 0 ? currentShipmentPackages.length > 0 : false;

        return {
          ...order,
          items: removeKitComponents(order),
          shipmentIds: shipmentIdsForOrderAndPicklistBin[`${orderItem.orderId}_${orderItem.picklistBinId}`],
          shipmentPackages: shipmentPackages,
          carrierPartyIds,
          shipmentBoxTypeByCarrierParty: shipmentBoxTypeByCarrierParty,
          missingLabelImage
        }
      })

      this.dispatch('util/fetchShipmentBoxTypeDesc', [...new Set(Object.values(carrierShipmentBoxType).flat())])
    } catch (err) {
      inProgressOrders = inProgressOrders.map((order: any) => {
        orderIds.includes(order.orderId) && (order.hasMissingInfo = true);
        return order;
      });
      logger.error('Failed to fetch shipmentIds for orders', err)
    }

    // updating the state with the updated orders information
    commit(types.ORDER_INPROGRESS_UPDATED, { orders: inProgressOrders, total: state.inProgress.total })
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
      if (shipmentIds.length > 0) {
        try {
            const shipmentIdBatches = [];
            while(shipmentIds.length) {
              shipmentIdBatches.push(shipmentIds.splice(0, batchSize))
            }
            const shipmentPackagesBatches = await Promise.all(shipmentIdBatches.map((shipmentIds) => UtilService.findShipmentPackages(shipmentIds)))
            shipmentPackages = shipmentPackagesBatches.reduce((packages, data) => {
              return packages.concat(...Object.values(data));
            }, []);

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

        // If there is any shipment package with missing tracking code, retry shipping label
        const missingLabelImage = this.state.util.productStoreShipmentMethCount > 0 ? currentShipmentPackages.some((shipmentPackage:any) => shipmentPackage.trackingCode === null) : false;

        return {
          ...order,
          items: removeKitComponents(order),
          shipments: orderShipments,
          missingLabelImage,
          trackingCode: currentShipmentPackages?.[0].trackingCode,
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
          '-fulfillmentStatus': { value: ['Rejected', 'Cancelled'] },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
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
        await this.dispatch('product/getProductInformation', { orders })

        orders = orders.map((order: any) => {
          const orderItem = order.doclist.docs[0];
          return {
            category: 'in-progress',
            customerId: orderItem.customerId,
            customerName: orderItem.customerName,
            orderId: orderItem.orderId,
            orderDate: orderItem.orderDate,
            orderName: orderItem.orderName,
            groupValue: order.groupValue,
            picklistBinId: orderItem.picklistBinId,
            picklistId: orderItem.picklistId,
            items: removeKitComponents({items: order.doclist.docs}),
            shipGroupSeqId: orderItem.shipGroupSeqId,
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
        '-fulfillmentStatus': { value: ['Cancelled', 'Rejected']},
        orderStatusId: { value: 'ORDER_APPROVED' },
        orderTypeId: { value: 'SALES_ORDER' },
        facilityId: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
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
        await this.dispatch('product/getProductInformation', { orders })

        orders = orders.map((order: any) => {
          const orderItem = order.doclist.docs[0];

          return {
            category: 'open',
            customerId: orderItem.customerId,
            customerName: orderItem.customerName,
            orderId: orderItem.orderId,
            orderDate: orderItem.orderDate,
            orderName: orderItem.orderName,
            groupValue: order.groupValue,
            items: removeKitComponents({items: order.doclist.docs}),
            shipGroupSeqId: orderItem.shipGroupSeqId,
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
      sort: 'picklistItemStatusId desc, orderDate asc',
      filters: {
        picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        facilityId: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
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
        await this.dispatch('product/getProductInformation', { orders })
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
        category: 'completed',
        customerId: orderItem.customerId,
        customerName: orderItem.customerName,
        orderId: orderItem.orderId,
        orderDate: orderItem.orderDate,
        orderName: orderItem.orderName,
        reservedDatetime: orderItem.reservedDatetime,
        groupValue: order.groupValue,
        picklistBinId: orderItem.picklistBinId,
        picklistId: orderItem.picklistId,
        items: removeKitComponents({items: order.doclist.docs}),
        shipGroupSeqId: orderItem.shipGroupSeqId,
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

  async fetchPaymentDetail({ commit, state }) {
    try {
      const order = JSON.parse(JSON.stringify(state.current));
      const resp = await OrderService.fetchOrderPaymentPreferences(order.orderId);
  
      if (!hasError(resp)) {
        const orderPaymentPreferences = resp?.data?.docs;
  
        if (orderPaymentPreferences.length > 0) {
          const paymentMethodTypeIds = orderPaymentPreferences.map((orderPaymentPreference: any) => orderPaymentPreference.paymentMethodTypeId);
          if (paymentMethodTypeIds.length > 0) {
            this.dispatch('util/fetchPaymentMethodTypeDesc', paymentMethodTypeIds);
          }
  
          const statusIds = orderPaymentPreferences.map((orderPaymentPreference: any) => orderPaymentPreference.statusId);
          if (statusIds.length > 0) {
            this.dispatch('util/fetchStatusDesc', statusIds);
          }
  
          order.orderPaymentPreferences = orderPaymentPreferences;
          commit(types.ORDER_CURRENT_UPDATED, order);
        }
      }
    } catch (err) {
      logger.error("Error in fetching payment detail.", err);
    }
  },

  async fetchShippingAddress ({ commit, state }) {
    let resp;
    let order = JSON.parse(JSON.stringify(state.current))

    try {
      resp = await OrderService.fetchOrderItemShipGroup(order);
      if (resp) {
        const contactMechId = resp.contactMechId;
        resp = await OrderService.fetchShippingAddress(contactMechId);

        if (resp) {
          order = {
            ...order,
            shippingAddress: resp
          }
        }
      }
    } catch (err: any) {
      logger.error("Error in fetching shipping address information for current order", err);
    }
    commit(types.ORDER_CURRENT_UPDATED,  order)
  },

  async getShippingPhoneNumber({ commit, state }) {
    let order = JSON.parse(JSON.stringify(state.current))

    try {
      const contactNumber = await OrderService.getShippingPhoneNumber(order.orderId);
      order = {
        ...order,
        contactNumber
      }
    } catch (err: any) {
      logger.error("Error in fetching customer phone number for current order", err);
    }
    commit(types.ORDER_CURRENT_UPDATED, order)
  },

  async updateShipmentPackageDetail ({ commit, state }, payload) {
    const currentOrder = JSON.parse(JSON.stringify(state.current));
    const completedOrders = JSON.parse(JSON.stringify(state.completed.list));

    try {
      const shipmentIds = payload?.shipments?.map((shipment: any) => shipment.shipmentId);
      const shipmentPackages = await UtilService.findShipmentPackages([...shipmentIds])
      const shipmentPackageValues = Object.values(shipmentPackages).flat() as any;

      const shipmentPackagesMap = shipmentPackageValues?.reduce((shipmentPackageDetail:any, shipmentPackage:any) => {
        const key = `${shipmentPackage.shipmentId}-${shipmentPackage.shipmentPackageSeqId}`;
        shipmentPackageDetail[key] = shipmentPackage;
        return shipmentPackageDetail;
      }, {});

      const missingLabelImage = this.state.util.productStoreShipmentMethCount > 0 ? shipmentPackageValues.some((shipmentPackage:any) => !shipmentPackage.trackingCode) : false;

      const updateShipmentPackages = (order:any) => {
        order.shipmentPackages.forEach((shipmentPackage:any) => {
          const key = `${shipmentPackage.shipmentId}-${shipmentPackage.shipmentPackageSeqId}`;
          const updatedShipmentPackage = shipmentPackagesMap[key];
          if (updatedShipmentPackage) {
            shipmentPackage.trackingCode = updatedShipmentPackage.trackingCode;
            shipmentPackage.labelPdfUrl = updatedShipmentPackage.labelPdfUrl;
            shipmentPackage.missingLabelImage = missingLabelImage;
          }
        });
      };
  
      if (currentOrder && currentOrder.orderId === payload.orderId) {
        updateShipmentPackages(currentOrder);
        commit(types.ORDER_CURRENT_UPDATED, currentOrder);
      }
  
      if (completedOrders && completedOrders.length > 0) {
        const order = completedOrders.find((completedOrder:any) => completedOrder.orderId === payload.orderId);
        if (order) {
          updateShipmentPackages(order);
          commit(types.ORDER_COMPLETED_UPDATED, { list: completedOrders, total: state.completed.total });
        }
      }
    } catch(err) {
      logger.error('Failed to fetch shipment packages.', err)
    }
  },

  async clearOrders ({ commit }) {
    commit(types.ORDER_INPROGRESS_CLEARED)
    commit(types.ORDER_OPEN_CLEARED)
    commit(types.ORDER_COMPLETED_CLEARED)
    commit(types.ORDER_CURRENT_UPDATED, {})
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

  async getOpenOrder({ dispatch, state }, payload) {
    const current = state.current as any
    if (current.orderId === payload.orderId && current.category === 'open' && current.shipGroupSeqId === payload.shipGroupSeqId) {
      return
    }

    const orders = JSON.parse(JSON.stringify(state.open.list)) as Array<any>
    if (orders.length) {
      const order = orders.find((order: any) => order.orderId === payload.orderId && current.category === 'open' && payload.shipGroupSeqId === order.shipGroupSeqId)
      if (order) {
        dispatch('updateCurrent', order)
        return
      }
    }

    let resp, order = {} as any;
    emitter.emit('presentLoader');

    const params = {
      viewSize: 1,
      filters: {
        orderId: { value: payload.orderId },
        quantityNotAvailable: { value: 0 },
        isPicked: { value: 'N' },
        shipGroupSeqId: { value: payload.shipGroupSeqId },
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        '-fulfillmentStatus': { value: ['Cancelled', 'Rejected']},
        orderStatusId: { value: 'ORDER_APPROVED' },
        orderTypeId: { value: 'SALES_ORDER' },
        facilityId: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
        productStoreId: { value: this.state.user.currentEComStore.productStoreId }
      }
    }
    const orderQueryPayload = prepareOrderQuery(params)
    try {
      resp = await OrderService.findOpenOrders(orderQueryPayload);
      if (!hasError(resp) && resp.data.grouped?.orderId.matches > 0) {
        const orderItem = resp.data.grouped.orderId.groups[0].doclist.docs[0];
        const productIds = resp.data.grouped.orderId.groups[0].doclist.docs.map((item: any) => item.productId)
        await this.dispatch('product/fetchProducts', { productIds })

        order = {
          category: 'open',
          customerId: orderItem.customerId,
          customerName: orderItem.customerName,
          orderId: orderItem.orderId,
          orderDate: orderItem.orderDate,
          orderName: orderItem.orderName,
          groupValue: resp.data.grouped.orderId.groups[0].groupValue,
          items:  removeKitComponents({items: resp.data.grouped.orderId.groups[0].doclist.docs}),
          shipGroupSeqId: orderItem.shipGroupSeqId,
          shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
          shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
          reservedDatetime: orderItem.reservedDatetime
        }
        
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Something went wrong, could not fetch order details.', err)
    }
    dispatch('updateCurrent', order)
    emitter.emit('dismissLoader');
    return resp;
  },

  async getInProgressOrder ({ dispatch, state }, payload) {
    // if order is modified, we refetch it instead of returning from the state
    if (!payload.isModified) {
      const current = state.current as any
      if (current.orderId === payload.orderId && current.category === 'in-progress' && current.shipGroupSeqId === payload.shipGroupSeqId) {
        return
      }

      const orders = JSON.parse(JSON.stringify(state.inProgress.list)) as Array<any>
      if (orders.length) {
        const order = orders.find((order: any) => order.orderId === payload.orderId && current.category === 'in-progress' && payload.shipGroupSeqId === order.shipGroupSeqId)
        if (order) {
          dispatch('updateCurrent', order)
          return
        }
      }
    }
    emitter.emit('presentLoader');
    let resp, order = {} as any;

    try {
      const params = {
        viewSize: 1,
        sort: 'orderDate asc',
        groupBy: 'picklistBinId',
        filters: {
          orderId: { value: payload.orderId },
          picklistItemStatusId: { value: 'PICKITEM_PENDING' },
          shipGroupSeqId: { value: payload.shipGroupSeqId },
          '-fulfillmentStatus': { value: ['Cancelled', 'Rejected']},
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          facilityId: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
          productStoreId: { value: this.state.user.currentEComStore.productStoreId }
        }
      }

      const orderQueryPayload = prepareOrderQuery(params)

      resp = await OrderService.findInProgressOrders(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.picklistBinId.matches > 0) {
        await this.dispatch('product/fetchProducts', { productIds: order.items.map((item: any) => item.productId) })
        
        const orderItem = resp.data.grouped.picklistBinId.groups[0].doclist.docs[0];
        order = {
          category: 'in-progress',
          customerId: orderItem.customerId,
          customerName: orderItem.customerName,
          orderId: orderItem.orderId,
          orderDate: orderItem.orderDate,
          orderName: orderItem.orderName,
          groupValue: resp.data.grouped.picklistBinId.groups[0].groupValue,
          picklistBinId: orderItem.picklistBinId,
          items: removeKitComponents({items: resp.data.grouped.picklistBinId.groups[0].doclist.docs}) ,
          shipGroupSeqId: orderItem.shipGroupSeqId,
          shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
          shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
        }
        
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Something went wrong', err)
    }

    await dispatch('fetchInProgressOrderAdditionalInformation', order);

    emitter.emit('dismissLoader');
  },

  async getCompletedOrder({ dispatch, state }, payload) {
    const current = state.current as any
    if (current.orderId === payload.orderId && current.category === 'completed' && current.shipGroupSeqId === payload.shipGroupSeqId) {
      return
    }

    const orders = JSON.parse(JSON.stringify(state.completed.list)) as Array<any>
    if (orders.length) {
      const order = orders.find((order: any) => order.orderId === payload.orderId && current.category === 'completed' && payload.shipGroupSeqId === order.shipGroupSeqId)
      if (order) {
        dispatch('updateCurrent', order)
        return
      }
    }
    emitter.emit('presentLoader');
    let resp, order = {} as  any;

    try {
      const params = {
        viewSize: 1,
        groupBy: 'picklistBinId',
        sort: 'orderDate asc',
        filters: {
          orderId: { value: payload.orderId },
          picklistItemStatusId: { value: '(PICKITEM_PICKED OR (PICKITEM_COMPLETED AND itemShippedDate: [NOW/DAY TO NOW/DAY+1DAY]))' },
          '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
          shipGroupSeqId: { value: payload.shipGroupSeqId },
          facilityId: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
          productStoreId: { value: this.state.user.currentEComStore.productStoreId }
        }
      }

      const orderQueryPayload = prepareOrderQuery(params)

      resp = await OrderService.findCompletedOrders(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.picklistBinId.matches > 0) {
        await this.dispatch('product/fetchProducts', { productIds: order.items.map((item: any) => item.productId) })

        const orderItem = resp.data.grouped.picklistBinId.groups[0].doclist.docs[0];
        order = {
          category: 'completed',
          customerId: orderItem.customerId,
          customerName: orderItem.customerName,
          orderId: orderItem.orderId,
          orderDate: orderItem.orderDate,
          orderName: orderItem.orderName,
          reservedDatetime: orderItem.reservedDatetime,
          groupValue: resp.data.grouped.picklistBinId.groups[0].groupValue,
          picklistBinId: orderItem.picklistBinId,
          items: removeKitComponents({items : resp.data.grouped.picklistBinId.groups[0].doclist.docs}),
          shipmentId: orderItem.shipmentId,
          shipGroupSeqId: orderItem.shipGroupSeqId,
          shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
          shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
          isGeneratingShippingLabel: false,
          isGeneratingPackingSlip: false
        }
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('No completed orders found', err)
    }

    await dispatch('fetchCompletedOrderAdditionalInformation', order);
    emitter.emit('dismissLoader');
  },

  async fetchShipGroupForOrder({ dispatch, state }) {
    const order = JSON.parse(JSON.stringify(state.current))

    // return if orderId is not found on order
    if(!order?.orderId) {
      return;
    }

    const params = {
      groupBy: 'shipGroupSeqId',
      filters: {
        'shipGroupSeqId': { value: '[* TO *]' },  // check to ignore all those records for which shipGroupSeqId is not present, as in case of kit comp we does not get shipGroupSeqId on some items
        '-shipGroupSeqId': { value: order.shipGroupSeqId },
        orderId: { value: order.orderId }
      },
      docType: 'ORDER'
    }

    const orderQueryPayload = prepareOrderQuery(params)

    let resp, total, shipGroups = [];
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

    // return if shipGroups are not found for order
    if (!shipGroups.length) {
      return;
    }

    shipGroups = shipGroups.map((shipGroup: any) => {
      const shipItem = shipGroup?.doclist?.docs[0]

      if(!shipItem) {
        return;
      }

      // In some case we are not having facilityTypeId in resp, resulting in undefined being pushed in the array
      // so checking for facilityTypeId before updating the array
      shipItem.facilityTypeId && facilityTypeIds.push(shipItem.facilityTypeId)

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
    await dispatch('fetchAdditionalShipGroupForOrder', { shipGroups });
  },

  async fetchCompletedOrderAdditionalInformation({ dispatch }, order) {
    let current = JSON.parse(JSON.stringify(order))

    try {
      // fetchShipments accepts Array parameters for picklistBinId and orderId
      const shipmentBatches = await OrderService.fetchShipments([current.picklistBinId], [current.orderId], this.state.user.currentFacility.facilityId)
      const shipments = shipmentBatches.flat();
      const shipmentIds = [...new Set(shipments.map((shipment: any) => shipment.shipmentId))] as Array<string>
      let shipmentPackages = [] as any;

      // Get packed shipmentIds
      if (shipmentIds.length) {
        try {
          const shipmentPackagesBatches = await UtilService.findShipmentPackages(shipmentIds)
          shipmentPackages = Object.values(shipmentPackagesBatches).flat();
        } catch (err) {
          current.hasMissingPackageInfo = true;
          logger.error('Failed to fetch shipment packages for orders', err)
        }
      }

      const orderShipments = shipments.filter((shipment: any) => current.orderId === shipment.primaryOrderId && shipment.picklistBinId === current.picklistBinId);
      if (!orderShipments || !orderShipments.length) {
        dispatch('updateCurrent', current)
        return
      }

      const currentShipmentPackages = orderShipments.reduce((currentShipmentPackages: any, shipment: any) => {
        currentShipmentPackages.push(...shipmentPackages.filter((shipmentPackage: any) => shipmentPackage.shipmentId === shipment.shipmentId));
        return currentShipmentPackages;
      }, []);

      // If there is any shipment package with missing tracking code, retry shipping label
      const missingLabelImage = this.state.util.productStoreShipmentMethCount > 0 ? currentShipmentPackages.some((shipmentPackage:any) => shipmentPackage.trackingCode === null || shipmentPackage.trackingCode === '') : false;

      current = {
        ...current,
        items: removeKitComponents({items: current.items}),
        shipments: orderShipments,
        trackingCode: currentShipmentPackages?.[0].trackingCode,
        missingLabelImage,
        shipmentPackages: currentShipmentPackages  // ShipmentPackages information is required when performing retryShippingLabel action
      }
      
    } catch(err) {
      current.hasMissingPackageInfo = true;
      logger.error('Something went wrong', err)
    }

    dispatch('updateCurrent', current)
  },

  async fetchInProgressOrderAdditionalInformation({ dispatch }, order) {
    let current = JSON.parse(JSON.stringify(order))

    const picklistBinIds: Array<string> = [current.picklistBinId];
    const orderIds: Array<string> = [current.orderId];

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

      const orderShipmentPackages = this.state.util.productStoreShipmentMethCount > 0 ? await OrderService.fetchShipmentPackages(orderShipmentIds) : [];

      // if for an order shipment information is not available then returning the same order information again
      if (!shipmentIdsForOrderAndPicklistBin[`${current.orderId}_${current.picklistBinId}`]) {
        // if there are no shipment for the order, there is some issue with the order
        if (picklistBinIds.includes(current.picklistBinId) && orderIds.includes(current.orderId)) {
          current = {
            ...current,
            hasMissingInfo: true,
          }
          return
        }
        return
      }

      current.items.map((item: any) => {
        // fetching shipmentItemInformation for the current order item and then assigning the shipmentItemSeqId to item
       //Added a check for shipmentItem.productId === orderItem.productId to identify the correct shipment item. In the case of a kit, the ShipmentItem will be created with the same orderItemSeqId for both the kit and its components.
        const shipment = itemInformationByOrder[item.orderId]?.find((shipmentItem: any) => shipmentItem.orderItemSeqId === item.orderItemSeqId && shipmentItem.productId === item.productId)

        if (shipment) {
          item.shipmentId = shipment.shipmentId
          item.shipmentItemSeqId = shipment.shipmentItemSeqId
        }

        item.selectedBox = shipmentPackagesByOrderAndPicklistBin[`${item.orderId}_${item.picklistBinId}`]?.find((shipmentPackage: any) => shipmentPackage.shipmentId === item.shipmentId)?.packageName
      })

      const orderItem = current.items[0];
      const carrierPartyIdsOnOrderShipment = [...new Set(orderShipmentIds.map((id: any) => carrierPartyIdsByShipment[id]?.map((carrierParty: any) => carrierParty.carrierPartyId)).flat())];

      const shipmentBoxTypeByCarrierParty = carrierPartyIdsOnOrderShipment.reduce((shipmentBoxType: any, carrierPartyId: any) => {
        if (shipmentBoxType[carrierPartyId]) {
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


      const currentShipmentPackages = shipmentPackagesByOrderAndPicklistBin[`${orderItem.orderId}_${orderItem.picklistBinId}`].reduce((currentShipmentPackages: any, shipment: any) => {
        currentShipmentPackages.push(...orderShipmentPackages.filter((shipmentPackage: any) => shipmentPackage.shipmentId === shipment.shipmentId));
        return currentShipmentPackages;
      }, []);

      // When the shipment method for product store is configured then only check for shipmentPackages otherwise we won't show missing label error button
      const missingLabelImage = this.state.util.productStoreShipmentMethCount > 0 ? currentShipmentPackages.length > 0 : false;

      current = {
        ...current,
        items: removeKitComponents({items: current.items}),
        shipmentIds: shipmentIdsForOrderAndPicklistBin[`${orderItem.orderId}_${orderItem.picklistBinId}`],
        shipmentPackages: shipmentPackages,
        carrierPartyIdsOnOrderShipment,
        shipmentBoxTypeByCarrierParty: shipmentBoxTypeByCarrierParty,
        missingLabelImage
      }

      this.dispatch('util/fetchShipmentBoxTypeDesc', [...new Set(Object.values(carrierShipmentBoxType).flat())])
    } catch (err) {
      current.hasMissingPackageInfo = true;
      logger.error('Something went wrong', err)
    }

    // updating the state with the updated orders information
    await dispatch('updateCurrent', current)
  },

  async fetchAdditionalShipGroupForOrder({ commit, state }, payload) {
    const order = JSON.parse(JSON.stringify(state.current))

    // return if orderId is not found on order
    if(!order?.orderId) {
      return;
    }

    const shipGroupSeqIds = payload.shipGroups.map((shipGroup: any) => shipGroup.shipGroupSeqId)
    const orderId = order.orderId

    const params = {
      groupBy: 'shipGroupSeqId',
      filters: {
        'shipGroupSeqId': { value: shipGroupSeqIds },
        '-fulfillmentStatus': { value: ['Rejected', 'Cancelled'] },
        orderId: { value: orderId }
      }
    }

    const orderQueryPayload = prepareOrderQuery(params)

    let resp, total, shipGroups: any = [];

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
      const reservedShipGroupForOrder = shipGroups.find((group: any) => shipGroup.shipGroupSeqId === group.doclist?.docs[0]?.shipGroupSeqId)

      const reservedShipGroup = reservedShipGroupForOrder?.groupValue ? reservedShipGroupForOrder.doclist.docs[0] : ''

      return reservedShipGroup ? {
        ...shipGroup,
        items: reservedShipGroupForOrder.doclist.docs,
        carrierPartyId: reservedShipGroup.carrierPartyId,
        shipmentId: reservedShipGroup.shipmentId,
        category: getOrderCategory(reservedShipGroupForOrder.doclist.docs[0])
      } : {
        ...shipGroup,
        category: getOrderCategory(shipGroup.items[0])
      }
    })

    const carrierPartyIds: Array<string> = [];
    const shipmentIds: Array<string> = [];

    if (total) {
      shipGroups.map((shipGroup: any) => {
        if (shipGroup.shipmentId) shipmentIds.push(shipGroup.shipmentId)
        if (shipGroup.carrierPartyId) carrierPartyIds.push(shipGroup.carrierPartyId)
      })
    }

    try {
      this.dispatch('util/fetchPartyInformation', carrierPartyIds)
      const shipmentTrackingCodes = await OrderService.fetchTrackingCodes(shipmentIds)

      shipGroups.find((shipGroup: any) => {
        const trackingCode = shipmentTrackingCodes.find((shipmentTrackingCode: any) => shipGroup.shipmentId === shipmentTrackingCode.shipmentId)?.trackingCode

        shipGroup.trackingCode = trackingCode;
      })
    } catch (err) {
      logger.error('Failed to fetch information for ship groups', err)
    }

    order['shipGroups'] = shipGroups

    commit(types.ORDER_CURRENT_UPDATED, order)

    return shipGroups;
  },

  // TODO clear current on logout
  async updateCurrent({ commit, dispatch }, order) {
    commit(types.ORDER_CURRENT_UPDATED, order)
    await dispatch('fetchShippingAddress');
    await dispatch('fetchShipGroupForOrder');
    await dispatch('fetchPaymentDetail');
    await dispatch('getShippingPhoneNumber');
  },
}

export default actions;