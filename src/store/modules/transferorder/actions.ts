import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { OrderService } from '@/services/OrderService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { escapeSolrSpecialChars, prepareOrderQuery } from '@/utils/solrHelper'
import logger from '@/logger'
import { getProductIdentificationValue, translate } from '@hotwax/dxp-components'
import { showToast, getCurrentFacilityId, getProductStoreId } from "@/utils";
import { UtilService } from '@/services/UtilService'
import store from "@/store";

const actions: ActionTree<TransferOrderState, RootState> = {

  async findTransferOrders ({ commit, state }, payload = {}) {
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
        "-statusFlowId": { value: 'RECEIVE_ONLY'},
        reservationFacilityId: { value: escapeSolrSpecialChars(getCurrentFacilityId()) },
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
      resp = await OrderService.findTransferOrders(transferOrderQueryPayload);
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

    return resp;
  },
  async fetchTransferOrderDetail ({ commit }, payload) {
    let orderDetail = {} as any;
    let resp;
    try {
      const params = {
        "entityName": "OrderHeaderItemAndShipGroup",
        "inputFields": {
          "orderId": payload.orderId,
          "oisgFacilityId": escapeSolrSpecialChars(getCurrentFacilityId()),
          "statusFlowId": "RECEIVE_ONLY",
          "statusFlowId_op": "notEqual"
        },
        "fieldList": ["orderId", "orderName", "externalId", "orderTypeId", "statusId", "orderDate", "shipGroupSeqId", "oisgFacilityId", "orderFacilityId"],
        "viewSize": 1,
        "distinct": "Y"
      }
    
      resp = await OrderService.fetchOrderHeader(params);
      if (!hasError(resp)) {
         orderDetail = resp.data.docs?.[0];
         orderDetail["facilityId"] = orderDetail.oisgFacilityId
         
        //fetch order items
        orderDetail.items = await OrderService.fetchOrderItems(payload.orderId);
        if (orderDetail?.items?.length > 0) {
          orderDetail.items.forEach((item: any) => {
            item.pickedQuantity = 0;
            item.orderedQuantity = item.quantity;
          })
  
          //fetch shipped quantity
          const shippedQuantityInfo = {} as any;
          resp = await OrderService.fetchShippedQuantity(payload.orderId);
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
        productId: item.productId,
        sku: item.internalName,
        quantity: parseInt(item.pickedQuantity), // Using parseInt to convert to an integer
        itemSeqId: String(seqIdCounter++).padStart(5, '0') // This is needed to correctly create the shipment package content if multiple order items for the same product are there in the TO.
      }));  

      const params = {
        "shipmentTypeId": "OUT_TRANSFER",
        orderId: payload.orderId,
        "shipGroupSeqId": payload.shipGroupSeqId,
        "originFacilityId": getCurrentFacilityId(),
        "destinationFacilityId": payload.orderFacilityId,
        "items": eligibleItems,
        "packages": [{
          "items": eligibleItems
        }]
      }
      const resp = await OrderService.createOutboundTransferShipment({"shipments": params})
      if (!hasError(resp)) {
        shipmentId = resp.data.shipments.id;
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
      const shipmentItems = await OrderService.fetchShipmentItems('', payload.shipmentId);
        
      if (shipmentItems?.length > 0) {
        const [shipmentPackagesWithMissingLabel, shipmentPackages, shipmentCarriers] = await Promise.all([OrderService.fetchShipmentPackages([payload.shipmentId]), UtilService.findShipmentPackages([payload.shipmentId]), OrderService.fetchShipmentCarrierDetail([payload.shipmentId])]);

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
            pickedQuantity: item.quantity
          })),
          totalQuantityPicked: shipmentItems.reduce((accumulator:any, currentItem:any) => accumulator + currentItem.quantity, 0)
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
    let resp;
    let shipments = [];

    try {
      const shipmentItems  = await OrderService.fetchShipmentItems(payload.orderId, '');
      if (shipmentItems?.length > 0) {
        shipments = Object.values(shipmentItems.reduce((shipmentInfo:any, currentItem:any) => {
          const { shipmentId, shipmentStatusId, orderId } = currentItem;
          if (!shipmentInfo[shipmentId]) {
            shipmentInfo[shipmentId] = {
              shipmentId,
              primaryOrderId: orderId,
              statusId : shipmentStatusId,
              items: [currentItem]
            };
          } else {
            shipmentInfo[shipmentId].items.push(currentItem);
          }
          return shipmentInfo;
        }, {}));

        const shipmentIds = new Set(shipments.map((shipment:any) => shipment.shipmentId));
        const [shipmentCarriers, shipmentShippedStatuses, shipmentPackages] = await Promise.all([OrderService.fetchShipmentCarrierDetail([...shipmentIds]), OrderService.fetchShipmentShippedStatusHistory([...shipmentIds]), UtilService.findShipmentPackages([...shipmentIds])]);
        const shipmentCarrierDetail = shipmentCarriers.reduce((carriers: any, carrierDetail:any) => {
          carriers[carrierDetail.shipmentId] = carrierDetail;
          return carriers;
        }, {});

        const shipmentShippedStatusDetail = shipmentShippedStatuses.reduce((shipments: any, statusDetail:any) => {
          shipments[statusDetail.shipmentId] = statusDetail;
          return shipments;
        }, {});

        
        const shipmentPackageValues = Object.values(shipmentPackages).flat() as any;
        const shipmentPackageDetail = shipmentPackageValues.reduce((shipPackages:any, shipmentPackageDetail:any) => {
          const { shipmentId } = shipmentPackageDetail;
          if (!shipPackages[shipmentId]) {
            shipPackages[shipmentId] = [];
          }
          shipPackages[shipmentId].push(shipmentPackageDetail);
          return shipPackages;
        }, {})

        shipments = shipments.map((shipment:any) => {
          const shipmentDetails = shipmentShippedStatusDetail[shipment.shipmentId];
          const carrierDetails = shipmentCarrierDetail[shipment.shipmentId]
          const shipmentPackages = shipmentPackageDetail[shipment.shipmentId]
          return { ...shipment, ...shipmentDetails, ...carrierDetails, shipmentPackages };
        });

        await this.dispatch('util/fetchShipmentMethodTypeDesc', shipmentCarriers.map((carrier:any) => carrier.shipmentMethodTypeId))
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

        const resp = await OrderService.fetchRejectReasons(payload)

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

        const resp = await OrderService.fetchRejectReasons(payload)

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