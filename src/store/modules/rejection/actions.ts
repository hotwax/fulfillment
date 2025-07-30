import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import RejectionState from './RejectionState'
import { RejectionService } from '@/services/RejectionService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { escapeSolrSpecialChars, prepareSolrQuery } from '@/utils/solrHelper'
import { UtilService } from '@/services/UtilService'
import logger from '@/logger'
import { getCurrentFacilityId } from '@/utils'
import store from '@/store'

const actions: ActionTree<RejectionState, RootState> = {
  async fetchRejectionStats({ commit, state }) {
    let usedRejectionReasons = [] as any, rejectedItems = [] as any, total = 0

    const rejectedOrderQuery = JSON.parse(JSON.stringify(state.rejectedOrders.query))
    
    let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
    if (rejectedOrderQuery.rejectionPeriodId === 'LAST_SEVEN_DAYS') {
      rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
    }
    const query = prepareSolrQuery({
        coreName: "logInsights",
        docType: "FULFILLMENT_REJECTION",
        sort: "orderId_s desc",
        viewSize: '0',  // passed viewSize as 0 to not fetch any data
        filters: {
          rejectedAt_dt: {value: rejectionPeriodFilter},
          rejectedFrom_txt_en: { value: escapeSolrSpecialChars(getCurrentFacilityId()) },
        },
        facet: {
          "total":"unique(orderId_s)",
          "rejectionReasonIdFacet":{
            "field":"rejectionReasonId_s",
            "mincount":1,
            "limit":-1,
            "type":"terms",
          },
          "productIdFacet":{
            "field":"productId_s",
            "mincount":1,
            "limit":-1,
            "type":"terms",
          }
        }
      })

      try {
        const resp = await RejectionService.fetchRejectionStats(query);
        if (!hasError(resp)) {
          total = resp.data.facets.total ? resp.data.facets.total : 0
          const usedReasons = resp.data.facets.rejectionReasonIdFacet.buckets
          rejectedItems = resp.data.facets.productIdFacet.buckets
          if (rejectedItems) {
            const productIds = rejectedItems.map((rejectedItem: any) => rejectedItem.val)
            await this.dispatch('product/fetchProducts', { productIds })
          }

          if (usedReasons) {
            const reasonIds = usedReasons.map((usedReason: any) => usedReason.val)
            const payload = {
              "enumId": reasonIds,
              "enumId_op": "in",
              "fieldsToSelect": ["description", "enumId", "enumName", "enumTypeId", "sequenceNum"],
              "pageSize": reasonIds.length, //There won't we rejection reasons more than 20, hence fetching detail for all the reasons at once
              "orderByField": "sequenceNum"
            }
            const resp = await UtilService.fetchRejectReasons(payload)

            if (!hasError(resp)) {
              
              const reasonCountDetail = resp.data.reduce((reasonDetail: any, reason: any) => {
                reasonDetail[reason.enumId] = reason;
                return reasonDetail;
              }, {});

              await store.dispatch("util/updateRejectReasons", resp.data)
              usedRejectionReasons = usedReasons.map((reason:any) => {
                return {
                  count: reason.count,
                  ...reasonCountDetail[reason.val.toUpperCase()]
                }
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
    commit(types.REJECTION_STATS_UPDATED, { rejectedItems, usedReasons: usedRejectionReasons, total })
  },

  async fetchRejectedOrders({ commit, dispatch, state }, payload) {
    let orders = [] as any, orderList = [] as any, total = 0
    const rejectedOrderQuery = JSON.parse(JSON.stringify(state.rejectedOrders.query))

    const filters = {
      rejectedFrom_txt_en: { value: escapeSolrSpecialChars(getCurrentFacilityId()) },
    } as any

    //when user search the rejected results are not bound to time duration
    if (!rejectedOrderQuery.queryString) {
      let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
      if (rejectedOrderQuery.rejectionPeriodId === 'LAST_SEVEN_DAYS') {
        rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
      }
      filters.rejectedAt_dt = {value: rejectionPeriodFilter}
    }
    if (rejectedOrderQuery.rejectionReasons.length) {
      filters.rejectionReasonId_s = {value: rejectedOrderQuery.rejectionReasons}
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
      filters
    })

    try {
      const resp = await RejectionService.fetchRejctedOrders(query);
      if (!hasError(resp)) {
        total = resp.data.grouped.orderId_s.ngroups
        orders = resp.data.grouped.orderId_s.groups

        const rejectionReasons = store.getters["util/getRejectReasons"]

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
              rejectionReasonDesc: rejectionReasons?.find((reason: any) => reason.enumId === doc.rejectionReasonId_txt_en)?.description || doc.rejectionReasonId_txt_en,
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
    if (orderList) {
      dispatch("fetchRejectedOrdersDetail", { orderIds: orders.map((order:any) =>  order.orderId)})
    }
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
        fieldsToSelect: "orderId customerPartyId customerPartyName orderDate orderName reservedDatetime shipmentMethodTypeId shipmentMethod",
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
            rejectedOrder.customerId = detail.customerPartyId
            rejectedOrder.customerName = detail.customerPartyName
            rejectedOrder.orderDate = detail.orderDate
            rejectedOrder.orderName = detail.orderName
            rejectedOrder.reservedDatetime = detail.reservedDatetime
            rejectedOrder.shipmentMethodTypeId = detail.shipmentMethodTypeId
            rejectedOrder.shipmentMethod = detail.shipmentMethod
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
    await dispatch('fetchRejectionStats')
    await dispatch('fetchRejectedOrders');
  },
  async clearRejectedOrdersFilters ({ commit }) {
    commit(types.REJECTION_ORDER_QUERY_CLEARED, )
  }
}

export default actions;