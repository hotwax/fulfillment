import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import logger from '@/logger'
import store from "@/store";
import { translate } from '@hotwax/dxp-components'
import { showToast } from "@/utils";
import { getCurrentFacilityId } from '@/utils'

const actions: ActionTree<TransferOrderState, RootState> = {

  async findTransferOrders({ commit, state }, payload = {}) {
    let resp;
    const transferOrderQuery = JSON.parse(JSON.stringify(state.transferOrder.query))

    const params: any = {
      orderStatusId: transferOrderQuery.orderStatusId ?? "ORDER_APPROVED",
      itemStatusId: "ITEM_PENDING_FULFILL",
      originFacilityId: getCurrentFacilityId(),
      limit: transferOrderQuery.viewSize,
      pageIndex: transferOrderQuery.viewIndex
    };

    // If searching, add queryString
    if (transferOrderQuery.queryString) {
      params.orderName = transferOrderQuery.queryString;
    }

    let orders = [];
    let total = 0;

    try {
      resp = await TransferOrderService.fetchTransferOrders(params);
      if (!hasError(resp) && resp.data.ordersCount > 0) {
        total = resp.data.ordersCount;
        if (transferOrderQuery.viewIndex > 0) {
          orders = state.transferOrder.list.concat(resp.data.orders);
        } else {
          orders = resp.data.orders;
        }
      } else {
        throw resp.data;
      }
    } catch (err) {
      logger.error('No transfer orders found', err);
    }

    commit(types.ORDER_TRANSFER_QUERY_UPDATED, { ...transferOrderQuery });
    commit(types.ORDER_TRANSFER_UPDATED, { list: orders, total });

    return resp;
  },

  async fetchTransferOrderDetail({ commit }, payload) {
    let orderDetail = {} as any;
    let orderResp, shipmentResp;

    try {
      // Fetch main transfer order details
      orderResp = await TransferOrderService.fetchTransferOrderDetail(payload.orderId);

      if (!hasError(orderResp)) {
        orderDetail = orderResp.data.order || {};

        // Fetch additional shipment data
        shipmentResp = await TransferOrderService.fetchShippedTransferShipments({ orderId: payload.orderId, shipmentStatusId: "SHIPMENT_SHIPPED" });

        if (!hasError(shipmentResp)) {
          const shipmentData = shipmentResp.data || {};
          // Merge order and shipment data fields into orderDetail
          orderDetail = {
            ...orderDetail,
            shipments: shipmentData.shipments || [],
          };
        }
        if (orderDetail.items && Array.isArray(orderDetail.items)) {
          orderDetail.items = orderDetail.items.map((item: any) => ({
            ...item,
            orderedQuantity: item.quantity,
            shippedQuantity: item.totalIssuedQuantity || 0,
            pickedQuantity: 0
          }));
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
        throw orderResp.data;
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
      eligibleItems = eligibleItems.map((item: any) => ({
        orderItemSeqId: item.orderItemSeqId, //This is needed to map shipment item with order item correctly if multiple order items for the same product are there in the TO.
        productId: item.productId,
        quantity: parseInt(item.pickedQuantity), // Using parseInt to convert to an integer
        shipGroupSeqId: item.shipGroupSeqId
      }));
      const params = {
        "payload": {
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
    } catch (error) {
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

        const shipment = {
          ...shipments[0],
          items: shipments[0]?.items.map((item: any) => ({
            ...item,
            pickedQuantity: item.quantity,
            shippedQuantity: item.totalIssuedQuantity || 0,
          })),
          totalQuantityPicked: shipments[0]?.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0)
        };

        commit(types.ORDER_CURRENT_SHIPMENT_UPDATED, shipment);

        const productIds = [...new Set(shipment.items.map((item: any) => item.productId))];
        const batchSize = 250;
        const productIdBatches = [];

        while (productIds.length) {
          productIdBatches.push(productIds.splice(0, batchSize));
        }

        await Promise.all([
          ...productIdBatches.map((productIds) => this.dispatch('product/fetchProducts', { productIds })),
          this.dispatch('util/fetchPartyInformation', [shipments[0].carrierPartyId]),
          this.dispatch('util/fetchShipmentMethodTypeDesc', [shipments[0].shipmentMethodTypeId])
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
  },
  async fetchRejectReasons({ commit }) {
    let rejectReasons = [];

    const permissions = store.getters["user/getUserPermissions"];
    const isAdminUser = permissions.some((permission: any) => permission.action === "APP_STOREFULFILLMENT_ADMIN")

    if(isAdminUser) {
      try {
        const payload = {
          parentTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          parentTypeId_op: "in",
          pageSize: 20, // keeping view size 20 as considering that we will have max 20 reasons
          orderByField: "sequenceNum"
        }

        const resp = await TransferOrderService.fetchRejectReasons(payload)

        if(!hasError(resp)) {
          rejectReasons = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch reject reasons", err)
      }
    } else {
      try {
        const payload = {
          enumerationGroupId: "FF_REJ_RSN_GRP",
          pageSize: 200,
          orderByField: "sequenceNum"
        }

        const resp = await TransferOrderService.fetchFulfillmentRejectReasons(payload)

        if(!hasError(resp)) {
          rejectReasons = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch fulfillment reject reasons", err)
      }
    }

    commit(types.ORDER_REJECT_REASONS_UPDATED, rejectReasons)
  }
}

export default actions;