import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './MaargOrderState'
import emitter from '@/event-bus'
import { MaargOrderService } from '@/services/MaargOrderService'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import logger from '@/logger'

const actions: ActionTree<OrderState, RootState> = {

  // get open orders
  async findOpenOrders ({ commit, state }) {
    emitter.emit('presentLoader');

    const openOrderQuery = JSON.parse(JSON.stringify(state.open.query))
    const resp = await MaargOrderService.findOpenOrders({ openOrderQuery });
    
    const productIds = [
      ...new Set(resp.orders.flatMap((order:any) => order.items.map((item:any) => item.productId)))
    ];
    this.dispatch('product/fetchProducts', { productIds })

    openOrderQuery.viewSize = resp?.orders?.length
    commit(types.ORDER_OPEN_QUERY_UPDATED, { ...openOrderQuery })
    commit(types.ORDER_OPEN_UPDATED, {list: resp?.orders, total: resp?.total})

    emitter.emit('dismissLoader');
  },

  async findInProgressOrders ({ commit, dispatch, state }) {
    emitter.emit('presentLoader');

    const inProgressQuery = JSON.parse(JSON.stringify(state.inProgress.query))
    inProgressQuery.statusId = "SHIPMENT_APPROVED"
    const resp = await MaargOrderService.findShipments(inProgressQuery);
    
    const productIds = [
      ...new Set(resp.orders.flatMap((order:any) => order.items.map((item:any) => item.productId)))
    ];
    this.dispatch('product/fetchProducts', { productIds })
    const orders = await dispatch("fetchGiftCardActivationDetails", { isDetailsPage: false, currentOrders: resp.orders})
    inProgressQuery.viewSize = resp.total

    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, { ...inProgressQuery })
    commit(types.ORDER_INPROGRESS_UPDATED, { orders, total: resp.total })

    emitter.emit('dismissLoader');
  },

  async findCompletedOrders ({ commit, dispatch, state }) {
    emitter.emit('presentLoader');
    let orders = [];

    const completedOrderQuery = JSON.parse(JSON.stringify(state.completed.query))
    completedOrderQuery.statusId = ['SHIPMENT_PACKED', 'SHIPMENT_SHIPPED']
    const resp = await MaargOrderService.findShipments(completedOrderQuery);
    
    const productIds = [
      ...new Set(resp.orders.flatMap((order:any) => order.items.map((item:any) => item.productId)))
    ];
    await this.dispatch('product/fetchProducts', { productIds })
    orders = await dispatch("fetchGiftCardActivationDetails", { isDetailsPage: false, currentOrders: resp.orders});
    completedOrderQuery.viewSize = resp.total

    commit(types.ORDER_COMPLETED_QUERY_UPDATED, { ...completedOrderQuery })
    commit(types.ORDER_COMPLETED_UPDATED, {list: orders, total: resp.total})

    emitter.emit('dismissLoader');
  },

  async getOpenOrder({ dispatch, state }, payload) {
    const current = state.current as any
    if (current.orderId === payload.orderId && current.category === 'open') {
      return
    }

    const orders = JSON.parse(JSON.stringify(state.open.list)) as Array<any>
    if (orders.length) {
      const order = orders.find((order: any) => order.orderId === payload.orderId && current.category === 'open')
      if (order) {
        dispatch('updateCurrent', order)
        return
      }
    }

    emitter.emit('presentLoader');

    const openOrderQuery = JSON.parse(JSON.stringify(state.open.query))
    openOrderQuery.orderId = payload.orderId;
    openOrderQuery.viewSize = 1;
    
    const resp = await MaargOrderService.findOpenOrders({ openOrderQuery });
    const order = resp?.orders[0];

    const productIds = order.items.map((item: any) => item.productId)
    this.dispatch('product/fetchProducts', { productIds })
    
    dispatch('updateCurrent', order)
    emitter.emit('dismissLoader');
  },

  async getInProgressOrder ({ dispatch, state }, payload) {
    // if order is modified, we refetch it instead of returning from the state
    if (!payload.isModified) {
      const current = state.current as any
      if (current.orderId === payload.orderId && current.category === 'in-progress' && current.shipmentId === payload.shipmentId) {
        return
      }

      const orders = JSON.parse(JSON.stringify(state.inProgress.list)) as Array<any>
      if (orders.length) {
        const order = orders.find((order: any) => order.orderId === payload.orderId && current.category === 'in-progress' && payload.shipmentId === order.shipmentId)
        if (order) {
          dispatch('updateCurrent', order)
          return
        }
      }
    }
    emitter.emit('presentLoader');
    
    let order = {} as any;


    const inProgressQuery = JSON.parse(JSON.stringify(state.inProgress.query))
    inProgressQuery.orderId = payload.orderId
    inProgressQuery.shipmentId = payload.shipmentId
    inProgressQuery.statusId = "SHIPMENT_APPROVED"

    const resp = await MaargOrderService.findShipments(inProgressQuery);

    order = resp.orders[0];
    const productIds = order.items.map((item:any) => item.productId)
    this.dispatch('product/fetchProducts', { productIds })
    order = await dispatch("fetchGiftCardActivationDetails", { isDetailsPage: true, currentOrders: [order]});

    await dispatch('updateCurrent', order)
    emitter.emit('dismissLoader');
  },

  async getCompletedOrder({ dispatch, state }, payload) {
    const current = state.current as any
    if (current.orderId === payload.orderId && current.category === 'completed' && current.shipmentId === payload.shipmentId) {
      return
    }

    const orders = JSON.parse(JSON.stringify(state.completed.list)) as Array<any>
    if (orders.length) {
      const order = orders.find((order: any) => order.orderId === payload.orderId && current.category === 'completed' && payload.shipmentId === order.shipmentId)
      if (order) {
        dispatch('updateCurrent', order)
        return
      }
    }
    emitter.emit('presentLoader');
    let order = {} as  any;

    const completedOrderQuery = JSON.parse(JSON.stringify(state.completed.query))
    completedOrderQuery.orderId =  payload.orderId
    completedOrderQuery.shipmentId =  payload.shipmentId
    completedOrderQuery.statusId = ['SHIPMENT_PACKED', 'SHIPMENT_SHIPPED']
    
    const resp = await MaargOrderService.findShipments(completedOrderQuery);
    order = resp?.orders[0]

    const productIds = order.items.map((item:any) => item.productId)
    this.dispatch('product/fetchProducts', { productIds })
    order = await dispatch("fetchGiftCardActivationDetails", { isDetailsPage: true, currentOrders: [order]});
    await dispatch('updateCurrent', order)
    emitter.emit('dismissLoader');
  },

  async fetchOtherShipments ({ commit, state }, payload = {}) {
    let otherShipments = [];
    const currentShipmentId = payload.shipmentId;
    const currentOrder = JSON.parse(JSON.stringify(state.current))

    //fetching open orders
    const openOrderQuery = JSON.parse(JSON.stringify(state.open.query))
    openOrderQuery.groupBy = "shipGroupSeqId"
    
    //filter to exclue current ship group
    if (!currentShipmentId) {
      openOrderQuery.shipGroupFilter =  {'-shipGroupSeqId': { value: state.current.shipGroupSeqId }}  
    }
    const openOrderResp = await MaargOrderService.findOpenOrders({ openOrderQuery });
    if (openOrderResp.orders && openOrderResp.orders.length) {
      otherShipments = openOrderResp.orders
    }

    //Fetching in progress and completed shipments
    const shipmentQuery = {} as any;
    shipmentQuery.viewSize = 50
    shipmentQuery.statusId = ["SHIPMENT_APPROVED", "SHIPMENT_PACKED", "SHIPMENT_SHIPPED"]
    if (currentShipmentId) {
      shipmentQuery.shipmentId = currentShipmentId;
      shipmentQuery.shipmentId_op = "equal";
      shipmentQuery.shipmentId_not = "Y";
    }
    const resp = await MaargOrderService.findShipments(shipmentQuery);
    if (resp.orders && resp.orders.length) {
      otherShipments = [...otherShipments, resp.orders]
    }
    if (otherShipments.length) {
      const productIds = [
        ...new Set(otherShipments.flatMap((shipment:any) => shipment.items.map((item:any) => item.productId)))
      ];
      this.dispatch('product/fetchProducts', { productIds })
    }
    
    currentOrder.otherShipGroups = otherShipments
    commit(types.ORDER_CURRENT_UPDATED, currentOrder)
  },

  async fetchGiftCardActivationDetails({ commit, state }, { isDetailsPage, currentOrders }) {
    const orders = JSON.parse(JSON.stringify(currentOrders));
    const orderIds = [] as any;
    let giftCardActivations = [] as any;

    if(isDetailsPage) {
      orderIds.push(orders[0].orderId);
    } else {
      orders.map((order: any) => {
        order.items.map((item: any) => {
          if(item.productTypeId === 'GIFT_CARD' && !orderIds.includes(item.orderId)) {
            orderIds.push(item.orderId);
          }
        })
      })
    }

    if(!orderIds.length) return orders;

    try {
      const resp = await UtilService.fetchGiftCardFulfillmentInfo({
        orderId: orderIds,
        orderId_op: "in",
        fieldsToSelect: ["amount", "cardNumber", "fulfillmentDate", "orderId", "orderItemSeqId"],
        pageSize: 250
      })

      if(!hasError(resp)) {
        giftCardActivations = resp.data
      } else {
        throw resp.data
      }
    } catch(error) {
      logger.error(error)
    }

    if(giftCardActivations.length) {
      if(isDetailsPage) {
        orders[0].items.map((item: any) => {
          const activationRecord = giftCardActivations.find((card: any) => card.orderId === item.orderId && card.orderItemSeqId === item.orderItemSeqId)
          if(activationRecord?.cardNumber) {
            item.isGCActivated = true;
            item.gcInfo = activationRecord
          }
        })
      } else {
        orders.map((order: any) => {
          order.items.map((item: any) => {
            const activationRecord = giftCardActivations.find((card: any) => card.orderId === item.orderId && card.orderItemSeqId === item.orderItemSeqId)
            if(activationRecord?.cardNumber) {
              item.isGCActivated = true;
              item.gcInfo = activationRecord
            }
          })
        })
      }
    }

    return isDetailsPage ? orders[0] : orders
  },

  async updateShipmentPackageDetail ({ commit, state }, payload) {
    const currentOrder = JSON.parse(JSON.stringify(state.current));
    const completedOrders = JSON.parse(JSON.stringify(state.completed.list));
    const inProgressOrders = JSON.parse(JSON.stringify(state.inProgress.list));

    try {
      
      const resp = MaargOrderService.fetchShipmentPackageRouteSegDetails(payload.shipmentId) as any
      if (!hasError(resp)) {
        const shipmentPackageRouteSegDetails = resp.data
        const missingLabelImage = this.state.util.productStoreShipmentMethCount > 0 ? shipmentPackageRouteSegDetails.some((shipmentPackageRouteSeg:any) => shipmentPackageRouteSeg.trackingCode === null || shipmentPackageRouteSeg.trackingCode === '') : false;

        const updateShipmentPackages = (order:any) => {
          order.shipmentPackageRouteSegDetails = shipmentPackageRouteSegDetails
          order.trackingCode = shipmentPackageRouteSegDetails[0]?.trackingCode
          order.missingLabelImage = missingLabelImage
        };
    
        if (currentOrder && currentOrder.shipmentId === payload.shipmentId) {
          updateShipmentPackages(currentOrder);
          commit(types.ORDER_CURRENT_UPDATED, currentOrder);
        }
    
        if (completedOrders && completedOrders.length > 0) {
          const order = completedOrders.find((completedOrder:any) => completedOrder.shipmentId === payload.shipmentId);
          if (order) {
            updateShipmentPackages(order);
            commit(types.ORDER_COMPLETED_UPDATED, { list: completedOrders, total: state.completed.total });
          }
        }
        if (inProgressOrders && inProgressOrders.length > 0) {
          const order = inProgressOrders.find((inProgressOrder:any) => inProgressOrder.shipmentId === payload.shipmentId);
          if (order) {
            updateShipmentPackages(order);
            commit(types.ORDER_INPROGRESS_UPDATED, { orders: inProgressOrders, total: state.inProgress.total });
          }
        }
      } else {
        throw resp.data;
      }
      
    } catch(err) {
      logger.error('Failed to fetch shipment packages.', err)
    }
  },

  async fetchOrderDetail ({ commit, state }) {
    let order = JSON.parse(JSON.stringify(state.current))

    try {
      const resp = await MaargOrderService.fetchOrderDetail(order.orderId);
      if (!hasError(resp)) {
        order = {...order, ...resp.data}  
        if (order.paymentPreferences.length > 0) {
          const paymentMethodTypeIds = order?.paymentPreferences.map((orderPaymentPreference: any) => orderPaymentPreference.paymentMethodTypeId);
          if (paymentMethodTypeIds.length > 0) {
            this.dispatch('util/fetchPaymentMethodTypeDesc', paymentMethodTypeIds);
          }
          
          const statusIds = order?.paymentPreferences.map((orderPaymentPreference: any) => orderPaymentPreference.statusId);
          if (statusIds.length > 0) {
            this.dispatch('util/fetchStatusDesc', statusIds);
          }
        }

      }
    } catch (err: any) {
      logger.error("Error in fetching order detail for current order", err);
    }
    commit(types.ORDER_CURRENT_UPDATED,  order)
  },

  async updateOpenQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
    await dispatch('findOpenOrders');
  },
  async clearOpenOrders({ commit }) {
    commit(types.ORDER_OPEN_CLEARED)
  },
  
  async updateInProgressQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, payload)
    await dispatch('findInProgressOrders');
  },
  async clearInProgressOrders({ commit }) {
    commit(types.ORDER_INPROGRESS_CLEARED)
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
  async updateCompletedQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_COMPLETED_QUERY_UPDATED, payload)
    await dispatch('findCompletedOrders');
  },
  async updateInProgressIndex({ commit, dispatch }, payload) {
    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, payload)
  },

  async updateCompletedOrderIndex({ commit }, payload) {
    commit(types.ORDER_COMPLETED_QUERY_UPDATED, payload)
  },

  async updateOpenOrderIndex({ commit }, payload) {
    commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
  },
  // TODO clear current on logout
  async updateCurrent({ commit, dispatch }, order) {
    commit(types.ORDER_CURRENT_UPDATED, order)
    await dispatch('fetchOrderDetail');
    await dispatch('fetchOtherShipments');
    /*await dispatch('fetchShippingAddress');
    await dispatch('fetchShipGroupForOrder');
    await dispatch('fetchPaymentDetail');
    await dispatch('getShippingPhoneNumber');*/
  }
}

export default actions;