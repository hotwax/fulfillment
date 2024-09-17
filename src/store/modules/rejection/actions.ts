import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import RejectionState from './RejectionState'
import { RejectionService } from '@/services/RejectionService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { escapeSolrSpecialChars, prepareOrderQuery } from '@/utils/solrHelper'
import { UtilService } from '@/services/UtilService'
import logger from '@/logger'

const actions: ActionTree<RejectionState, RootState> = {
  async fetchRejectionStats({ commit, dispatch, state }, payload) {
    let rejectionReasons = [] as any, rejectedItems= [] as any

    let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
    if (payload.rejectionPeriodId && payload.rejectionPeriodId === 'LAST_SEVEN_DAYS') {
      rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
    }
    const query = prepareOrderQuery({
        docType: "FULFILLMENT_REJECTION",
        queryFields: 'orderId_s',
        viewSize: '0',  // passed viewSize as 0 to not fetch any data
        sort: 'rejectedAt_dt desc',
        groupBy: 'orderId_s',
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
      query.coreName = "logInsights"


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
    let orders = [] as any, total = 0

    let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
    if (payload.rejectionPeriodId && payload.rejectionPeriodId === 'LAST_SEVEN_DAYS') {
      rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
    }
    const rejectedOrderQuery = JSON.parse(JSON.stringify(state.rejectedOrders.query))
    const query = prepareOrderQuery({
      docType: "FULFILLMENT_REJECTION",
      queryString: rejectedOrderQuery.queryString,
      queryFields: 'orderId_s',
      viewIndex: rejectedOrderQuery.viewIndex,
      viewSize: rejectedOrderQuery.viewSize,
      sort: 'rejectedAt_dt desc',
      groupBy: 'orderId_s',
      filters: {
        rejectedAt_dt: {value: rejectionPeriodFilter},
        rejectedFrom_txt_en: { value: escapeSolrSpecialChars(this.state.user.currentFacility.facilityId) },
      }
    })
    query.coreName = "logInsights"


    try {
      const resp = await RejectionService.fetchRejctedOrders(query);
      if (!hasError(resp)) {
        total = resp.data.grouped.picklistBinId.ngroups
        orders = resp.data.grouped.picklistBinId.groups

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
          }
        })
      } else {
        throw resp.data;
      }
    } catch(err) {
      logger.error('Failed to fetch rejected orders.', err)
    }
    rejectedOrderQuery.viewSize = orders.length
    commit(types.ORDER_REJECTED_QUERY_UPDATED, { ...rejectedOrderQuery })
    commit(types.ORDER_REJECTED_UPDATED, {orders, total})
  },

  async fetchRejectedOrdersDetail ({ commit, dispatch, state }, payload = {}) {
    let resp;
    let orders = JSON.parse(JSON.stringify(state.rejectedOrders.list));

    try {
      const params = {
        ...payload,
        viewSize: ,
        sort: 'orderDate asc',
        groupBy: 'orderId',
        filters: {
          productStoreId: { value: productIds }
        }
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

}

export default actions;