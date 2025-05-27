import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import emitter from '@/event-bus'
import { OrderService } from '@/services/OrderService'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import logger from '@/logger'
import { DateTime } from 'luxon';

const actions: ActionTree<OrderState, RootState> = {

  // get open orders
  async findOpenOrders ({ commit, state }) {
    emitter.emit('presentLoader');

    const openOrderQuery = JSON.parse(JSON.stringify(state.open.query))
    openOrderQuery.groupBy = "orderItemShipGroupIdentifier"
    const resp = await OrderService.findOpenOrders({ openOrderQuery });
    
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
    const inProgressQuery = JSON.parse(JSON.stringify(state.inProgress.query))

    if(!inProgressQuery.hideLoader) emitter.emit('presentLoader');
    let orders = [];

    inProgressQuery.statusId = "SHIPMENT_APPROVED"
    inProgressQuery.orderStatusId = "ORDER_APPROVED"
    const resp = await OrderService.findShipments(inProgressQuery);
    orders = (resp.orders || []).map((order: any) => ({
      ...order,
      category: 'in-progress',
      items: order.items.map((item: any) => {
        const packageName = order?.shipmentPackageRouteSegDetails.find(
            (shipmentPackageContent: any) =>
              shipmentPackageContent.shipmentItemSeqId === item.shipmentItemSeqId
        )?.packageName || null
        return {
          ...item,
          selectedBox: packageName,
          currentBox: packageName,
        };
      })
    }));
    
    const productIds = [...new Set(orders.flatMap((order:any) => order.items.map((item:any) => item.productId)))];
    const shipmentMethodTypeIds = [...new Set(orders.map((order:any) => order.shipmentMethodTypeId))];

    this.dispatch('product/fetchProducts', { productIds })
    this.dispatch('util/fetchShipmentMethodTypeDesc', shipmentMethodTypeIds);
    orders = await dispatch("fetchGiftCardActivationDetails", { isDetailsPage: false, currentOrders: orders})

    inProgressQuery.viewSize = orders?.length
    commit(types.ORDER_INPROGRESS_QUERY_UPDATED, { ...inProgressQuery })
    commit(types.ORDER_INPROGRESS_UPDATED, { orders, total: resp.total })

    emitter.emit('dismissLoader');
  },

  async findCompletedOrders ({ commit, dispatch, state }) {
    emitter.emit('presentLoader');
    let orders = [];

    const completedOrderQuery = JSON.parse(JSON.stringify(state.completed.query))
    completedOrderQuery.statusId = ['SHIPMENT_PACKED']
    completedOrderQuery.shippedDateFrom = DateTime.now().startOf('day').toMillis();
    const resp = await OrderService.findShipments(completedOrderQuery);
    orders = (resp.orders || []).map((order: any) => ({
      ...order,
      category: 'completed'
    }))
    
    const productIds = [...new Set(orders.flatMap((order:any) => order.items.map((item:any) => item.productId)))];
    const shipmentMethodTypeIds = [...new Set(orders.map((order:any) => order.shipmentMethodTypeId))];

    this.dispatch('product/fetchProducts', { productIds })
    this.dispatch('util/fetchShipmentMethodTypeDesc', shipmentMethodTypeIds);
    orders = await dispatch("fetchGiftCardActivationDetails", { isDetailsPage: false, currentOrders: orders});

    completedOrderQuery.viewSize = orders?.length
    commit(types.ORDER_COMPLETED_QUERY_UPDATED, { ...completedOrderQuery })
    commit(types.ORDER_COMPLETED_UPDATED, {list: orders, total: resp.total})

    emitter.emit('dismissLoader');
  },

  async getOpenOrder({ dispatch, state }, payload) {
    emitter.emit('presentLoader');

    const openOrderQuery = JSON.parse(JSON.stringify(state.open.query))
    openOrderQuery.orderId = payload.orderId;
    openOrderQuery.shipGroupSeqId = payload.shipGroupSeqId;
    openOrderQuery.viewSize = 1;
    
    const resp = await OrderService.findOpenOrders({ openOrderQuery });
    const order = resp?.orders[0];

    const productIds = order.items.map((item: any) => item.productId)
    this.dispatch('product/fetchProducts', { productIds })
    this.dispatch('util/fetchShipmentMethodTypeDesc', [order.shipmentMethodTypeId]);
    
    dispatch('updateCurrent', order)
    emitter.emit('dismissLoader');
  },

  async getInProgressOrder ({ dispatch, state }, payload) {
    emitter.emit('presentLoader');
    let order = {} as any;

    const inProgressQuery = JSON.parse(JSON.stringify(state.inProgress.query))
    inProgressQuery.orderId = payload.orderId
    inProgressQuery.shipmentId = payload.shipmentId
    inProgressQuery.statusId = "SHIPMENT_APPROVED"

    const resp = await OrderService.findShipments(inProgressQuery);

    order = resp.orders[0];
    order.category = 'in-progress'

    order = {
      ...order,
      items: order.items.map((item: any) => {
        const packageName = order?.shipmentPackageRouteSegDetails.find(
            (shipmentPackageContent: any) =>
              shipmentPackageContent.shipmentItemSeqId === item.shipmentItemSeqId
        )?.packageName || null
        return {
          ...item,
          selectedBox: packageName,
          currentBox: packageName,
        };
      })
    }

    const productIds = order.items.map((item:any) => item.productId)
    this.dispatch('product/fetchProducts', { productIds })
    this.dispatch('util/fetchShipmentMethodTypeDesc', [order.shipmentMethodTypeId]);
    order = await dispatch("fetchGiftCardActivationDetails", { isDetailsPage: true, currentOrders: [order]});

    await dispatch('updateCurrent', order)
    emitter.emit('dismissLoader');
  },

  async getCompletedOrder({ dispatch, state }, payload) {
    emitter.emit('presentLoader');
    let order = {} as  any;

    const completedOrderQuery = JSON.parse(JSON.stringify(state.completed.query))
    completedOrderQuery.orderId =  payload.orderId
    completedOrderQuery.shipmentId =  payload.shipmentId
    completedOrderQuery.statusId = ['SHIPMENT_PACKED']
    completedOrderQuery.shippedDateFrom = DateTime.now().startOf('day').toMillis();

    const resp = await OrderService.findShipments(completedOrderQuery);
    order = resp?.orders[0]
    order.category = 'completed'

    const productIds = order.items.map((item:any) => item.productId)
    this.dispatch('product/fetchProducts', { productIds })
    this.dispatch('util/fetchShipmentMethodTypeDesc', [order.shipmentMethodTypeId]);
    order = await dispatch("fetchGiftCardActivationDetails", { isDetailsPage: true, currentOrders: [order]});
    await dispatch('updateCurrent', order)
    emitter.emit('dismissLoader');
  },

  async fetchOtherShipments ({ commit, state }) {
    let otherShipments = [];
    const currentOrder = JSON.parse(JSON.stringify(state.current))
    const currentShipmentId = currentOrder.shipmentId;
    const shipGroupSeqId = currentOrder.primaryShipGroupSeqId ? currentOrder.primaryShipGroupSeqId : currentOrder.shipGroupSeqId

    //fetching open orders
    const openOrderQuery = JSON.parse(JSON.stringify(state.open.query))
    openOrderQuery.excludeFacilityFilter = true
    openOrderQuery.groupBy = "shipGroupSeqId"
    openOrderQuery.orderId = currentOrder.orderId
    openOrderQuery.viewIndex = 0
    openOrderQuery.viewSize = process.env.VUE_APP_VIEW_SIZE
    
    //filter to exclue current ship group
    openOrderQuery.shipGroupFilter =  {'-shipGroupSeqId': { value: shipGroupSeqId }}  
    const openOrderResp = await OrderService.findOpenOrders({ openOrderQuery });
    if (openOrderResp.orders && openOrderResp.orders.length) {
      otherShipments = openOrderResp.orders
    }

    //Fetching in progress and completed shipments
    const shipmentQuery = {} as any;
    shipmentQuery.viewSize = 50
    shipmentQuery.statusId = ["SHIPMENT_APPROVED", "SHIPMENT_PACKED", "SHIPMENT_SHIPPED"]
    shipmentQuery.orderId = currentOrder.orderId;
    shipmentQuery.excludeFacilityFilter = true
    const resp = await OrderService.findShipments(shipmentQuery);
    
    if (resp.orders && resp.orders.length) {
      const filteredShipments = resp.orders.filter((order: any) => order.shipmentId !== currentShipmentId)
      otherShipments = [...otherShipments, ...filteredShipments]
    }
    
    //fetching/preparing pending allocation items
    try {
      const resp = await OrderService.fetchOrderItems({
        orderId: currentOrder.orderId,
        shipGroupSeqId,
        shipGroupSeqId_op: "equals",
        shipGroupSeqId_not: "Y",
        pageSize: 50,
        fieldsToSelect: ["orderId", "orderItemseqId", "shipGroupSeqId", "productId"]
      })
      if (!hasError(resp)) {
        const allocatedOrderItemSeqIds = [
          ...new Set(
            otherShipments.flatMap((shipment:any) => shipment.items.map((item:any) => item.orderItemSeqId))
          )
        ];

        const pendingAllocationItems = resp.data.filter((item:any) =>  item.shipGroupSeqId !== shipGroupSeqId && !allocatedOrderItemSeqIds.includes(item.orderItemSeqId));
        if (pendingAllocationItems.length) {
          //fetching facility details
          let facilityInfo = {} as any
          const facilityIds = [
            ...new Set(
              currentOrder.shipGroups
                .filter((shipGroup: any) => shipGroup.shipGroupSeqId !== shipGroupSeqId)
                .map((shipGroup: any) => shipGroup.facilityId)
            )
          ];
          if (facilityIds.length) {
            const facilityResp = await UtilService.fetchFacilities({
              facilityId: facilityIds,
              facilityId_op: "in",
              pageSize: 10,
            })
            if (!hasError(facilityResp)) {
              facilityInfo = facilityResp.data.reduce((facilityDetail: Record<string, any>, facility: any) => {
                facilityDetail[facility.facilityId] = facility;
                return facilityDetail;
              }, {});
            }
          }

          const pendingItemsByShipGroup = pendingAllocationItems.reduce((shipGroupDetail:any, item:any) => {
            const itemShipGroup = currentOrder.shipGroups.find((shipGroup: any) => shipGroup.shipGroupSeqId === item.shipGroupSeqId);
            const facility = facilityInfo[itemShipGroup.facilityId];
            const groupId = item.shipGroupSeqId;
            if (!shipGroupDetail[groupId]) {
              shipGroupDetail[groupId] = {
                ...item,
                ...itemShipGroup,
                facilityName: facility.facilityName,
                facilityTypeId: facility.facilityTypeId,
                items: []
              };
            }
            shipGroupDetail[groupId].items.push(item);
            return shipGroupDetail;
          }, {});
          otherShipments = [...otherShipments, ...Object.values(pendingItemsByShipGroup)]
        }
      }
    } catch(err) {
      logger.error("Failed to fetch ship group info for order", err)
    }

    if (otherShipments.length) {
      const productIds = [...new Set(otherShipments.flatMap((shipment: any) => shipment.items?.map((item: any) => item.productId) || []))];
      this.dispatch('product/fetchProducts', { productIds })
    }

    const facilityTypeIds = otherShipments.map((shipment: any) => shipment.facilityTypeId)
    this.dispatch('util/fetchFacilityTypeInformation', facilityTypeIds)

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
    let currentOrder = JSON.parse(JSON.stringify(state.current));
    const completedOrders = JSON.parse(JSON.stringify(state.completed.list));
    const inProgressOrders = JSON.parse(JSON.stringify(state.inProgress.list));

    try {
      const params = {
        shipmentId: payload.shipmentId,
        carrierServiceStatusId: "SHRSCS_VOIDED",
        carrierServiceStatusId_op: "equals",
        carrierServiceStatusId_not: "Y"
      }
      const resp = await OrderService.fetchShipmentPackageRouteSegDetails(params) as any
      if (!hasError(resp)) {
        const shipmentPackageRouteSegDetails = resp.data
        const missingLabelImage = this.state.util.productStoreShipmentMethCount > 0 ? shipmentPackageRouteSegDetails.some((shipmentPackageRouteSeg:any) => shipmentPackageRouteSeg.trackingCode === undefined || shipmentPackageRouteSeg.trackingCode === null || shipmentPackageRouteSeg.trackingCode === '') : false;

        const updateShipmentPackages = (order:any) => {
          order.shipmentPackageRouteSegDetails = shipmentPackageRouteSegDetails
          order.labelImageUrl = shipmentPackageRouteSegDetails[0]?.labelImageUrl
          order.carrierPartyId = shipmentPackageRouteSegDetails[0]?.carrierPartyId
          order.shipmentMethodTypeId = shipmentPackageRouteSegDetails[0]?.shipmentMethodTypeId
          order.trackingCode = shipmentPackageRouteSegDetails[0]?.trackingCode
          order.isTrackingRequired = shipmentPackageRouteSegDetails[0]?.isTrackingRequired
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
            currentOrder = order
            commit(types.ORDER_COMPLETED_UPDATED, { list: completedOrders, total: state.completed.total });
          }
        }
        if (inProgressOrders && inProgressOrders.length > 0) {
          const order = inProgressOrders.find((inProgressOrder:any) => inProgressOrder.shipmentId === payload.shipmentId);
          if (order) {
            updateShipmentPackages(order);
            currentOrder = order
            commit(types.ORDER_INPROGRESS_UPDATED, { orders: inProgressOrders, total: state.inProgress.total });
          }
        }
      } else {
        throw resp.data;
      }
      
    } catch(err) {
      logger.error('Failed to fetch shipment packages.', err)
    }
    return currentOrder
  },

  async fetchOrderDetail ({ commit, state }) {
    let order = JSON.parse(JSON.stringify(state.current))

    try {
      const resp = await OrderService.fetchOrderDetail(order.orderId);
      if (!hasError(resp)) {
        

        order = {
          ...order,
          shipGroups: resp.data.shipGroups,
          paymentPreferences: resp.data.paymentPreferences,
          adjustments: resp.data.adjustments,
          attributes: resp.data.attributes,
          shippingAddress: resp.data.contactMechs?.find((contactMech:any) => contactMech.contactMechPurposeTypeId === "SHIPPING_LOCATION")?.postalAddress,
          telecomNumber: resp.data.contactMechs?.find((contactMech:any) => contactMech.contactMechPurposeTypeId === "PHONE_SHIPPING")?.telecomNumber,
        }  
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

  async updateOpenOrders({ commit }, payload) {
    commit(types.ORDER_OPEN_UPDATED, {list: payload?.orders, total: payload?.total})
  },
  async updateOpenQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
    await dispatch('findOpenOrders');
  },
  async updateOpenOrderQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_OPEN_QUERY_UPDATED, payload)
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
  async clearCompletedOrders({ commit }) {
    commit(types.ORDER_COMPLETED_CLEARED)
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
  },
  async clearOrders ({ commit }) {
    commit(types.ORDER_INPROGRESS_CLEARED)
    commit(types.ORDER_OPEN_CLEARED)
    commit(types.ORDER_COMPLETED_CLEARED)
    commit(types.ORDER_CURRENT_UPDATED, {})
  }
}

export default actions;