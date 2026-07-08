import { api, commonUtil, emitter, logger, useShopify, useSolrSearch, translate } from "@common";
import { defineStore } from "pinia"
import { orderUtil } from "@/utils/orderUtil";

import { DateTime } from "luxon"
import { cogOutline } from "ionicons/icons";

import { useProductStore as useProduct } from "@/store/product"
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { useUtilStore } from "@/store/util"
import { useZebraPrinter } from "@/composables/useZebraPrinter";

interface OrderState {
  open: {
    list: any[]
    total: number
    query: {
      viewIndex: number
      viewSize: any
      queryString: string
      selectedShipmentMethods: any[]
      selectedCategories: any[]
    }
  }
  completed: {
    list: any[]
    total: number
    query: {
      viewIndex: number
      viewSize: any
      queryString: string
      selectedCarrierPartyId: string
      selectedShipmentMethods: any[]
    }
  }
  inProgress: {
    list: any[]
    total: number
    query: {
      viewIndex: number
      viewSize: any
      selectedPicklist: string
      queryString: string
    }
  }
  current: any
}

export const useOrderStore = defineStore("order", {
  state: (): OrderState => ({
    open: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: import.meta.env.VITE_VIEW_SIZE,
        queryString: "",
        selectedShipmentMethods: [],
        selectedCategories: []
      }
    },
    completed: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: import.meta.env.VITE_VIEW_SIZE,
        queryString: "",
        selectedCarrierPartyId: "",
        selectedShipmentMethods: []
      }
    },
    inProgress: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: import.meta.env.VITE_VIEW_SIZE,
        selectedPicklist: "",
        queryString: ""
      }
    },
    current: {}
  }),
  getters: {
    getOpenOrders(state) {
      return state.open
    },
    getInProgressOrders(state) {
      return state.inProgress
    },
    getCompletedOrders(state) {
      return state.completed
    },
    getCurrent(state) {
      return state.current
    }
  },
  actions: {
    setOpenOrders(payload: any) {
      this.open.list = payload.list
      this.open.total = payload.total
    },
    setOpenQuery(payload: any) {
      this.open.query = payload
    },
    clearOpenOrders() {
      this.open = {
        list: [],
        total: 0,
        query: {
          viewIndex: 0,
          viewSize: import.meta.env.VITE_VIEW_SIZE,
          queryString: "",
          selectedShipmentMethods: [],
          selectedCategories: []
        }
      }
    },
    setCompletedOrders(payload: any) {
      this.completed.list = payload.list
      this.completed.total = payload.total
    },
    setCompletedQuery(payload: any) {
      this.completed.query = payload
    },
    clearCompletedOrders() {
      this.completed = {
        list: [],
        total: 0,
        query: {
          viewIndex: 0,
          viewSize: import.meta.env.VITE_VIEW_SIZE,
          selectedCarrierPartyId: "",
          selectedShipmentMethods: [],
          queryString: ""
        }
      }
    },
    setInProgressOrders(payload: any) {
      this.inProgress.list = payload.orders
      this.inProgress.total = payload.total
    },
    setInProgressQuery(payload: any) {
      this.inProgress.query = payload
    },
    clearInProgressOrders() {
      this.inProgress = {
        list: [],
        total: 0,
        query: {
          viewIndex: 0,
          viewSize: import.meta.env.VITE_VIEW_SIZE,
          selectedPicklist: "",
          queryString: ""
        }
      }
    },
    setCurrent(payload: any) {
      this.current = payload
    },
    async findOpenOrders() {
      emitter.emit("presentLoader")

      const openOrderQuery = JSON.parse(JSON.stringify(this.open.query))
      openOrderQuery.groupBy = "orderItemShipGroupIdentifier"

      const { orders, total } = await this.searchOpenOrders({ openOrderQuery })

      const productIds = [
        ...new Set(orders.flatMap((order: any) => order.items.map((item: any) => item.productId)))
      ] as string[]
      useProduct().fetchProducts({ productIds })

      openOrderQuery.viewSize = orders.length
      this.setOpenQuery({ ...openOrderQuery })
      this.setOpenOrders({ list: orders, total: total })

      emitter.emit("dismissLoader")
    },
    async searchOpenOrders(payload: any) {
      const openOrderQuery = payload.openOrderQuery
      const shipGroupFilter = openOrderQuery.shipGroupFilter

      const params = {
        docType: 'ORDER',
        queryString: openOrderQuery.queryString,
        queryFields: 'productId productName parentProductName orderId orderName customerEmailId customerPartyId customerPartyName  search_orderIdentifications goodIdentifications',
        viewSize: openOrderQuery.viewSize,
        sort: openOrderQuery.sort ? openOrderQuery.sort : "orderDate asc",
        filters: {
          '-shipmentMethodTypeId': { value: ['STOREPICKUP', 'POS_COMPLETED'] },
          orderStatusId: { value: 'ORDER_APPROVED' },
          orderTypeId: { value: 'SALES_ORDER' },
          productStoreId: { value: useAppProductStore().getCurrentProductStore?.productStoreId }
        },
        solrFilters: [
          //it should be explicit what is subtracting the first part of your OR statement from
          "((*:* -fulfillmentStatus: [* TO *]) OR fulfillmentStatus:Created)",
          "entryDate:[2025-01-01T00:00:00Z TO *]"
        ]
      } as any
      if (!openOrderQuery.excludeFacilityFilter) {
        params.filters['facilityId'] = { value: useSolrSearch().escapeSolrSpecialChars(useAppProductStore().getCurrentFacility?.facilityId) }
      }
      if (shipGroupFilter && Object.keys(shipGroupFilter).length) {
        Object.assign(params.filters, shipGroupFilter);
      }

      if (openOrderQuery.orderId) {
        params.filters['orderId'] = { value: openOrderQuery.orderId }
      }
      if (openOrderQuery.shipGroupSeqId) {
        params.filters['shipGroupSeqId'] = { value: openOrderQuery.shipGroupSeqId }
      }

      if (openOrderQuery.groupBy) {
        params.isGroupingRequired = true
        params.groupBy = openOrderQuery.groupBy
      } else {
        params.isGroupingRequired = true
        params.groupBy = "orderId"
      }

      // only adding shipmentMethods when a method is selected
      if (openOrderQuery.selectedShipmentMethods && openOrderQuery.selectedShipmentMethods.length) {
        params.filters['shipmentMethodTypeId'] = { value: openOrderQuery.selectedShipmentMethods, op: 'OR' }
      }

      if (openOrderQuery.selectedCategories && openOrderQuery.selectedCategories.length) {
        params.filters['productCategories'] = { value: openOrderQuery.selectedCategories.map((category: string) => JSON.stringify(category)), op: 'OR' }
      }

      const orderQueryPayload = useSolrSearch().prepareSolrQuery(params)
      let orders = [], total = 0;

      try {
        const resp = await useSolrSearch().runSolrQuery(orderQueryPayload)
        if (!commonUtil.hasError(resp) && resp.data.grouped[params.groupBy]?.matches > 0) {
          total = resp.data.grouped[params.groupBy].ngroups
          orders = resp.data.grouped[params.groupBy].groups

          orders = orders.map((order: any) => {
            const orderItem = order.doclist.docs[0];

            return {
              category: 'open',
              customerId: orderItem.customerPartyId,
              customerName: orderItem.customerPartyName,
              orderId: orderItem.orderId,
              orderDate: orderItem.orderDate,
              orderName: orderItem.orderName,
              groupValue: order.groupValue,
              items: order.doclist.docs,
              shipGroupSeqId: orderItem.shipGroupSeqId,
              shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
              reservedDatetime: orderItem.reservedDatetime,
              facilityId: orderItem.facilityId,
              facilityName: orderItem.facilityName,
              facilityTypeId: orderItem.facilityTypeId
            }
          })
        }
      } catch (err) {
        logger.error('No outstanding orders found', err)
      }

      return { orders, total }
    },
    async findShipments(query: any) {
      const productStoreShipmentMethCount = useAppProductStore().getProductStoreShipmentMethCount;
      let orders = [], total = 0;

      try {
        const params = {
          pageSize: query.viewSize,
          orderBy: 'orderDate',
          shipmentTypeId: 'SALES_SHIPMENT',
          productStoreId: useAppProductStore().getCurrentProductStore?.productStoreId,
        } as any

        if (query.queryString) {
          params.keyword = query.queryString
        }
        if (!query.excludeFacilityFilter) {
          params.originFacilityId = useAppProductStore().getCurrentFacility?.facilityId
        }
        if (query.orderStatusId) {
          params.orderStatusId = query.orderStatusId
          if (Array.isArray(query.orderStatusId)) {
            params.orderStatusId_op = "in"
          }
        }
        if (query.statusId) {
          params.statusId = query.statusId
          if (Array.isArray(query.statusId)) {
            params.statusId_op = "in"
          }
        }
        if (query.orderId) {
          params.orderId = query.orderId
        }
        if (query.shipmentId) {
          params.shipmentId = query.shipmentId
        }
        // preparing filters separately those are based on some condition
        if (query.selectedPicklist) {
          params.picklistId = query.selectedPicklist
        }

        if (query.shippedDateFrom) {
          params.shippedDateFrom = query.shippedDateFrom
        }

        if (query.selectedCarrierPartyId) {
          params.carrierPartyId = query.selectedCarrierPartyId
        }

        // only adding shipmentMethods when a method is selected
        if (query.selectedShipmentMethods && query.selectedShipmentMethods.length) {
          params.shipmentMethodTypeIds = query.selectedShipmentMethods
        }

        const resp = await api({
          url: `/poorti/shipments`,
          method: "GET",
          params,
        }) as any;
        if (!commonUtil.hasError(resp)) {
          total = resp.data.shipmentCount
          orders = resp.data.shipments.map((shipment: any) => {
            const category = shipment.statusId === 'SHIPMENT_APPROVED' ? 'in-progress' : (shipment.statusId === 'SHIPMENT_PACKED' || shipment.statusId === 'SHIPMENT_SHIPPED') ? 'completed' : ""
            const shipmentPackageRouteSegDetails = shipment?.shipmentPackageRouteSegDetails?.filter((seg: any) => seg.carrierServiceStatusId !== "SHRSCS_VOIDED") || [];

            let missingLabelImage = false;
            if (productStoreShipmentMethCount > 0) {
              missingLabelImage = shipmentPackageRouteSegDetails.length === 0 || shipmentPackageRouteSegDetails.some((seg: any) => !seg.trackingCode);
            }

            shipment.shipmentPackages = shipment.shipmentPackages.map((shipmentPackage: any) => {
              const shipmentPackageRouteSegDetail = shipmentPackageRouteSegDetails.find(
                (detail: any) =>
                  shipmentPackage.shipmentId === detail.shipmentId &&
                  shipmentPackage.shipmentPackageSeqId === detail.shipmentPackageSeqId
              );
              return { ...shipmentPackage, ...shipmentPackageRouteSegDetail };
            });

            const customerName = (shipment.firstName && shipment.lastName) ? shipment.firstName + " " + shipment.lastName : shipment.firstName ? shipment.firstName : "";

            return {
              category,
              ...shipment,
              customerName,
              items: orderUtil.removeKitComponents(shipment),
              missingLabelImage,
              trackingCode: shipmentPackageRouteSegDetails[0]?.trackingCode,
            };
          });
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('No shipments found', err)
      }
      return { orders, total }
    },

    async findInProgressOrders() {
      const inProgressQuery = JSON.parse(JSON.stringify(this.inProgress.query))

      if (!inProgressQuery.hideLoader) emitter.emit("presentLoader")

      inProgressQuery.statusId = "SHIPMENT_APPROVED"
      inProgressQuery.orderStatusId = "ORDER_APPROVED"

      const { orders: inProgressOrders, total: inProgressTotal } = await this.findShipments(inProgressQuery)

      let orders = (inProgressOrders || []).map((order: any) => ({
        ...order,
        category: "in-progress",
        items: order.items.map((item: any) => {
          const packageName = order?.shipmentPackageRouteSegDetails.find(
            (shipmentPackageContent: any) => shipmentPackageContent.shipmentItemSeqId === item.shipmentItemSeqId
          )?.packageName || null
          return {
            ...item,
            selectedBox: packageName,
            currentBox: packageName
          }
        })
      }))

      const productIds = [...new Set(orders.flatMap((order: any) => order.items.map((item: any) => item.productId)))] as string[]
      const shipmentMethodTypeIds = [...new Set(orders.map((order: any) => order.shipmentMethodTypeId))] as string[]

      useProduct().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc(shipmentMethodTypeIds)
      orders = await this.fetchGiftCardActivationDetails({ isDetailsPage: false, currentOrders: orders })


      this.setInProgressQuery({ ...inProgressQuery })
      this.setInProgressOrders({ orders, total: inProgressTotal })

      emitter.emit("dismissLoader")
    },

    async findCompletedOrders() {
      emitter.emit("presentLoader")

      const completedOrderQuery = JSON.parse(JSON.stringify(this.completed.query))
      completedOrderQuery.statusId = ["SHIPMENT_PACKED"]
      completedOrderQuery.shippedDateFrom = DateTime.now().setZone(useAppProductStore().getCurrentFacility?.timeZone || DateTime.local().zoneName).startOf("day").toMillis()

      const { orders: completedOrders, total: completedTotal } = await this.findShipments(completedOrderQuery)

      let orders = (completedOrders || []).map((order: any) => ({
        ...order,
        category: "completed"
      }))

      const productIds = [...new Set(orders.flatMap((order: any) => order.items.map((item: any) => item.productId)))] as string[]
      const shipmentMethodTypeIds = [...new Set(orders.map((order: any) => order.shipmentMethodTypeId))] as string[]

      useProduct().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc(shipmentMethodTypeIds)
      orders = await this.fetchGiftCardActivationDetails({ isDetailsPage: false, currentOrders: orders })


      this.setCompletedQuery({ ...completedOrderQuery })
      this.setCompletedOrders({ list: orders, total: completedTotal })

      emitter.emit("dismissLoader")
    },

    async getOpenOrder(payload: any) {
      emitter.emit("presentLoader")

      const openOrderQuery = JSON.parse(JSON.stringify(this.open.query))
      openOrderQuery.orderId = payload.orderId
      openOrderQuery.shipGroupSeqId = payload.shipGroupSeqId
      openOrderQuery.viewSize = 1

      const { orders } = await this.searchOpenOrders({ openOrderQuery })
      const order = orders[0]

      const productIds = order.items.map((item: any) => item.productId)
      useProduct().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc([order.shipmentMethodTypeId])

      await this.updateCurrent(order)
      emitter.emit("dismissLoader")
    },
    async getInProgressOrder(payload: any) {
      emitter.emit("presentLoader")

      const inProgressQuery = JSON.parse(JSON.stringify(this.inProgress.query))
      inProgressQuery.orderId = payload.orderId
      inProgressQuery.shipmentId = payload.shipmentId
      inProgressQuery.statusId = "SHIPMENT_APPROVED"

      const { orders: inProgressOrders } = await this.findShipments(inProgressQuery)

      let order = inProgressOrders[0]

      order.category = "in-progress"

      order = {
        ...order,
        items: order.items.map((item: any) => {
          const packageName = order?.shipmentPackageRouteSegDetails.find(
            (shipmentPackageContent: any) => shipmentPackageContent.shipmentItemSeqId === item.shipmentItemSeqId
          )?.packageName || null
          return {
            ...item,
            selectedBox: packageName,
            currentBox: packageName
          }
        })
      }

      const productIds = order.items.map((item: any) => item.productId)
      useProduct().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc([order.shipmentMethodTypeId])
      order = await this.fetchGiftCardActivationDetails({ isDetailsPage: true, currentOrders: [order] })

      await this.updateCurrent(order)
      emitter.emit("dismissLoader")
    },
    async getCompletedOrder(payload: any) {
      emitter.emit("presentLoader")

      const completedOrderQuery = JSON.parse(JSON.stringify(this.completed.query))
      completedOrderQuery.orderId = payload.orderId
      completedOrderQuery.shipmentId = payload.shipmentId

      const { orders: completedOrders } = await this.findShipments(completedOrderQuery)

      let order = completedOrders[0]

      order.category = "completed"

      const productIds = order.items.map((item: any) => item.productId)
      useProduct().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc([order.shipmentMethodTypeId])
      order = await this.fetchGiftCardActivationDetails({ isDetailsPage: true, currentOrders: [order] })
      await this.updateCurrent(order)
      emitter.emit("dismissLoader")
    },
    async fetchOtherShipments() {
      let otherShipments: any[] = []
      const currentOrder = JSON.parse(JSON.stringify(this.current))
      const currentShipmentId = currentOrder.shipmentId
      const shipGroupSeqId = currentOrder.primaryShipGroupSeqId ? currentOrder.primaryShipGroupSeqId : currentOrder.shipGroupSeqId

      const openOrderQuery = JSON.parse(JSON.stringify(this.open.query))
      openOrderQuery.excludeFacilityFilter = true
      openOrderQuery.groupBy = "shipGroupSeqId"
      openOrderQuery.orderId = currentOrder.orderId
      openOrderQuery.viewIndex = 0
      openOrderQuery.viewSize = import.meta.env.VITE_VIEW_SIZE

      openOrderQuery.shipGroupFilter = { "-shipGroupSeqId": { value: shipGroupSeqId } }

      const { orders: openOrders } = await this.searchOpenOrders({ openOrderQuery })
      otherShipments = openOrders


      const shipmentQuery: any = {}
      shipmentQuery.viewSize = 50
      shipmentQuery.statusId = ["SHIPMENT_APPROVED", "SHIPMENT_PACKED", "SHIPMENT_SHIPPED"]
      shipmentQuery.orderId = currentOrder.orderId
      shipmentQuery.excludeFacilityFilter = true

      const { orders: shipmentOrders } = await this.findShipments(shipmentQuery)

      if (shipmentOrders && shipmentOrders.length) {
        const filteredShipments = shipmentOrders.filter((order: any) => order.shipmentId !== currentShipmentId)
        otherShipments = [...otherShipments, ...filteredShipments]
      }


      try {
        const resp = await api({
          url: "oms/entity-query",
          method: "post",
          data: {
            "entityName": "OrderItemAndShipGroupAssoc",
            "inputFields": {
              orderId: currentOrder.orderId,
              shipGroupSeqId: shipGroupSeqId,
              shipGroupSeqId_op: "equals",
              shipGroupSeqId_not: "Y",
            },
            "fieldToSelect": ["orderId", "orderItemseqId", "shipGroupSeqId", "productId"],
            "viewSize": 50,
            "noConditionFind": "Y"
          }
        }) as any;

        if (!commonUtil.hasError(resp)) {
          const allocatedOrderItemSeqIds = [
            ...new Set(otherShipments.flatMap((shipment: any) => shipment.items.map((item: any) => item.orderItemSeqId)))
          ]

          const pendingAllocationItems = resp.data.filter((item: any) => item.shipGroupSeqId !== shipGroupSeqId && !allocatedOrderItemSeqIds.includes(item.orderItemSeqId))
          if (pendingAllocationItems.length) {
            let facilityInfo = {} as any
            const facilityIds = [
              ...new Set(
                currentOrder.shipGroups
                  .filter((shipGroup: any) => shipGroup.shipGroupSeqId !== shipGroupSeqId)
                  .map((shipGroup: any) => shipGroup.facilityId)
              )
            ]
            if (facilityIds.length) {
              const facilityResp = await api({
                url: "/oms/facilities",
                method: "GET",
                params: {
                  facilityId: facilityIds,
                  facilityId_op: "in",
                  pageSize: 10
                }
              }) as any;
              if (!commonUtil.hasError(facilityResp)) {
                facilityInfo = facilityResp.data.reduce((facilityDetail: Record<string, any>, facility: any) => {
                  facilityDetail[facility.facilityId] = facility
                  return facilityDetail
                }, {})
              }
            }

            const pendingItemsByShipGroup = pendingAllocationItems.reduce((shipGroupDetail: any, item: any) => {
              const itemShipGroup = currentOrder.shipGroups.find((shipGroup: any) => shipGroup.shipGroupSeqId === item.shipGroupSeqId)
              const facility = facilityInfo[itemShipGroup.facilityId]
              const groupId = item.shipGroupSeqId
              if (!shipGroupDetail[groupId]) {
                shipGroupDetail[groupId] = {
                  ...item,
                  ...itemShipGroup,
                  facilityName: facility.facilityName,
                  facilityTypeId: facility.facilityTypeId,
                  items: []
                }
              }
              shipGroupDetail[groupId].items.push(item)
              return shipGroupDetail
            }, {})
            otherShipments = [...otherShipments, ...Object.values(pendingItemsByShipGroup)]
          }
        }
      } catch (err) {
        logger.error("Failed to fetch ship group info for order", err)
      }

      if (otherShipments.length) {
        const productIds = [...new Set(otherShipments.flatMap((shipment: any) => shipment.items?.map((item: any) => item.productId) || []))]
        useProduct().fetchProducts({ productIds })
      }

      const facilityTypeIds = otherShipments.map((shipment: any) => shipment.facilityTypeId)
      useUtilStore().fetchFacilityTypeInformation(facilityTypeIds)

      const carrierPartyIds = otherShipments.map((shipment: any) => shipment.carrierPartyId).filter((id: any) => id)
      useUtilStore().fetchPartyInformation([...new Set(carrierPartyIds)])

      currentOrder.otherShipGroups = otherShipments
      this.setCurrent(currentOrder)
    },
    async fetchGiftCardActivationDetails({ isDetailsPage, currentOrders }: { isDetailsPage: boolean; currentOrders: any[] }) {
      const orders = JSON.parse(JSON.stringify(currentOrders))
      const orderIds: any[] = []
      let giftCardActivations: any[] = []

      if (isDetailsPage) {
        orderIds.push(orders[0].orderId)
      } else {
        orders.map((order: any) => {
          order.items.map((item: any) => {
            if (item.productTypeId === "GIFT_CARD" && !orderIds.includes(item.orderId)) {
              orderIds.push(item.orderId)
            }
          })
        })
      }

      if (!orderIds.length) return orders

      try {
        const resp = await api({
          url: `/poorti/giftCardFulfillments`,
          method: "GET",
          params: {
            orderId: orderIds,
            orderId_op: "in",
            fieldsToSelect: ["amount", "cardNumber", "fulfillmentDate", "orderId", "orderItemSeqId"],
            pageSize: 250
          }
        }) as any;

        if (!commonUtil.hasError(resp)) {
          giftCardActivations = resp.data
        } else {
          throw resp.data
        }
      } catch (error) {
        logger.error(error)
      }

      if (giftCardActivations.length) {
        if (isDetailsPage) {
          orders[0].items.map((item: any) => {
            const activationRecord = giftCardActivations.find((card: any) => card.orderId === item.orderId && card.orderItemSeqId === item.orderItemSeqId)
            if (activationRecord?.cardNumber) {
              item.isGCActivated = true
              item.gcInfo = activationRecord
            }
          })
        } else {
          orders.map((order: any) => {
            order.items.map((item: any) => {
              const activationRecord = giftCardActivations.find((card: any) => card.orderId === item.orderId && card.orderItemSeqId === item.orderItemSeqId)
              if (activationRecord?.cardNumber) {
                item.isGCActivated = true
                item.gcInfo = activationRecord
              }
            })
          })
        }
      }

      return isDetailsPage ? orders[0] : orders
    },
    async updateCurrentItemGCActivationDetails({ item, category, isDetailsPage }: { item: any; category: string; isDetailsPage: boolean }) {
      let gcInfo = {}
      let isGCActivated = false

      try {
        const resp = await api({
          url: `/poorti/giftCardFulfillments`,
          method: "GET",
          params: {
            orderId: item.orderId,
            orderItemSeqId: item.orderItemSeqId,
            fieldsToSelect: ["amount", "cardNumber", "fulfillmentDate", "orderId", "orderItemSeqId"],
            pageSize: 1
          }
        }) as any;

        if (!commonUtil.hasError(resp)) {
          isGCActivated = true
          gcInfo = resp.data[0]
        } else {
          throw resp.data
        }
      } catch (error) {
        logger.error(error)
      }

      if (!isGCActivated) return

      const orders = JSON.parse(JSON.stringify(category === "in-progress" ? this.inProgress.list : this.completed.list))

      if (isDetailsPage) {
        const order = JSON.parse(JSON.stringify(this.current))

        order.items?.map((currentItem: any) => {
          if (currentItem.orderId === item.orderId && currentItem.orderItemSeqId === item.orderItemSeqId) {
            currentItem.isGCActivated = true
            currentItem.gcInfo = gcInfo
          }
        })

        orders.map((currentOrder: any) => {
          if (currentOrder.orderId === order.orderId) currentOrder.items = order.items
        })

        if (category === "in-progress") {
          this.setInProgressOrders({ orders, total: this.inProgress.total })
        } else {
          this.setCompletedOrders({ list: orders, total: this.completed.total })
        }

        this.setCurrent(order)
        return
      }

      orders.map((order: any) => {
        order.items.map((currentItem: any) => {
          if (currentItem.orderId === item.orderId && currentItem.orderItemSeqId === item.orderItemSeqId) {
            currentItem.isGCActivated = true
            currentItem.gcInfo = gcInfo
          }
        })
      })

      if (category === "in-progress") {
        this.setInProgressOrders({ orders, total: this.inProgress.total })
      } else {
        this.setCompletedOrders({ list: orders, total: this.completed.total })
      }
    },
    async updateShipmentPackageDetail(payload: any) {
      let currentOrder = JSON.parse(JSON.stringify(this.current))
      const completedOrders = JSON.parse(JSON.stringify(this.completed.list))
      const inProgressOrders = JSON.parse(JSON.stringify(this.inProgress.list))

      try {
        if (!payload.shipmentId) {
          return currentOrder
        }

        const resp = await api({
          url: `/poorti/shipmentPackageRouteSegDetails`,
          method: "GET",
          params: { shipmentId: payload.shipmentId, pageSize: 10 },
        }) as any;

        if (!commonUtil.hasError(resp)) {
          const responseData = resp.data?.shipmentPackageRouteSegDetails || resp.data
          const shipmentPackageRouteSegDetails = responseData.filter((shipmentPackageRouteSegDetail: any) => shipmentPackageRouteSegDetail.carrierServiceStatusId !== "SHRSCS_VOIDED")

          let missingLabelImage = false
          if (useAppProductStore().productStoreShipmentMethCount > 0) {
            missingLabelImage = shipmentPackageRouteSegDetails.length === 0 || shipmentPackageRouteSegDetails.some((seg: any) => !seg.trackingCode)
          }

          const shipmentPackages = payload.shipmentPackages.map((shipmentPackage: any) => {
            const shipmentPackageRouteSegDetail = shipmentPackageRouteSegDetails.find(
              (detail: any) => shipmentPackage.shipmentId === detail.shipmentId && shipmentPackage.shipmentPackageSeqId === detail.shipmentPackageSeqId
            )
            return { ...shipmentPackage, ...shipmentPackageRouteSegDetail }
          })

          const updateShipmentPackages = (order: any) => {
            order.shipmentPackageRouteSegDetails = responseData
            order.shipmentPackages = shipmentPackages
            order.labelImageUrl = shipmentPackageRouteSegDetails[0]?.labelImageUrl
            order.carrierPartyId = responseData[0]?.carrierPartyId
            order.shipmentMethodTypeId = responseData[0]?.shipmentMethodTypeId
            order.trackingCode = shipmentPackageRouteSegDetails[0]?.trackingCode
            order.isTrackingRequired = responseData[0]?.isTrackingRequired
            order.missingLabelImage = missingLabelImage
            order.gatewayMessage = responseData[0]?.gatewayMessage
          }

          if (currentOrder && currentOrder.shipmentId === payload.shipmentId) {
            updateShipmentPackages(currentOrder)
            this.setCurrent(currentOrder)
          }

          if (completedOrders && completedOrders.length > 0) {
            const order = completedOrders.find((completedOrder: any) => completedOrder.shipmentId === payload.shipmentId)
            if (order) {
              updateShipmentPackages(order)
              currentOrder = order
              this.setCompletedOrders({ list: completedOrders, total: this.completed.total })
            }
          }
          if (inProgressOrders && inProgressOrders.length > 0) {
            const order = inProgressOrders.find((inProgressOrder: any) => inProgressOrder.shipmentId === payload.shipmentId)
            if (order) {
              updateShipmentPackages(order)
              currentOrder = order
              this.setInProgressOrders({ orders: inProgressOrders, total: this.inProgress.total })
            }
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch shipment packages.", err)
      }
      return currentOrder
    },
    async fetchOrderDetail(orderId?: string) {
      const id = orderId || this.current.orderId;
      if (!id) return;
      let order = orderId ? { orderId } : JSON.parse(JSON.stringify(this.current))

      try {
        const resp = await api({
          url: `/poorti/orders/${id}`,
          method: "GET"
        }) as any;
        if (!commonUtil.hasError(resp)) {

          const shipGroupSeqId = order.primaryShipGroupSeqId ? order.primaryShipGroupSeqId : order.shipGroupSeqId
          const currentShipGroup = resp.data.shipGroups.find((shipGroup: any) => shipGroup.shipGroupSeqId === shipGroupSeqId)
          let shippingAddress = resp.data.contactMechs?.find((contactMech: any) => contactMech.contactMechPurposeTypeId === "SHIPPING_LOCATION")?.postalAddress
          let telecomNumber = resp.data.contactMechs?.find((contactMech: any) => contactMech.contactMechPurposeTypeId === "PHONE_SHIPPING")?.telecomNumber

          if (currentShipGroup?.shipmentMethodTypeId === "SHIP_TO_STORE") {
            const facilityId = currentShipGroup.orderFacilityId || currentShipGroup.facilityId
            const facilityContactResp = await api({
              url: `/oms/facilityContactMechs`,
              method: "GET",
              params: { facilityId }
            }) as any;
            if (!commonUtil.hasError(facilityContactResp)) {
              const { data } = facilityContactResp
              const address = data.facilityContactMechs?.find((contactMech: any) => contactMech.contactMechId === (order.destinationContactMechId || currentShipGroup.contactMechId))
              if (address) {
                shippingAddress = {
                  ...address,
                  stateName: address.stateGeoName,
                  countryName: address.countryGeoName,
                  toName: currentShipGroup.facilityName || address.facilityName || address.toName || shippingAddress?.toName
                }
                const { contactNumber } = data.facilityContactMechs.find((contactMech: any) => contactMech.contactMechId === currentShipGroup.telecomContactMechId) || {}
                if (contactNumber) telecomNumber = { contactNumber }
              }
            } else {
              logger.error(`Failed to fetch facility addresses for facility ${facilityId}`, facilityContactResp.data)
            }
          }

          order = {
            ...order,
            shipGroups: resp.data.shipGroups,
            paymentPreferences: resp.data.paymentPreferences,
            currencyUom: resp.data.currencyUom,
            adjustments: resp.data.adjustments,
            attributes: resp.data.attributes,
            shippingAddress,
            telecomNumber
          }
          if (order.paymentPreferences.length > 0) {
            const paymentMethodTypeIds = order?.paymentPreferences.map((orderPaymentPreference: any) => orderPaymentPreference.paymentMethodTypeId)
            if (paymentMethodTypeIds.length > 0) {
              useUtilStore().fetchPaymentMethodTypeDesc(paymentMethodTypeIds)
            }

            const statusIds = order?.paymentPreferences.map((orderPaymentPreference: any) => orderPaymentPreference.statusId)
            if (statusIds.length > 0) {
              useUtilStore().fetchStatusDesc(statusIds)
            }
          }
        }
      } catch (err: any) {
        logger.error("Error in fetching order detail for current order", err)
      }
      this.setCurrent(order)
      const data = JSON.parse(JSON.stringify(order))
      delete data.shippingAddress
      delete data.telecomNumber
      return { data };
    },
    async updateOpenOrders(payload: any) {
      this.setOpenOrders({ list: payload?.orders, total: payload?.total })
    },
    async updateOpenQuery(payload: any) {
      this.setOpenQuery(payload)
      await this.findOpenOrders()
    },
    async updateOpenOrderQuery(payload: any) {
      this.setOpenQuery(payload)
    },
    async updateInProgressQuery(payload: any) {
      this.setInProgressQuery(payload)
      await this.findInProgressOrders()
    },
    updateInProgressOrder(updatedOrder: any) {
      const orders = this.inProgress.list.map((order: any) => {
        if (updatedOrder.shipmentId === order.shipmentId) {
          return {
            ...order,
            ...updatedOrder
          }
        }
        return order
      })

      this.setInProgressOrders({ orders, total: this.inProgress.total })
    },
    async updateCompletedQuery(payload: any) {
      this.setCompletedQuery(payload)
      await this.findCompletedOrders()
    },
    async updateInProgressIndex(payload: any) {
      this.setInProgressQuery(payload)
    },
    async updateCompletedOrderIndex(payload: any) {
      this.setCompletedQuery(payload)
    },
    async updateOpenOrderIndex(payload: any) {
      this.setOpenQuery(payload)
    },
    async updateCurrent(order: any) {
      this.setCurrent(order)
      await this.fetchOrderDetail()
      await this.fetchOtherShipments()
    },
    async clearOrders() {
      this.clearInProgressOrders()
      this.clearOpenOrders()
      this.clearCompletedOrders()
      this.setCurrent({})
    },
    async createPicklist(payload: any) {
      return api({
        url: `/poorti/createOrderFulfillmentWave`,
        method: "POST",
        data: payload,
      });
    },
    async recycleOutstandingOrders(payload: any) {
      return api({
        url: `/poorti/rejectOutstandingOrders`,
        method: "POST",
        data: payload,
      });
    },
    async fetchShipmentFacets(params: any) {
      return api({
        url: `/poorti/shipmentFacets`,
        method: "GET",
        params
      });
    },
    async fetchPicklists(payload: any) {
      return api({
        url: `/poorti/shipmentPicklists`,
        method: "GET",
        params: payload
      });
    },
    async recycleInProgressOrders(payload: any) {
      return api({
        url: `/poorti/rejectInProgressOrders`,
        method: "POST",
        data: payload,
      });
    },
    async packOrder(payload: any) {
      return api({
        url: `/poorti/shipments/${payload.shipmentId}/pack`,
        method: "POST",
        data: payload,
      });
    },
    async packOrders(payload: any) {
      return api({
        url: `/poorti/shipments/bulkPack`,
        method: "POST",
        data: payload,
      });
    },
    async resetPicker(payload: any) {
      return api({
        url: `/poorti/picklists/${payload.picklistId}`,
        method: "PUT",
        data: payload,
      });
    },
    async addShipmentBox(payload: any) {
      return api({
        url: `/poorti/shipments/${payload.shipmentId}/shipmentPackages`,
        method: "POST",
        data: payload,
      });
    },
    async shipOrder(payload: any) {
      return api({
        url: `/poorti/shipments/${payload.shipmentId}/ship`,
        method: "POST",
        data: payload,
      });
    },
    async bulkShipOrders(payload: any) {
      return api({
        url: `/poorti/shipments/bulkShip`,
        method: "POST",
        data: payload,
      });
    },
    async unpackOrder(payload: any) {
      return api({
        url: `/poorti/shipments/${payload.shipmentId}/unpack`,
        method: "post",
        data: payload,
      });
    },
    async retryShippingLabel(shipmentId: string) {
      try {
        const resp = await api({
          url: `/poorti/shipments/retryShippingLabel`,
          method: "post",
          data: { shipmentIds: [shipmentId] }
        }) as any;
        if (commonUtil.hasError(resp)) {
          throw resp?.data;
        }
      } catch (error) {
        logger.error(error)
      }
    },
    async fetchShipmentLabelError(shipmentId: string) {
      let shipmentLabelError = ""
      try {
        if (!shipmentId) {
          return shipmentLabelError
        }
        const resp = await api({
          url: `/poorti/shipmentPackageRouteSegDetails`,
          method: "GET",
          params: { shipmentId, pageSize: 10 }
        }) as any;
        if (commonUtil.hasError(resp)) {
          throw resp.data;
        }
        const responseData = resp.data?.shipmentPackageRouteSegDetails || resp.data;
        shipmentLabelError = responseData.find((shipmentPackageRouteSegDetail: any) => shipmentPackageRouteSegDetail.gatewayMessage)?.gatewayMessage;
      } catch (err) {
        logger.error('Failed to fetch shipment label error', err)
      }
      return shipmentLabelError;
    },
    async voidShipmentLabel(payload: any) {
      return await api({
        url: `/poorti/shipments/${payload.shipmentId}/shippingLabels/void`,
        method: "POST",
        data: payload,
      });
    },
    async updateShipmentCarrierAndMethod(payload: any) {
      return await api({
        url: `/poorti/updateShipmentCarrierAndMethod`,
        method: "PUT",
        data: payload,
      });
    },
    async updateRouteShipmentCarrierAndMethod(payload: any) {
      return await api({
        url: `/poorti/updateRouteShipmentCarrierAndMethod`,
        method: "PUT",
        data: payload,
      });
    },
    async findOrderInvoicingInfo(payload: any) {
      return api({
        url: "/oms/dataDocumentView",
        method: "post",
        data: payload,
      });
    },
    async updateOrderHeader(payload: any) {
      return api({
        url: `/oms/orders/${payload.orderId}`,
        method: "PUT",
        data: payload
      });
    },
    async updateOrderFacility(payload: any) {
      return api({
        url: `/oms/orders/${payload.orderId}/shipGroups/${payload.shipGroupSeqId}`,
        method: "PUT",
        data: payload
      });
    },
    async fetchShipmentPackageRouteSegDetails(params: any) {
      return await api({
        url: `/poorti/shipmentPackageRouteSegDetails`,
        method: "GET",
        params,
      });
    },
    async activateGiftCard(payload: any) {
      return api({
        url: `/poorti/giftCardFulfillments`,
        method: "POST",
        data: payload,
      });
    },
    async fetchOrderItems(payload: any) {
      return api({
        url: `/oms/orders/${payload.orderId}/items`,
        method: "GET",
        params: payload
      });
    },
    async createCommunicationEvent(payload: any) {
      return api({
        url: "/oms/communicationEvents",
        method: "POST",
        data: payload,
      });
    },
    async downloadPicklist(picklistId: string) {
      const resp = await api({
        url: `/poorti/Picklist.csv`,
        method: "GET",
        params: { picklistId },
      }) as any;
      const fileName = `Picklist-${picklistId}.csv`
      await commonUtil.downloadCsv(resp.data, fileName);
    },
    async printPicklist(picklistId: string) {
      try {
        const isPicklistDownloadEnabled = useProductStore().isProductStoreSettingEnabled("FF_DOWNLOAD_PICKLIST")
        if (isPicklistDownloadEnabled) {
          await this.downloadPicklist(picklistId)
          return;
        }

        const resp = await api({
          url: "/fop/apps/pdf/PrintPicklist",
          method: "GET",
          baseURL: commonUtil.getMaargBaseURL(),
          responseType: "blob",
          params: { picklistId }
        }) as any;

        if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
          throw resp.data;
        }

        const pdfUrl = window.URL.createObjectURL(resp.data);
        try {
          if (commonUtil.isAppEmbedded()) {
            useShopify().redirect(pdfUrl);
          } else {
            window.open(pdfUrl, "_blank")?.focus();
          }
        }
        catch {
          commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'picklist' }), { icon: cogOutline });
        }
      } catch (err) {
        commonUtil.showToast(translate('Failed to print picklist'))
        logger.error("Failed to print picklist", err)
      }
    },
    async printPackingSlip(shipmentIds: Array<string>) {
      try {
        const resp = await api({
          url: "/fop/apps/pdf/PrintPackingSlip",
          method: "GET",
          baseURL: commonUtil.getMaargBaseURL(),
          params: {
            shipmentId: shipmentIds
          },
          responseType: "blob"
        }) as any;

        if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
          throw resp.data
        }

        const pdfUrl = window.URL.createObjectURL(resp.data);
        try {
          (window as any).open(pdfUrl, "_blank").focus();
        }
        catch {
          commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'packing slip' }), { icon: cogOutline });
        }

      } catch (err) {
        commonUtil.showToast(translate('Failed to print packing slip'))
        logger.error("Failed to load packing slip", err)
      }
    },
    async printShippingLabel(shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string) {
      try {
        let pdfUrls = shippingLabelPdfUrls;
        if (!pdfUrls || pdfUrls.length == 0) {
          const utilStore = useUtilStore();
          const zebraPrinter = useZebraPrinter();
          let labelImageType = imageType || "PNG";

          if (!imageType && shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
            labelImageType = await utilStore.fetchLabelImageType(shipmentPackages[0].carrierPartyId);
          }

          const labelImages = [] as Array<string>
          if (labelImageType === "ZPLII") {
            shipmentPackages?.map((shipmentPackage: any) => {
              shipmentPackage.labelImage && labelImages.push(shipmentPackage.labelImage)
            })
            await zebraPrinter.printZplLabels(labelImages);
            return;
          }
          const resp = await api({
            url: "/fop/apps/pdf/PrintLabel",
            method: "GET",
            baseURL: commonUtil.getMaargBaseURL(),
            params: {
              shipmentId: shipmentIds
            },
            responseType: "blob"
          }) as any;

          if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
            throw resp.data;
          }

          const pdfUrl = window.URL.createObjectURL(resp.data);
          pdfUrls = [pdfUrl];
        }
        pdfUrls.forEach((pdfUrl: string) => {
          try {
            (window as any).open(pdfUrl, "_blank").focus();
          }
          catch {
            commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'shipping label' }), { icon: cogOutline });
          }
        })

      } catch (err) {
        commonUtil.showToast(translate('Failed to print shipping label'))
        logger.error("Failed to load shipping label", err)
      }
    },
    async printCustomDocuments(internationalInvoiceUrls: Array<string>) {
      if (!internationalInvoiceUrls || internationalInvoiceUrls.length === 0) {
        return;
      }
      try {
        internationalInvoiceUrls.forEach((url: string) => {
          try {
            (window as any).open(url, "_blank").focus();
          } catch {
            commonUtil.showToast(translate('Unable to open as the browser is blocking pop-ups.', { documentName: 'custom document' }), { icon: cogOutline });
          }
        });
      } catch (err) {
        commonUtil.showToast(translate('Failed to print custom document'));
        logger.error("Failed to load custom document", err);
      }
    },
    async printShippingLabelAndPackingSlip(shipmentIds: Array<string>, shipmentPackages: any) {
      let labelImageType = "PNG";
      if (shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
        labelImageType = await useUtilStore().fetchLabelImageType(shipmentPackages[0].carrierPartyId);
      }

      if (labelImageType === "ZPLII") {
        await this.printShippingLabel(shipmentIds, [], shipmentPackages, labelImageType)
        await this.printPackingSlip(shipmentIds)
        return;
      }

      try {
        const resp = await api({
          url: "/fop/apps/pdf/PrintPackingSlipAndLabel",
          method: "GET",
          baseURL: commonUtil.getMaargBaseURL(),
          params: {
            shipmentId: shipmentIds
          },
          responseType: "blob"
        }) as any;

        if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
          throw resp.data;
        }

        const pdfUrl = window.URL.createObjectURL(resp.data);
        try {
          (window as any).open(pdfUrl, "_blank").focus();
        }
        catch {
          commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'shipping label and packing slip' }), { icon: cogOutline });
        }

      } catch (err) {
        commonUtil.showToast(translate('Failed to print shipping label and packing slip'))
        logger.error("Failed to load shipping label and packing slip", err)
      }
    },
    async addTrackingCode(payload: any) {
      return await api({
        url: `/poorti/updateShipmentTracking`,
        method: "PUT",
        data: payload
      });
    },
    async deleteOrderItem(payload: any) {
      return api({
        url: `/oms/orders/${payload.orderId}/items/${payload.orderItemSeqId}`,
        method: "DELETE",
      });
    },
    async fetchGiftCardItemPriceInfo(payload: any) {
      const currentOrder = this.getCurrent;

      let resp = {} as any;
      const itemPriceInfo = {} as any;

      try {
        if (currentOrder && Object.keys(currentOrder).length) {
          itemPriceInfo.currencyUom = currentOrder.currencyUom
        } else {
          resp = await this.fetchOrderDetail(payload.orderId);
          if (!commonUtil.hasError(resp)) {
            itemPriceInfo.currencyUom = resp.data.currencyUom
          } else {
            throw resp.data
          }
        }

        resp = await api({
          url: `/oms/orders/${payload.orderId}/items/${payload.orderItemSeqId}`,
          method: "GET",
          params: { fieldsToSelect: ["unitPrice"] }
        });
        if (!commonUtil.hasError(resp)) {
          itemPriceInfo.unitPrice = resp.data[0].unitPrice
        } else {
          throw resp.data
        }
      } catch (error: any) {
        logger.error(error);
      }

      return itemPriceInfo;
    }

  },

  persist: false
})
