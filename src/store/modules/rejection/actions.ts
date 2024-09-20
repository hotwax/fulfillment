import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import RejectionState from './RejectionState'
import { RejectionService } from '@/services/RejectionService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { escapeSolrSpecialChars, prepareSolrQuery } from '@/utils/solrHelper'
import { UtilService } from '@/services/UtilService'
import logger from '@/logger'

const actions: ActionTree<RejectionState, RootState> = {
  async fetchRejectionStats({ commit, dispatch, state }, payload) {
    let rejectionReasons = [] as any, rejectedItems= [] as any

    let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
    if (payload.rejectionPeriodId && payload.rejectionPeriodId === 'LAST_SEVEN_DAYS') {
      rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
    }
    const query = prepareSolrQuery({
        coreName: "logInsights",
        docType: "FULFILLMENT_REJECTION",
        sort: "orderId_s desc",
        viewSize: '0',  // passed viewSize as 0 to not fetch any data
        filters: {
          rejectedAt_dt: {value: rejectionPeriodFilter},
          rejectedFrom_txt_en: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
        },
        facet: {
          "rejectionReasonIdFacet":{
            "field":"rejectionReasonId_txt_en",
            "mincount":1,
            "limit":-1,
            "sort":"index",
            "type":"terms",
          },
          "prodductIdFacet":{
            "field":"productId_s",
            "mincount":1,
            "limit":-1,
            "sort":"index",
            "type":"terms",
          }
        }
      })

      try {
        const resp = await RejectionService.fetchRejectionStats(query);
        if (!hasError(resp)) {
          const usedReasons = resp.data.facets.rejectionReasonIdFacet.buckets
          rejectedItems = resp.data.facets.prodductIdFacet.buckets
          if (rejectedItems) {
            const productIds = rejectedItems.map((rejectedItem: any) => rejectedItem.val)
            await this.dispatch('product/fetchProducts', { productIds })
          }

          if (usedReasons) {
            const reasonIds = usedReasons.map((usedReason: any) => usedReason.val)
            const payload = {
              "inputFields": {
                "enumId": reasonIds,
                "enumId_op": "in"
              },
              "fieldList": ["description", "enumId", "enumName", "enumTypeId", "sequenceNum"],
              "distinct": "Y",
              "entityName": "EnumTypeChildAndEnum",
              "viewSize": reasonIds.length, //There won't we rejection reasons more than 20, hence fetching detail for all the reasons at once
              "orderBy": "sequenceNum"
            }
            const resp = await UtilService.fetchRejectReasons(payload)

            if (!hasError(resp) && resp.data.count > 0) {
              const reasonCountDetail = usedReasons.reduce((reasonDetail: any, reason: any) => {
                reasonDetail[reason.val.trim().toUpperCase()] = reason;
                return reasonDetail;
              }, {});
              rejectionReasons = resp.data.docs
              rejectionReasons.map((rejectionReason: any) => {
                rejectionReason.count = reasonCountDetail[rejectionReason.enumId]?.count
              })
            } else {
              throw resp.data
            }
          }
        } else {
          throw resp.data;
        }
      } catch(err) {
        logger.error('Failed to fetch rejection stats.', err)
      }
    commit(types.REJECTION_REJECTED_ITEMS_UPDATED, rejectedItems)
    commit(types.REJECTION_USED_REASONS_UPDATED, rejectionReasons)
  },

  async fetchRejectedOrders({ commit, dispatch, state }, payload) {
    let orders = [] as any, orderList = [] as any, total = 0
    const rejectedOrderQuery = JSON.parse(JSON.stringify(state.rejectedOrders.query))
    
    let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
    if (rejectedOrderQuery.rejectionPeriodId === 'LAST_SEVEN_DAYS') {
      rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
    }

    const query = prepareSolrQuery({
      coreName: "logInsights",
      docType: "FULFILLMENT_REJECTION",
      queryString: rejectedOrderQuery.queryString,
      queryFields: 'orderId_s itemDescription_txt_en productId_s rejectedFrom_txt_en rejectedBy_txt_en rejectionReasonId_txt_en rejectionReasonDesc_txt_en',
      viewIndex: rejectedOrderQuery.viewIndex,
      viewSize: rejectedOrderQuery.viewSize,
      sort: 'rejectedAt_dt desc',
      isGroupingRequired: true,
      groupBy: 'orderId_s',
      filters: {
        rejectedAt_dt: {value: rejectionPeriodFilter},
        rejectedFrom_txt_en: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
      }
    })

    try {
      const resp = await RejectionService.fetchRejctedOrders(query);
      if (!hasError(resp)) {
        total = resp.data.grouped.orderId_s.ngroups
        orders = resp.data.grouped.orderId_s.groups

        orders = orders.map((order: any) => {
          const orderItemDocs = order.doclist.docs.map((doc: any) => {
            return {
              orderId: doc.orderId_s,
              orderItemSeqId: doc.orderItemSeqId_s,
              itemDescription: doc.itemDescription_txt_en,
              productId: doc.productId_s,
              availableToPromise: doc.availableToPromise_d,
              rejectedFrom: order.rejectedFrom_txt_en,
              rejectedBy: doc.rejectedBy_txt_en,
              rejectedAt: doc.rejectedAt_dt,
              rejectionReasonId: doc.rejectionReasonId_txt_en,
              rejectionReasonDesc: doc.rejectionReasonDesc_txt_en,
              brokeredAt: doc.brokeredAt_dt,
              brokeredBy: doc.brokeredBy_txt_en,
            };
          });

          const orderItem = orderItemDocs[0];
          return {
            orderId: orderItem.orderId,
            items: orderItemDocs,
          };
        });
        
        if (rejectedOrderQuery.viewIndex && rejectedOrderQuery.viewIndex > 0) orderList = JSON.parse(JSON.stringify(state.rejectedOrders.list)).concat(orders)
        } else {
      throw resp.data;
    }
  } catch(err) {
    logger.error('Failed to fetch rejected orders.', err)
  }
  commit(types.REJECTION_ORDERS_UPDATED, { list: orderList.length > 0 ? orderList : orders, total})
  dispatch("fetchRejectedOrdersDetail", { orderIds: orders.map((order:any) =>  order.orderId)})
},

  async fetchRejectedOrdersDetail ({ commit, dispatch, state }, payload) {
    let resp, orders = [];
    const rejectedOrders = JSON.parse(JSON.stringify(state.rejectedOrders.list));
    const total = JSON.parse(JSON.stringify(state.rejectedOrders.total));
    const orderIds = payload.orderIds
    if (!orderIds.length) {
      return
    }

    try {
      const params = {
        docType: "ORDER",
        viewIndex: 0,
        viewSize: orderIds.length,
        sort: 'orderDate asc',
        fieldsToSelect: "orderId customerId customerName orderDate orderName reservedDatetime shipmentMethodTypeId shipmentMethodTypeDesc",
        isGroupingRequired: true,
        groupBy: 'orderId',
        groupLimit: 1,
        filters: {
          orderId: { value: orderIds}
        }
      }

      const orderQueryPayload = prepareSolrQuery(params)

      resp = await RejectionService.findRejectedOrdersDetail(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.orderId.matches > 0) {
        orders = resp.data.grouped.orderId.groups
        const orderDetails = orders.reduce((orderDetail: any, order: any) => {
          orderDetail[order.doclist.docs[0].orderId] = order.doclist.docs[0]; //we are fetching only one item for order detail
          return orderDetail;
        }, {});

        rejectedOrders.map((rejectedOrder: any) => {
          if (orderIds.includes(rejectedOrder.orderId)) {
            const detail = orderDetails[rejectedOrder.orderId]
            rejectedOrder.customerId = detail.customerId
            rejectedOrder.customerName = detail.customerName
            rejectedOrder.orderDate = detail.orderDate
            rejectedOrder.orderName = detail.orderName
            rejectedOrder.reservedDatetime = detail.reservedDatetime
            rejectedOrder.shipmentMethodTypeId = detail.shipmentMethodTypeId
            rejectedOrder.shipmentMethodTypeDesc = detail.shipmentMethodTypeDesc
          }
        })

      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('No rejected orders found', err)
    }
    commit(types.REJECTION_ORDERS_UPDATED, { list: rejectedOrders, total})
    return resp;
  },

  async updateRejectedOrderQuery({ commit, dispatch }, payload) {
    commit(types.REJECTION_ORDER_QUERY_UPDATED, payload)
    await dispatch('fetchRejectedOrders');
  },
}

export default actions;