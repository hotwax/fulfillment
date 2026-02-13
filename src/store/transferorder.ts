import { defineStore } from "pinia"
import { TransferOrderService } from "@/services/TransferOrderService"
import { hasError } from "@/adapter"
import logger from "@/logger"
import { getProductIdentificationValue, translate } from "@hotwax/dxp-components"
import { showToast, getCurrentFacilityId } from "@/utils"
import { useProductStore } from "@/store/product"
import { useUtilStore } from "@/store/util"
import { useUserStore } from "@/store/user"

interface TransferOrderState {
  transferOrder: {
    list: any[]
    total: number
    query: {
      viewIndex: number
      viewSize: any
      queryString: string
      selectedShipmentMethods: any[]
      orderStatusId: string
    }
  }
  current: any
  shipment: {
    current: any
    list: any[]
  }
  rejectReasons: any[]
}

export const useTransferOrderStore = defineStore("transferorder", {
  state: (): TransferOrderState => ({
    transferOrder: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: "",
        selectedShipmentMethods: [],
        orderStatusId: "ORDER_APPROVED"
      }
    },
    current: {},
    shipment: {
      current: {},
      list: []
    },
    rejectReasons: []
  }),
  getters: {
    getTransferOrders(state) {
      return state.transferOrder
    },
    getCurrent(state) {
      return state.current
    },
    getTOItemShipped: (state) => (productId: string) => {
      return state.current.toHistory?.items?.filter((item: any) => {
        return item.productId === productId
      }).reduce((sum: any, item: any) => {
        return sum + item.quantity
      }, 0)
    },
    getCurrentShipment(state) {
      return state.shipment.current
    },
    getRejectReasons(state) {
      return state.rejectReasons
    }
  },
  actions: {
    setCurrent(payload: any) {
      this.current = payload
    },
    setTransferOrders(payload: any) {
      this.transferOrder.list = payload.list
      this.transferOrder.total = payload.total
    },
    setTransferOrderQuery(payload: any) {
      this.transferOrder.query = payload
    },
    clearTransferOrdersList() {
      this.transferOrder.list = []
      this.transferOrder.total = 0
    },
    clearTransferOrderFilters() {
      this.transferOrder.query = {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: "",
        selectedShipmentMethods: [],
        orderStatusId: "ORDER_APPROVED"
      }
    },
    clearCurrentTransferShipment() {
      this.shipment.current = {}
    },
    clearCurrentTransferOrder() {
      this.current = {}
    },
    setRejectReasons(payload: any) {
      this.rejectReasons = payload
    },
    async findTransferOrders() {
      let resp
      const transferOrderQuery = JSON.parse(JSON.stringify(this.transferOrder.query))
      const orderStatusId = transferOrderQuery.orderStatusId ?? "ORDER_APPROVED"

      const params: any = {
        originFacilityId: getCurrentFacilityId(),
        limit: transferOrderQuery.viewSize,
        pageIndex: transferOrderQuery.viewIndex
      }

      if (transferOrderQuery.queryString) {
        params.orderName = transferOrderQuery.queryString
      }

      let orders: any[] = []
      let total = 0

      try {
        if (transferOrderQuery.shipmentStatusId) {
          params.shipmentStatusId = transferOrderQuery.shipmentStatusId
          resp = await TransferOrderService.fetchCompletedTransferOrders(params)
        } else {
          params.orderStatusId = orderStatusId
          params.itemStatusId = "ITEM_PENDING_FULFILL"
          resp = await TransferOrderService.fetchTransferOrders(params)
        }

        if (!hasError(resp) && resp.data.ordersCount > 0) {
          total = resp.data.ordersCount
          if (transferOrderQuery.viewIndex > 0) {
            orders = this.transferOrder.list.concat(resp.data.orders)
          } else {
            orders = resp.data.orders
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("No transfer orders found", err)
      }

      this.setTransferOrderQuery({ ...transferOrderQuery })
      this.setTransferOrders({ list: orders, total })

      return resp
    },
    async fetchTransferOrderDetail(payload: any) {
      let orderDetail = {} as any
      let orderResp, shipmentResp

      try {
        orderResp = await TransferOrderService.fetchTransferOrderDetail(payload.orderId)

        if (!hasError(orderResp)) {
          orderDetail = orderResp.data.order || {}

          shipmentResp = await TransferOrderService.fetchShippedTransferShipments({ orderId: payload.orderId, shipmentStatusId: "SHIPMENT_SHIPPED" })

          if (!hasError(shipmentResp)) {
            const shipmentData = shipmentResp.data || {}
            const shipments = shipmentData.shipments || []

            const updatedShipments = shipments.map((shipment: any) => {
              const packages = shipment.packages || []
              const items = packages.flatMap((pkg: any) => pkg.items || [])
              const labelImageUrls = shipment.packages
                .filter((shipmentPackage: any) => shipmentPackage.labelImageUrl)
                .map((shipmentPackage: any) => shipmentPackage.labelImageUrl)

              return {
                ...shipment,
                items,
                labelImageUrls
              }
            })

            orderDetail = {
              ...orderDetail,
              shipments: updatedShipments
            }
          }
          if (orderDetail.items && Array.isArray(orderDetail.items)) {
            orderDetail.items = orderDetail.items.map((item: any) => ({
              ...item,
              orderedQuantity: item.quantity,
              shippedQuantity: item.totalIssuedQuantity || 0,
              pickedQuantity: 0
            }))
          }

          const productIds = [...new Set((orderDetail.items || []).map((item: any) => item.productId))]
          const batchSize = 250
          const productIdBatches = []

          while (productIds.length) {
            productIdBatches.push(productIds.splice(0, batchSize))
          }

          try {
            await Promise.all([
              ...productIdBatches.map((batch) => useProductStore().fetchProducts({ productIds: batch })),
              useUtilStore().fetchStatusDesc([orderDetail.statusId])
            ])
            this.setCurrent(orderDetail)
          } catch (err: any) {
            logger.error("Error fetching product details or status description", err)
            return Promise.reject(new Error(err))
          }
        } else {
          throw orderResp.data
        }
      } catch (err: any) {
        logger.error("error", err)
        return Promise.reject(new Error(err))
      }
    },
    async createOutboundTransferShipment(payload: any) {
      let shipmentId

      try {
        const eligibleItems = payload.items.filter((item: any) => item.pickedQuantity > 0)

        const packages = [{
          items: eligibleItems.map((item: any) => ({
            orderItemSeqId: item.orderItemSeqId,
            productId: item.productId,
            quantity: parseInt(item.pickedQuantity),
            shipGroupSeqId: item.shipGroupSeqId
          }))
        }]

        const params = {
          payload: {
            orderId: payload.orderId,
            packages
          }
        }
        const resp = await TransferOrderService.createOutboundTransferShipment(params)
        if (!hasError(resp)) {
          shipmentId = resp.data.shipmentId
        } else {
          throw resp.data
        }
      } catch (error) {
        logger.error(error)
        showToast(translate("Failed to create shipment"))
      }
      return shipmentId
    },
    async updateOrderProductCount(payload: any) {
      const productStore = useProductStore()
      const utilStore = useUtilStore()
      const getProduct = productStore.getProduct
      const barcodeIdentifier = utilStore.getBarcodeIdentificationPref

      const item = this.current.items.find((orderItem: any) => {
        const itemVal = getProductIdentificationValue(barcodeIdentifier, getProduct(orderItem.productId)) ? getProductIdentificationValue(barcodeIdentifier, getProduct(orderItem.productId)) : getProduct(orderItem.productId)?.internalName
        return itemVal === payload && orderItem.statusId === "ITEM_PENDING_FULFILL"
      })
      if (item) {
        item.pickedQuantity = parseInt(item.pickedQuantity) + 1
        this.setCurrent(this.current)
        return { isProductFound: true, orderItem: item }
      }

      const completedItem = this.current.items.some((item: any) => item.internalName === payload && item.statusId === "ITEM_COMPLETED")
      if (completedItem) {
        return { isCompleted: true }
      }

      return { isProductFound: false }
    },
    async updateCurrentTransferOrder(payload: any) {
      this.setCurrent(payload)
    },
    async updateTransferOrderIndex(payload: any) {
      this.setTransferOrderQuery(payload)
    },
    async updateTransferOrderQuery(payload: any) {
      this.setTransferOrderQuery(payload)
      await this.findTransferOrders()
    },
    async fetchRejectReasons() {
      let rejectReasons: any[] = []

      const permissions = useUserStore().getUserPermissions
      const isAdminUser = permissions.some((permission: any) => permission.action === "APP_STOREFULFILLMENT_ADMIN")

      if (isAdminUser) {
        try {
          const payload = {
            parentTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
            parentTypeId_op: "in",
            pageSize: 20,
            orderByField: "sequenceNum"
          }

          const resp = await TransferOrderService.fetchRejectReasons(payload)

          if (!hasError(resp)) {
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

          if (!hasError(resp)) {
            rejectReasons = resp.data
          } else {
            throw resp.data
          }
        } catch (err) {
          logger.error("Failed to fetch fulfillment reject reasons", err)
        }
      }

      this.setRejectReasons(rejectReasons)
    }
  },
  persist: false
})
