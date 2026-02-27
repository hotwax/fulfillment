import { defineStore } from "pinia"
import { OrderLookupService } from "@/services/OrderLookupService"
import { solrUtil } from "@/utils/solrUtil"
import { hasError } from "@/adapter"
import { commonUtil } from "@/utils/commonUtil"
import { translate } from "@hotwax/dxp-components"
import logger from "@/logger"
import { useProductStore } from "@/store/product"
import { useUtilStore } from "@/store/util"

interface OrderLookupQuery {
  status: any[]
  facility: any[]
  storePickup: boolean
  shipFromStore: boolean
  unfillable: boolean
  queryString: string
  sort: string
  productStore: any[]
  channel: any[]
  date: string
  fromDate: string
  toDate: string
}

interface OrderLookupState {
  list: {
    orders: any[]
    orderCount: number
    itemCount: number
  }
  query: OrderLookupQuery
  current: any
  channels: any[]
  productStores: any[]
  orderStatuses: any[]
  carriersTrackingInfo: any
}

export const useOrderLookupStore = defineStore("orderLookup", {
  state: (): OrderLookupState => ({
    list: {
      orders: [],
      orderCount: 0,
      itemCount: 0
    },
    query: {
      status: [],
      facility: [],
      storePickup: false,
      shipFromStore: false,
      unfillable: false,
      queryString: "",
      sort: "orderDate desc",
      productStore: [],
      channel: [],
      date: "",
      fromDate: "",
      toDate: ""
    },
    current: {},
    channels: [],
    productStores: [],
    orderStatuses: [],
    carriersTrackingInfo: {}
  }),
  getters: {
    getOrders(state) {
      return state.list
    },
    isScrollable: (state) => {
      return state.list.orders.length > 0 && state.list.orders.length < state.list.orderCount
    },
    getOrderQuery: (state) => {
      return state.query
    },
    getCurrentOrder(state) {
      return state.current
    },
    getProductStoreOptions: (state) => {
      return state.productStores || []
    },
    getChannelOptions: (state) => {
      return state.channels || []
    },
    getOrderStatusOptions: (state) => {
      return state.orderStatuses || []
    },
    getCarriersTrackingInfo: (state) => (carrierId: any) => {
      return state.carriersTrackingInfo[carrierId]
    }
  },
  actions: {
    updateOrderList(payload: any) {
      this.list.orders = payload.orders
      this.list.orderCount = payload.orderCount
      this.list.itemCount = payload.itemCount
    },
    updateFilters<K extends keyof OrderLookupQuery>(payload: { filterName: K, value: OrderLookupQuery[K] }) {
      this.query[payload.filterName] = payload.value
    },
    updateCurrent(order: any) {
      this.current = order
    },
    updateSort(payload: any) {
      this.query.sort = payload
    },
    updateChannelOptions(payload: any) {
      this.channels = payload
    },
    updateProductStoreOptions(payload: any) {
      this.productStores = payload
    },
    updateStatusOptions(payload: any) {
      this.orderStatuses = payload
    },
    updateCarrierTrackingUrls(payload: any) {
      this.carriersTrackingInfo = payload
    },
    clearOrderLookup() {
      this.list = {
        orders: [],
        orderCount: 0,
        itemCount: 0
      }
      this.query = {
        status: [],
        facility: [],
        storePickup: false,
        shipFromStore: false,
        unfillable: false,
        queryString: "",
        sort: "orderDate desc",
        productStore: [],
        channel: [],
        date: "",
        fromDate: "",
        toDate: ""
      }
      this.current = {}
      this.channels = []
      this.productStores = []
      this.orderStatuses = []
    },
    async findOrders(params: any) {
      let resp, orderCount, itemCount
      let stateOrders = JSON.parse(JSON.stringify(this.list.orders))
      const shipmentMethodTypeIds: Array<string> = []

      const query = solrUtil.prepareOrderLookupQuery({ ...this.query, ...params })
      try {
        resp = await OrderLookupService.findOrder(query)
        if (!hasError(resp) && resp.data?.grouped?.orderId?.groups?.length) {
          const orders = resp.data.grouped.orderId.groups.map((order: any) => {
            order.orderId = order.doclist.docs[0].orderId
            order.customer = {
              name: order.doclist.docs[0].customerPartyName,
              emailId: order.doclist.docs[0].customerEmailId,
              phoneNumber: order.doclist.docs[0].customerPhoneNumber
            },
              order.orderName = order.doclist.docs[0].orderName
            order.orderDate = order.doclist.docs[0].orderDate
            order.orderStatusId = order.doclist.docs[0].orderStatusId
            order.orderStatusDesc = order.doclist.docs[0].orderStatusDesc

            order.doclist.docs[0].shipmentMethodTypeId && !shipmentMethodTypeIds.includes(order.doclist.docs[0].shipmentMethodTypeId) && shipmentMethodTypeIds.push(order.doclist.docs[0].shipmentMethodTypeId)
            return order
          })

          orderCount = resp.data.grouped.orderId.ngroups
          itemCount = resp.data.grouped.orderId.matches

          const status = new Set()
          const orderItems = [] as any

          orders.map((order: any) => {
            status.add(order.orderStatusId)
            order.doclist.docs.map((item: any) => {
              status.add(item.orderItemStatusId)
              orderItems.push(item)
            })
          })

          if (params?.fetchFacets) {
            const productStores = resp.data.facets?.productStoreIdFacet?.buckets.map((bucket: any) => bucket.val)
            const channels = resp.data.facets?.salesChannelDescFacet?.buckets.map((bucket: any) => bucket.val)
            const statuses = resp.data.facets?.orderStatusDescFacet?.buckets.map((bucket: any) => bucket.val)

            this.updateChannelOptions(channels)
            this.updateProductStoreOptions(productStores)
            this.updateStatusOptions(statuses)
          }

          if (query.json.params.start && query.json.params.start > 0) stateOrders = stateOrders.concat(orders)
          else stateOrders = orders
          await useProductStore().getProductInformation({ orders })
          await useUtilStore().fetchShipmentMethodTypeDesc(shipmentMethodTypeIds)
        } else {
          throw resp.data
        }
      } catch (error) {
        logger.error(error)
        if (params?.isFilterUpdated && (!params?.viewIndex || params.viewIndex == 0)) {
          stateOrders = []
          orderCount = 0
          itemCount = 0
        }
      }
      this.updateOrderList({ orders: stateOrders, orderCount, itemCount })
      return resp
    },
    async fetchCarriersTrackingInfo(carrierPartyIds: any) {
      const carriersTrackingInfo = {} as any
      const systemProperties = {} as any

      await useUtilStore().fetchPartyInformation(carrierPartyIds)

      try {
        const resp = await OrderLookupService.fetchCarrierTrackingUrls({
          systemResourceId: carrierPartyIds,
          systemResourceId_op: "in",
          systemResourceId_ic: "Y",
          systemPropertyId: "%trackingUrl%",
          systemPropertyId_op: "like",
          fieldsToSelect: ["systemResourceId", "systemPropertyId", "systemPropertyValue"]
        })

        if (!hasError(resp)) {
          resp.data?.map((doc: any) => {
            systemProperties[doc.systemResourceId.toUpperCase()] = doc.systemPropertyValue
          })
        } else {
          throw resp.data
        }
      } catch (error: any) {
        logger.error(error)
      }

      const utilStore = useUtilStore()
      carrierPartyIds.map((partyId: any) => {
        carriersTrackingInfo[partyId] = {
          carrierName: utilStore.getPartyName(partyId),
          trackingUrl: systemProperties[partyId.toUpperCase()] ? systemProperties[partyId.toUpperCase()] : ""
        }
      })

      this.updateCarrierTrackingUrls(carriersTrackingInfo)
      return carriersTrackingInfo
    },
    async getOrderDetails(orderId: any) {
      let order = {} as any

      try {
        const [orderResp, orderFacilityChangeResp, shipmentResp, itemResp] = await Promise.allSettled([
          OrderLookupService.fetchOrderDetail(orderId),
          OrderLookupService.fetchOrderFacilityChange({
            orderId,
            pageSize: 250,
            orderByField: "changeDatetime"
          }),
          OrderLookupService.findShipments(orderId),
          OrderLookupService.fetchOrderItems({
            orderId,
            pageSize: 100
          })
        ])

        if (orderResp.status === "fulfilled" && !hasError(orderResp.value)) {
          order = orderResp.value.data
          await useUtilStore().fetchEnumerations([order.salesChannelEnumId])
          order.salesChannel = useUtilStore().enumerations?.[order.salesChannelEnumId] || "-"

          order.billToPartyId = order.roles.find((role: any) => role.roleTypeId === "BILL_TO_CUSTOMER")?.partyId

          const partyInfo = await OrderLookupService.fetchPartyInformation({
            partyId: order.billToPartyId,
            pageSize: 1,
            fieldsToSelect: ["firstName", "lastName", "groupName"]
          })

          if (!hasError(partyInfo)) {
            const party = partyInfo?.data[0]
            order.partyName = party.groupName ? party.groupName : `${party.firstName ? party.firstName : ""} ${party.lastName ? party.lastName : ""}`
          }

          order.billingAddress = order.contactMechs?.find((contactMech: any) => contactMech.contactMechPurposeTypeId === "BILLING_LOCATION")?.postalAddress
          order.billingEmail = order.contactMechs?.find((contactMech: any) => contactMech.contactMechPurposeTypeId === "BILLING_EMAIL")?.contactMech?.infoString
          order.billingPhone = order.contactMechs?.find((contactMech: any) => contactMech.contactMechPurposeTypeId === "PHONE_BILLING")?.telecomNumber?.contactNumber
          order.shopifyOrderId = order.identifications?.find((identification: any) => identification.orderIdentificationTypeId === "SHOPIFY_ORD_ID")?.idValue

          order.orderAttributes = {}
          order.attributes?.map((attribute: any) => {
            order.orderAttributes[attribute.attrName.toLowerCase()] = attribute.attrValue
          })

          if (orderFacilityChangeResp.status === "fulfilled" && !hasError(orderFacilityChangeResp.value)) {
            order.shipGroupFacilityAllocationTime = {}
            order.firstBrokeredDate = orderFacilityChangeResp.value.data[0].changeDatetime
            orderFacilityChangeResp.value.data.map((brokeringInfo: any) => {
              order.shipGroupFacilityAllocationTime[brokeringInfo.shipGroupSeqId] = brokeringInfo.changeDatetime
            })
          }

          order.approvedDate = order.statuses.find((status: any) => status.statusId === "ORDER_APPROVED")?.statusDatetime
          order.completedDate = order.statuses.find((status: any) => status.statusId === "ORDER_COMPLETED")?.statusDatetime

          const paymentMethodTypeIds: Array<string> = []
          const statusIds: Array<string> = []
          order.orderPayments = order.paymentPreferences?.map((paymentPreference: any) => {
            paymentMethodTypeIds.push(paymentPreference.paymentMethodTypeId)
            statusIds.push(paymentPreference.statusId)
            return {
              amount: paymentPreference.maxAmount,
              methodTypeId: paymentPreference.paymentMethodTypeId,
              paymentStatus: paymentPreference.statusId
            }
          })
          useUtilStore().fetchStatusDesc(statusIds)

          if (paymentMethodTypeIds.length) {
            useUtilStore().fetchPaymentMethodTypeDesc(paymentMethodTypeIds)
          }

          let shipments = [] as any
          if (shipmentResp.status === "fulfilled" && !hasError(shipmentResp.value)) {
            shipments = shipmentResp.value.data.shipments
            shipments.map((shipment: any) => {
              if (shipment.carrierServiceStatusId === "SHRSCS_VOIDED") {
                shipment.trackingIdNumber = ""
              }
            })
          }

          const facilityIds = order.shipGroups.map((shipGroup: any) => shipGroup.facilityId)
          const facilityResp = await OrderLookupService.fetchFacilities({ facilityId: facilityIds, pageSize: facilityIds.length })

          if (itemResp.status === "fulfilled" && !hasError(itemResp.value)) {
            const orderItems = itemResp.value.data
            const shipGroupsWithItems: any[] = []

            order.shipGroups.forEach((shipGroup: any) => {
              shipGroup.shipGroupSeqId = shipGroup.shipGroupSeqId || "00001"
              shipGroup.facility = facilityResp?.data?.find((facility: any) => facility.facilityId === shipGroup.facilityId) || {}
              shipGroup.items = []
              shipGroup.items = orderItems.filter((item: any) => item.shipGroupSeqId === shipGroup.shipGroupSeqId)
              shipGroupsWithItems.push(shipGroup)
            })

            order.shipGroups = shipGroupsWithItems
          }

          order.shipments = shipments
          this.updateCurrent(order)
        }
      } catch (error) {
        commonUtil.showToast(translate("Something went wrong"))
        logger.error(error)
      }

      return order
    },
    async updateAppliedFilters(payload: any) {
      this.updateFilters(payload)
    }
  },
  persist: false
})
