import { defineStore } from "pinia"
import emitter from "@/event-bus"
import { OrderService } from "@/services/OrderService"
import { UtilService } from "@/services/UtilService"
import { hasError } from "@/adapter"
import logger from "@/logger"
import { DateTime } from "luxon"
import { useProductStore } from "@/store/product"
import { useUtilStore } from "@/store/util"

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
        viewSize: process.env.VUE_APP_VIEW_SIZE,
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
        viewSize: process.env.VUE_APP_VIEW_SIZE,
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
        viewSize: process.env.VUE_APP_VIEW_SIZE,
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
          viewSize: process.env.VUE_APP_VIEW_SIZE,
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
          viewSize: process.env.VUE_APP_VIEW_SIZE,
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
          viewSize: process.env.VUE_APP_VIEW_SIZE,
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
      const resp = await OrderService.findOpenOrders({ openOrderQuery })

      const productIds = [
        ...new Set(resp.orders.flatMap((order: any) => order.items.map((item: any) => item.productId)))
      ]
      useProductStore().fetchProducts({ productIds })

      openOrderQuery.viewSize = resp?.orders?.length
      this.setOpenQuery({ ...openOrderQuery })
      this.setOpenOrders({ list: resp?.orders, total: resp?.total })

      emitter.emit("dismissLoader")
    },
    async findInProgressOrders() {
      const inProgressQuery = JSON.parse(JSON.stringify(this.inProgress.query))

      if (!inProgressQuery.hideLoader) emitter.emit("presentLoader")
      let orders: any[] = []

      inProgressQuery.statusId = "SHIPMENT_APPROVED"
      inProgressQuery.orderStatusId = "ORDER_APPROVED"
      const resp = await OrderService.findShipments(inProgressQuery)
      orders = (resp.orders || []).map((order: any) => ({
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

      const productIds = [...new Set(orders.flatMap((order: any) => order.items.map((item: any) => item.productId)))]
      const shipmentMethodTypeIds = [...new Set(orders.map((order: any) => order.shipmentMethodTypeId))]

      useProductStore().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc(shipmentMethodTypeIds)
      orders = await this.fetchGiftCardActivationDetails({ isDetailsPage: false, currentOrders: orders })

      inProgressQuery.viewSize = orders?.length
      this.setInProgressQuery({ ...inProgressQuery })
      this.setInProgressOrders({ orders, total: resp.total })

      emitter.emit("dismissLoader")
    },
    async findCompletedOrders() {
      emitter.emit("presentLoader")
      let orders: any[] = []

      const completedOrderQuery = JSON.parse(JSON.stringify(this.completed.query))
      completedOrderQuery.statusId = ["SHIPMENT_PACKED"]
      completedOrderQuery.shippedDateFrom = DateTime.now().startOf("day").toMillis()
      const resp = await OrderService.findShipments(completedOrderQuery)
      orders = (resp.orders || []).map((order: any) => ({
        ...order,
        category: "completed"
      }))

      const productIds = [...new Set(orders.flatMap((order: any) => order.items.map((item: any) => item.productId)))]
      const shipmentMethodTypeIds = [...new Set(orders.map((order: any) => order.shipmentMethodTypeId))]

      useProductStore().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc(shipmentMethodTypeIds)
      orders = await this.fetchGiftCardActivationDetails({ isDetailsPage: false, currentOrders: orders })

      completedOrderQuery.viewSize = orders?.length
      this.setCompletedQuery({ ...completedOrderQuery })
      this.setCompletedOrders({ list: orders, total: resp.total })

      emitter.emit("dismissLoader")
    },
    async getOpenOrder(payload: any) {
      emitter.emit("presentLoader")

      const openOrderQuery = JSON.parse(JSON.stringify(this.open.query))
      openOrderQuery.orderId = payload.orderId
      openOrderQuery.shipGroupSeqId = payload.shipGroupSeqId
      openOrderQuery.viewSize = 1

      const resp = await OrderService.findOpenOrders({ openOrderQuery })
      const order = resp?.orders[0]

      const productIds = order.items.map((item: any) => item.productId)
      useProductStore().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc([order.shipmentMethodTypeId])

      await this.updateCurrent(order)
      emitter.emit("dismissLoader")
    },
    async getInProgressOrder(payload: any) {
      emitter.emit("presentLoader")
      let order: any = {}

      const inProgressQuery = JSON.parse(JSON.stringify(this.inProgress.query))
      inProgressQuery.orderId = payload.orderId
      inProgressQuery.shipmentId = payload.shipmentId
      inProgressQuery.statusId = "SHIPMENT_APPROVED"

      const resp = await OrderService.findShipments(inProgressQuery)

      order = resp.orders[0]
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
      useProductStore().fetchProducts({ productIds })
      useUtilStore().fetchShipmentMethodTypeDesc([order.shipmentMethodTypeId])
      order = await this.fetchGiftCardActivationDetails({ isDetailsPage: true, currentOrders: [order] })

      await this.updateCurrent(order)
      emitter.emit("dismissLoader")
    },
    async getCompletedOrder(payload: any) {
      emitter.emit("presentLoader")
      let order: any = {}

      const completedOrderQuery = JSON.parse(JSON.stringify(this.completed.query))
      completedOrderQuery.orderId = payload.orderId
      completedOrderQuery.shipmentId = payload.shipmentId
      completedOrderQuery.statusId = ["SHIPMENT_PACKED"]
      completedOrderQuery.shippedDateFrom = DateTime.now().startOf("day").toMillis()

      const resp = await OrderService.findShipments(completedOrderQuery)
      order = resp?.orders[0]
      order.category = "completed"

      const productIds = order.items.map((item: any) => item.productId)
      useProductStore().fetchProducts({ productIds })
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
      openOrderQuery.viewSize = process.env.VUE_APP_VIEW_SIZE

      openOrderQuery.shipGroupFilter = { "-shipGroupSeqId": { value: shipGroupSeqId } }
      const openOrderResp = await OrderService.findOpenOrders({ openOrderQuery })
      if (openOrderResp.orders && openOrderResp.orders.length) {
        otherShipments = openOrderResp.orders
      }

      const shipmentQuery: any = {}
      shipmentQuery.viewSize = 50
      shipmentQuery.statusId = ["SHIPMENT_APPROVED", "SHIPMENT_PACKED", "SHIPMENT_SHIPPED"]
      shipmentQuery.orderId = currentOrder.orderId
      shipmentQuery.excludeFacilityFilter = true
      const resp = await OrderService.findShipments(shipmentQuery)

      if (resp.orders && resp.orders.length) {
        const filteredShipments = resp.orders.filter((order: any) => order.shipmentId !== currentShipmentId)
        otherShipments = [...otherShipments, ...filteredShipments]
      }

      try {
        const resp = await OrderService.fetchOrderItems({
          orderId: currentOrder.orderId,
          shipGroupSeqId,
          shipGroupSeqId_op: "equals",
          shipGroupSeqId_not: "Y",
          pageSize: 50,
          fieldsToSelect: ["orderId", "orderItemseqId", "shipGroupSeqId", "productId"]
        })
        if (!hasError(resp)) {
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
              const facilityResp = await UtilService.fetchFacilities({
                facilityId: facilityIds,
                facilityId_op: "in",
                pageSize: 10
              })
              if (!hasError(facilityResp)) {
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
        useProductStore().fetchProducts({ productIds })
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
        const resp = await UtilService.fetchGiftCardFulfillmentInfo({
          orderId: orderIds,
          orderId_op: "in",
          fieldsToSelect: ["amount", "cardNumber", "fulfillmentDate", "orderId", "orderItemSeqId"],
          pageSize: 250
        })

        if (!hasError(resp)) {
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
        const resp = await UtilService.fetchGiftCardFulfillmentInfo({
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          fieldsToSelect: ["amount", "cardNumber", "fulfillmentDate", "orderId", "orderItemSeqId"],
          pageSize: 1
        })

        if (!hasError(resp)) {
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

        const resp = await OrderService.fetchShipmentPackageRouteSegDetails({ shipmentId: payload.shipmentId, pageSize: 10 }) as any
        if (!hasError(resp)) {
          const responseData = resp.data?.shipmentPackageRouteSegDetails || resp.data
          const shipmentPackageRouteSegDetails = responseData.filter((shipmentPackageRouteSegDetail: any) => shipmentPackageRouteSegDetail.carrierServiceStatusId !== "SHRSCS_VOIDED")

          let missingLabelImage = false
          if (useUtilStore().productStoreShipmentMethCount > 0) {
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
    async fetchOrderDetail() {
      let order = JSON.parse(JSON.stringify(this.current))

      try {
        const resp = await OrderService.fetchOrderDetail(order.orderId)
        if (!hasError(resp)) {
          const shipGroupSeqId = order.primaryShipGroupSeqId ? order.primaryShipGroupSeqId : order.shipGroupSeqId
          const currentShipGroup = resp.data.shipGroups.find((shipGroup: any) => shipGroup.shipGroupSeqId === shipGroupSeqId)
          let shippingAddress = resp.data.contactMechs?.find((contactMech: any) => contactMech.contactMechPurposeTypeId === "SHIPPING_LOCATION")?.postalAddress
          let telecomNumber = resp.data.contactMechs?.find((contactMech: any) => contactMech.contactMechPurposeTypeId === "PHONE_SHIPPING")?.telecomNumber

          if (currentShipGroup?.shipmentMethodTypeId === "SHIP_TO_STORE") {
            const facilityId = currentShipGroup.orderFacilityId || currentShipGroup.facilityId
            const facilityContactResp = await UtilService.fetchFacilityAddresses({ facilityId })
            if (!hasError(facilityContactResp)) {
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
    }
  },
  persist: false
})
