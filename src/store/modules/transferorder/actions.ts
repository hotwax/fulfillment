import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import logger from '@/logger'
import { translate } from '@hotwax/dxp-components'
import { showToast } from "@/utils";

const actions: ActionTree<TransferOrderState, RootState> = {

  async fetchTransferOrders ({ commit, state }, params = {}) {
  let resp;
  let orders = [];
  let orderList = [];
  let total = 0;

  try {
    resp = await TransferOrderService.fetchTransferOrders(params);
    if (!hasError(resp) && resp.data.ordersCount > 0) {
      total = resp.data.ordersCount;
      orders = resp.data.orders;
      orderList = JSON.parse(JSON.stringify(state.transferOrder.list)).concat(orders);
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('No transfer orders found', err);
  }
  commit(types.ORDER_TRANSFER_UPDATED, { list: orderList.length > 0 ? orderList : orders, total });
  return resp;
  }, 

  async fetchTransferOrderDetail({ commit }, payload) {
  let orderDetail = {} as any;
  let resp, resp2;

  try {
    // Fetch main transfer order details
    resp = await TransferOrderService.fetchTransferOrderDetail(payload.orderId);

    if (!hasError(resp)) {
      const baseOrder = resp.data.order || {};

      // Start with shallow copy of base order
      orderDetail = { ...baseOrder };

      // Fetch additional shipment data
      resp2 = await TransferOrderService.fetchShippedTransferOrders({
        orderId: payload.orderId,
        shipmentStatusId: "SHIPMENT_SHIPPED",
      });

      if (!hasError(resp2)) {
        const shipmentData = resp2.data || {};

        // Merge all shipment fields into orderDetail (avoid overwriting existing fields unless necessary)
        orderDetail = {
          ...orderDetail,
          ...shipmentData,
          shipments: shipmentData.shipments || [],
        };
      }

      // Fetch products & status description
      const productIds = [...new Set((orderDetail.items || []).map((item: any) => item.productId))];
      const batchSize = 250;
      const productIdBatches = [];

      while (productIds.length) {
        productIdBatches.push(productIds.splice(0, batchSize));
      }

      try {
        await Promise.all([
          ...productIdBatches.map(batch =>
            this.dispatch('product/fetchProducts', { productIds: batch })
          ),
          this.dispatch('util/fetchStatusDesc', [orderDetail.statusId]),
        ]);
        // Commit the full enriched orderDetail to the store
        commit(types.ORDER_CURRENT_UPDATED, orderDetail);
      } catch (err: any) {
        logger.error("Error fetching product details or status description", err);
        return Promise.reject(new Error(err));
      }
    } else {
      throw resp.data;
    }
  } catch (err: any) {
    logger.error("error", err);
    return Promise.reject(new Error(err));
  }
},

  async createOutboundTransferShipment({ commit }, payload) {
    let shipmentId;
    
    try {
      let eligibleItems = payload.items.filter((item: any) => item.pickedQuantity > 0)
      eligibleItems = eligibleItems.map((item:any) => ({
        orderItemSeqId: item.orderItemSeqId, //This is needed to map shipment item with order item correctly if multiple order items for the same product are there in the TO.
        productId: item.productId,
        quantity: parseInt(item.pickedQuantity), // Using parseInt to convert to an integer
        shipGroupSeqId: item.shipGroupSeqId
      }));  
      const params = {
        "payload":{
            "orderId": payload.orderId,
            "items": eligibleItems
        }
      }
        const resp = await TransferOrderService.createOutboundTransferShipment(params)
     if (!hasError(resp)) {
      shipmentId = resp.data.shipmentId;
      } else {
        throw resp.data;
      }
    } catch(error){
      logger.error(error);
      showToast(translate('Failed to create shipment'));
    }
    return shipmentId;
  },

  async fetchTransferShipmentDetail({ commit }, payload) {
  try {
    const shipmentResponse = await TransferOrderService.fetchTransferShipmentDetails({ shipmentId: payload.shipmentId });

    const shipments = shipmentResponse.data?.shipments || [];
    if (shipments.length > 0) {
      const shipmentData = shipments[0];
      const shipmentItems = shipmentData.items || [];

      const shipment = {
        ...shipmentData,
        trackingCode: shipmentData.trackingCode || null, // If not present, set to null
        shipmentPackagesWithMissingLabel: [],
        shipmentPackages: [{
          shipmentId: shipmentData.shipmentId,
          labelPdfUrl: null, //todo
        }],
        isTrackingRequired: shipmentData.carrierPartyId === 'FEDEX_TEST',
        items: shipmentItems.map((item: any) => ({
          ...item,
          pickedQuantity: item.quantity,
        })),
        totalQuantityPicked: shipmentItems.reduce((acc: number, curr: any) => acc + curr.quantity, 0)
      };

      commit(types.ORDER_CURRENT_SHIPMENT_UPDATED, shipment);

      const productIds = [...new Set(shipmentItems.map((item: any) => item.productId))];
      const batchSize = 250;
      const productIdBatches = [];

      while (productIds.length) {
        productIdBatches.push(productIds.splice(0, batchSize));
      }

      await Promise.all([
        ...productIdBatches.map((productIds) => this.dispatch('product/fetchProducts', { productIds })),
        this.dispatch('util/fetchPartyInformation', [shipmentData.carrierPartyId]),
        this.dispatch('util/fetchShipmentMethodTypeDesc', [shipmentData.shipmentMethodTypeId])
      ]);
    }
  } catch (err: any) {
    logger.error("error", err);
  }
  },

  async updateCurrentTransferOrder({ commit }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, payload)
  },
  async updateTransferOrderIndex({ commit }, payload) {
    commit(types.ORDER_TRANSFER_QUERY_UPDATED, payload)
  },
  async updateTransferOrderQuery({ commit, dispatch }, payload) {
    commit(types.ORDER_TRANSFER_QUERY_UPDATED, payload)
    await dispatch('findTransferOrders');
  },
  async clearTransferOrdersList({ commit }) {
    commit(types.ORDER_TRANSFER_LIST_CLEARED)
  },
  async clearTransferOrderFilters({ commit }) {
    commit(types.ORDER_TRANSFER_QUERY_CLEARED)
  },
  async clearCurrentTransferOrder({ commit }) {
    commit(types.ORDER_CURRENT_CLEARED)
  },
  async clearCurrentTransferShipment({ commit }) {
    commit(types.ORDER_CURRENT_SHIPMENT_CLEARED)
  }
}

export default actions;