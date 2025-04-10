import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import emitter from '@/event-bus'
import { TransferOrderService } from '@/services/TransferOrderService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { escapeSolrSpecialChars, prepareOrderQuery } from '@/utils/solrHelper'
import logger from '@/logger'
import { getProductIdentificationValue, translate } from '@hotwax/dxp-components'
import { showToast, getCurrentFacilityId, getProductStoreId } from "@/utils";
import store from "@/store";

const actions: ActionTree<TransferOrderState, RootState> = {

  async findTransferOrders ({ commit, state }, payload = {}) {
    emitter.emit('presentLoader');
    let resp;
    const transferOrderQuery = JSON.parse(JSON.stringify(state.transferOrder.query))

    const params = {
      ...payload,
      docType: "ORDER",
      queryString: transferOrderQuery.queryString,
      viewIndex: transferOrderQuery.viewIndex ? transferOrderQuery.viewIndex : 0,
      viewSize: transferOrderQuery.viewSize,
      queryFields: "orderId orderName externalOrderId productId productName internalName",
      sort: payload.sort ? payload.sort : "orderDate asc",
      filters: {
        orderTypeId: { value: 'TRANSFER_ORDER' },
        facilityId: { value: escapeSolrSpecialChars(getCurrentFacilityId()) },
        productStoreId: { value: getProductStoreId() }
      }
    }

    // only adding shipmentMethods when a method is selected
    if(transferOrderQuery.selectedShipmentMethods.length) {
      params.filters['shipmentMethodTypeId'] = { value: transferOrderQuery.selectedShipmentMethods, op: 'OR' }
    }
    if(transferOrderQuery.selectedStatuses.length) {
      params.filters['orderStatusId'] = { value: transferOrderQuery.selectedStatuses, op: 'OR' }
    }

    const transferOrderQueryPayload = prepareOrderQuery(params)
    let orders = [];
    let orderList = []
    let total = 0;

    try {
      resp = await TransferOrderService.findTransferOrders(transferOrderQueryPayload);
      if (!hasError(resp) && resp.data.grouped?.orderId.matches > 0) {
        total = resp.data.grouped.orderId.ngroups
        orders = resp.data.grouped.orderId.groups

        orders = orders.map((order: any) => {
          const orderItem = order.doclist.docs[0];

          return {
            orderId: orderItem.orderId,
            externalId: orderItem.externalOrderId,
            orderDate: orderItem.orderDate,
            orderName: orderItem.orderName,
            shipGroupSeqId: orderItem.shipGroupSeqId,
            shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
            orderStatusId: orderItem.orderStatusId,
            orderStatusDesc: orderItem.orderStatusDesc
          }
        })

        if (transferOrderQuery.viewIndex && transferOrderQuery.viewIndex > 0) orderList = JSON.parse(JSON.stringify(state.transferOrder.list)).concat(orders)
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('No transfer orders found', err)
    }

    commit(types.ORDER_TRANSFER_QUERY_UPDATED, { ...transferOrderQuery })
    commit(types.ORDER_TRANSFER_UPDATED, { list: orderList.length > 0 ? orderList : orders, total})

    emitter.emit('dismissLoader');
    return resp;
  },
  async fetchTransferOrderDetail ({ commit }, payload) {
    let orderDetail = {} as any;
    let resp;
    try {
      resp = await TransferOrderService.fetchOrderHeader(payload.orderId);
      if (!hasError(resp)) {
        orderDetail = resp.data
        orderDetail["facilityId"] = orderDetail.shipGroups[0].orderFacilityId
         
        //fetch order items
        orderDetail.items = await TransferOrderService.fetchOrderItems(payload.orderId);
        if (orderDetail?.items?.length > 0) {
          orderDetail.items.forEach((item: any) => {
            item.pickedQuantity = 0;
            item.orderedQuantity = item.quantity;
          })
  
          // TODO
          // fetch shipped quantity 
          const shippedQuantityInfo = {} as any;
          resp = await TransferOrderService.fetchShippedQuantity(payload.orderId);
          resp.forEach((doc:any) => {
            shippedQuantityInfo[doc.orderItemSeqId] = doc.shippedQuantity;
          });
          orderDetail.shippedQuantityInfo = shippedQuantityInfo;

          //fetch product details
          const productIds = [...new Set(orderDetail.items.map((item:any) => item.productId))];
  
          const batchSize = 250;
          const productIdBatches = [];
          while(productIds.length) {
            productIdBatches.push(productIds.splice(0, batchSize))
          }
          await Promise.all([productIdBatches.map((productIds) => this.dispatch('product/fetchProducts', { productIds })), this.dispatch('util/fetchStatusDesc', [orderDetail.statusId])])
        }
        commit(types.ORDER_CURRENT_UPDATED, orderDetail)
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error("error", err);
      return Promise.reject(new Error(err))
    }
  },

  async createOutboundTransferShipment({ commit }, payload) {
    let shipmentId;
    try {
      let eligibleItems = payload.items.filter((item: any) => item.pickedQuantity > 0)
      let seqIdCounter = 1;
      eligibleItems = eligibleItems.map((item:any) => ({
        orderItemSeqId: item.orderItemSeqId, //This is needed to map shipment item with order item correctly if multiple order items for the same product are there in the TO.
        shipGroupSeqId: item.shipGroupSeqId,
        productId: item.productId,
        quantity: parseInt(item.pickedQuantity), // Using parseInt to convert to an integer
        itemSeqId: String(seqIdCounter++).padStart(5, '0') // This is needed to correctly create the shipment package content if multiple order items for the same product are there in the TO.
      }));  

      const params = {
        orderId: payload.orderId,
        "orderItems": eligibleItems
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

  async fetchTransferShipmentDetail ({ commit }, payload) {
    let resp;
    try {
      const shipmentItems = await TransferOrderService.fetchShipmentItems('', payload.shipmentId);
      if (shipmentItems?.length > 0) {
        const [shipmentPackagesWithMissingLabel, shipmentPackages, shipmentCarriers] = await Promise.all([TransferOrderService.fetchShipmentPackages([payload.shipmentId]), TransferOrderService.findShipmentPackages([payload.shipmentId]), TransferOrderService.fetchShipmentCarrierDetail([payload.shipmentId])]);

        const shipment = {
          shipmentId: shipmentItems?.[0].shipmentId,
          primaryOrderId: shipmentItems?.[0].orderId,
          statusId: shipmentItems?.[0].shipmentStatusId,
          trackingCode: shipmentCarriers?.[0].trackingIdNumber,
          carrierPartyId: shipmentCarriers?.[0].carrierPartyId,
          shipmentMethodTypeId: shipmentCarriers?.[0].shipmentMethodTypeId,
          shipmentPackagesWithMissingLabel: shipmentPackagesWithMissingLabel,
          shipmentPackages: shipmentPackages ? Object.values(shipmentPackages).flat() : [],
          isTrackingRequired: shipmentPackagesWithMissingLabel?.some((shipmentPackage: any) => shipmentPackage.isTrackingRequired === 'Y'),
          items: shipmentItems.map((item: any) => ({
            ...item,
            pickedQuantity: item.pickedQuantity
          })),
          totalQuantityPicked: shipmentItems.reduce((accumulator:any, currentItem:any) => accumulator + currentItem.pickedQuantity, 0)
        }

        commit(types.ORDER_CURRENT_SHIPMENT_UPDATED, shipment)

        const productIds = [...new Set(shipmentItems.map((item:any) => item.productId))];


        const batchSize = 250;
        const productIdBatches = [];
        while(productIds.length) {
          productIdBatches.push(productIds.splice(0, batchSize))
        }
        await Promise.all([productIdBatches.map((productIds) => this.dispatch('product/fetchProducts', { productIds })), this.dispatch('util/fetchPartyInformation', [shipmentCarriers?.[0].carrierPartyId,]), this.dispatch('util/fetchShipmentMethodTypeDesc', [shipmentCarriers?.[0].shipmentMethodTypeId])])
      }

    } catch (err: any) {
      logger.error("error", err);
    }
  },
  async fetchOrderShipments ({ commit, state }, payload) {
    let shipments;

    try {
      const shipmentItems  = await TransferOrderService.fetchShipmentItems(payload.orderId, '');
      if (shipmentItems?.length > 0) {
        shipments = Object.values(shipmentItems.reduce((shipmentInfo:any, currentItem:any) => {
          const { shipmentId, statusId, orderId, carrierPartyId, shipmentMethodTypeId, shipmentPackageRouteSegDetails, shippedDate, lastModifiedByUserLogin } = currentItem;
          if (!shipmentInfo[shipmentId]) {
            shipmentInfo[shipmentId] = {
              carrierPartyId,
              items: currentItem.items,
              primaryOrderId: orderId,
              shipmentId,
              shipmentMethodTypeId,
              shipmentPackageRouteSegDetails,
              statusId,
              statusDate: shippedDate,
              changeByUserLoginId: lastModifiedByUserLogin
            };
          } else {
            shipmentInfo[shipmentId].items.push(currentItem);
          }
          return shipmentInfo;
        }, {}));
        
        const shipment = shipments[0] as any;
        const routeSegDetails = shipment.shipmentPackageRouteSegDetails || [];
        shipment.shipmentPackage = routeSegDetails.map((detail: any) => ({
          carrierServiceStatusId: detail.carrierServiceStatusId,
          internationalInvoiceUrl: detail.internationalInvoiceUrl,
          isTrackingRequired: detail.isTrackingRequired,
          labelImageUrl: detail.labelImageUrl,
          packageName: detail.packageName,
          picklistBinId: detail.picklistBinId,
          primaryOrderId: detail.primaryOrderId,
          shipmentBoxTypeId: detail.shipmentBoxTypeId,
          shipmentId: detail.shipmentId,
          shipmentPackageSeqId: detail.shipmentPackageSeqId,
          shipmentMethodTypeId: detail.shipmentMethodTypeId,
          shipmentRouteSegmentId: detail.shipmentRouteSegmentId,
          trakingCode: detail.trackingCode
        }));
      
        await this.dispatch('util/fetchShipmentMethodTypeDesc', shipments.map((carrier:any) => carrier.shipmentMethodTypeId));
      }
    } catch (err: any) {
      logger.error("error", err);
    }
    commit(types.ORDER_CURRENT_UPDATED, {...state.current, shipments})
  },

  async updateOrderProductCount({ commit, state }, payload ) {
    // When there exists multiple line item for a single product, then may arise discrepancy in scanning
    // since some items might be completed and some pending. Hence searching is done with status check.
    const getProduct = store.getters['product/getProduct'];
    const barcodeIdentifier = store.getters['util/getBarcodeIdentificationPref'];

    const item = state.current.items.find((orderItem: any) => {
      const itemVal = getProductIdentificationValue(barcodeIdentifier, getProduct(orderItem.productId)) ? getProductIdentificationValue(barcodeIdentifier, getProduct(orderItem.productId)) : getProduct(orderItem.productId)?.internalName;
      return itemVal === payload && orderItem.statusId !== 'ITEM_COMPLETED' && orderItem.statusId !== 'ITEM_REJECTED' && orderItem.statusId !== 'ITEM_CANCELLED';
    })
    if(item){
      item.pickedQuantity = parseInt(item.pickedQuantity) + 1;
      commit(types.ORDER_CURRENT_UPDATED, state.current )
      return { isProductFound: true, orderItem: item }
    }

    const completedItem = state.current.items.some((item: any) => item.internalName === payload && item.statusId === 'ITEM_COMPLETED');
    if(completedItem) {
      return { isCompleted: true }
    }

    return { isProductFound: false }
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
  //TODO: get an endpoint in maarg for getting the rejection reason.
  async fetchRejectReasons({ commit }) {
    let rejectReasons = [];

    const permissions = store.getters["user/getUserPermissions"];
    const isAdminUser = permissions.some((permission: any) => permission.action === "APP_STOREFULFILLMENT_ADMIN")

    if(isAdminUser) {
      try {
        const payload = {
          inputFields: {
            parentEnumTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
            parentEnumTypeId_op: "in"
          },
          fieldList: ["description", "enumId", "enumName", "enumTypeId", "sequenceNum"],
          distinct: "Y",
          entityName: "EnumTypeChildAndEnum",
          viewSize: 20, // keeping view size 20 as considering that we will have max 20 reasons
          orderBy: "sequenceNum"
        }

        const resp = await TransferOrderService.fetchRejectReasons(payload)

        if(!hasError(resp) && resp.data.count > 0) {
          rejectReasons = resp.data.docs
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch reject reasons", err)
      }
    } else {
      try {
        const payload = {
          inputFields: {
            enumerationGroupId: "TO_REJ_RSN_GRP"
          },
          // We shouldn't fetch description here, as description contains EnumGroup description which we don't wanna show on UI.
          fieldList: ["enumerationGroupId", "enumId", "fromDate", "sequenceNum", "enumDescription", "enumName"],
          distinct: "Y",
          entityName: "EnumerationGroupAndMember",
          viewSize: 200,
          filterByDate: "Y",
          orderBy: "sequenceNum"
        }

        const resp = await TransferOrderService.fetchRejectReasons(payload)

        if(!hasError(resp) && resp?.data.docs.length > 0) {
          rejectReasons = resp.data.docs
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