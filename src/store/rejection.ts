import { defineStore } from "pinia"
import { RejectionService } from "@/services/RejectionService"
import { hasError } from "@/adapter"
import { escapeSolrSpecialChars, prepareSolrQuery } from "@/utils/solrHelper"
import { UtilService } from "@/services/UtilService"
import logger from "@/logger"
import { getCurrentFacilityId } from "@/utils"
import { useProductStore } from "@/store/product"
import { useUtilStore } from "@/store/util"

interface RejectionState {
  stats: {
    total: number
    rejectedItems: any[]
    usedReasons: any[]
  }
  rejectedOrders: {
    list: any[]
    total: number
    query: {
      viewIndex: number
      viewSize: any
      queryString: string
      rejectionPeriodId: string
      rejectionReasons: any[]
    }
  }
}

export const useRejectionStore = defineStore("rejection", {
  state: (): RejectionState => ({
    stats: {
      total: 0,
      rejectedItems: [],
      usedReasons: []
    },
    rejectedOrders: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: "",
        rejectionPeriodId: "LAST_TWENTY_FOUR_HOURS",
        rejectionReasons: []
      }
    }
  }),
  getters: {
    getRejectedItems(state) {
      return state.stats.rejectedItems
    },
    getUsedReasons(state) {
      return state.stats.usedReasons
    },
    getRejectedStats(state) {
      return state.stats
    },
    getRejectedOrders(state) {
      return state.rejectedOrders
    }
  },
  actions: {
    setStats(payload: any) {
      this.stats = payload
    },
    setRejectedOrders(payload: any) {
      this.rejectedOrders.list = payload.list
      this.rejectedOrders.total = payload.total
    },
    setRejectedOrderQuery(payload: any) {
      this.rejectedOrders.query = payload
    },
    clearRejectedOrderQuery() {
      this.rejectedOrders.query = {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: "",
        rejectionPeriodId: "LAST_TWENTY_FOUR_HOURS",
        rejectionReasons: []
      }
    },
    async fetchRejectionStats() {
      let usedRejectionReasons = [] as any
      let rejectedItems = [] as any
      let total = 0

      const rejectedOrderQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))

      let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
      if (rejectedOrderQuery.rejectionPeriodId === "LAST_SEVEN_DAYS") {
        rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
      }
      const query = prepareSolrQuery({
        coreName: "logInsights",
        docType: "FULFILLMENT_REJECTION",
        sort: "orderId_s desc",
        viewSize: "0",
        filters: {
          rejectedAt_dt: { value: rejectionPeriodFilter },
          rejectedFrom_txt_en: { value: escapeSolrSpecialChars(getCurrentFacilityId()) }
        },
        facet: {
          total: "unique(orderId_s)",
          rejectionReasonIdFacet: {
            field: "rejectionReasonId_s",
            mincount: 1,
            limit: -1,
            type: "terms"
          },
          productIdFacet: {
            field: "productId_s",
            mincount: 1,
            limit: -1,
            type: "terms"
          }
        }
      })

      try {
        const resp = await RejectionService.fetchRejectionStats(query)
        if (!hasError(resp)) {
          total = resp.data.facets.total ? resp.data.facets.total : 0
          const usedReasons = resp.data.facets.rejectionReasonIdFacet.buckets
          rejectedItems = resp.data.facets.productIdFacet.buckets
          if (rejectedItems) {
            const productIds = rejectedItems.map((rejectedItem: any) => rejectedItem.val)
            await useProductStore().fetchProducts({ productIds })
          }

          if (usedReasons) {
            const reasonIds = usedReasons.map((usedReason: any) => usedReason.val)
            const payload = {
              enumId: reasonIds,
              enumId_op: "in",
              fieldsToSelect: ["description", "enumId", "enumName", "enumTypeId", "sequenceNum"],
              pageSize: reasonIds.length,
              orderByField: "sequenceNum"
            }
            const resp = await UtilService.fetchRejectReasons(payload)

            if (!hasError(resp)) {
              const reasonCountDetail = resp.data.reduce((reasonDetail: any, reason: any) => {
                reasonDetail[reason.enumId] = reason
                return reasonDetail
              }, {})

              await useUtilStore().updateRejectReasons(resp.data)
              usedRejectionReasons = usedReasons.map((reason: any) => {
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
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch rejection stats.", err)
      }
      this.setStats({ rejectedItems, usedReasons: usedRejectionReasons, total })
    },
    async fetchRejectedOrders() {
      let orders = [] as any
      let orderList = [] as any
      let total = 0
      const rejectedOrderQuery = JSON.parse(JSON.stringify(this.rejectedOrders.query))

      const filters = {
        rejectedFrom_txt_en: { value: escapeSolrSpecialChars(getCurrentFacilityId()) }
      } as any

      if (!rejectedOrderQuery.queryString) {
        let rejectionPeriodFilter = "[NOW-24HOURS TO NOW]"
        if (rejectedOrderQuery.rejectionPeriodId === "LAST_SEVEN_DAYS") {
          rejectionPeriodFilter = "[NOW-7DAYS TO NOW]"
        }
        filters.rejectedAt_dt = { value: rejectionPeriodFilter }
      }
      if (rejectedOrderQuery.rejectionReasons.length) {
        filters.rejectionReasonId_s = { value: rejectedOrderQuery.rejectionReasons }
      }

      const query = prepareSolrQuery({
        coreName: "logInsights",
        docType: "FULFILLMENT_REJECTION",
        queryString: rejectedOrderQuery.queryString,
        queryFields: "orderId_s itemDescription_txt_en productId_s rejectedFrom_txt_en rejectedBy_txt_en rejectionReasonId_txt_en rejectionReasonDesc_txt_en",
        viewIndex: rejectedOrderQuery.viewIndex,
        viewSize: rejectedOrderQuery.viewSize,
        sort: "rejectedAt_dt desc",
        isGroupingRequired: true,
        groupBy: "orderId_s",
        filters
      })

      try {
        const resp = await RejectionService.fetchRejctedOrders(query)
        if (!hasError(resp)) {
          total = resp.data.grouped.orderId_s.ngroups
          orders = resp.data.grouped.orderId_s.groups

          const rejectionReasons = useUtilStore().getRejectReasons

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
                brokeredBy: doc.brokeredBy_txt_en
              }
            })

            const orderItem = orderItemDocs[0]
            return {
              orderId: orderItem.orderId,
              items: orderItemDocs
            }
          })

          if (rejectedOrderQuery.viewIndex && rejectedOrderQuery.viewIndex > 0) orderList = JSON.parse(JSON.stringify(this.rejectedOrders.list)).concat(orders)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch rejected orders.", err)
      }
      this.setRejectedOrders({ list: orderList.length > 0 ? orderList : orders, total })
      if (orderList) {
        this.fetchRejectedOrdersDetail({ orderIds: orders.map((order: any) => order.orderId) })
      }
    },
    async fetchRejectedOrdersDetail(payload: any) {
      let resp
      let orders: any[] = []
      const rejectedOrders = JSON.parse(JSON.stringify(this.rejectedOrders.list))
      const total = JSON.parse(JSON.stringify(this.rejectedOrders.total))
      const orderIds = payload.orderIds
      if (!orderIds.length) {
        return
      }

      try {
        const params = {
          docType: "ORDER",
          viewIndex: 0,
          viewSize: orderIds.length,
          sort: "orderDate asc",
          fieldsToSelect: "orderId customerPartyId customerPartyName orderDate orderName reservedDatetime shipmentMethodTypeId shipmentMethod",
          isGroupingRequired: true,
          groupBy: "orderId",
          groupLimit: 1,
          filters: {
            orderId: { value: orderIds }
          }
        }

        const orderQueryPayload = prepareSolrQuery(params)

        resp = await RejectionService.findRejectedOrdersDetail(orderQueryPayload)
        if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.orderId.matches > 0) {
          orders = resp.data.grouped.orderId.groups
          const orderDetails = orders.reduce((orderDetail: any, order: any) => {
            orderDetail[order.doclist.docs[0].orderId] = order.doclist.docs[0]
            return orderDetail
          }, {})

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
        logger.error("No rejected orders found", err)
      }
      this.setRejectedOrders({ list: rejectedOrders, total })
      return resp
    },
    async updateRejectedOrderQuery(payload: any) {
      this.setRejectedOrderQuery(payload)
      await this.fetchRejectionStats()
      await this.fetchRejectedOrders()
    },
    async clearRejectedOrdersFilters() {
      this.clearRejectedOrderQuery()
    }
  },
  persist: false
})
