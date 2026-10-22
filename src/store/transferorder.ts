import { defineStore } from "pinia"
import { api, commonUtil, logger, translate } from "@common";
import { cogOutline } from "ionicons/icons";

import { useProductStore } from "@/store/product"
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { useUtilStore } from "@/store/util"
import { useUserStore } from "@/store/user";
import { useZebraPrinter } from "@/composables/useZebraPrinter";
import Actions from "@/authorization/actions";

// Only the latest packed shipments request may commit its result, so a slow response for a previously selected
// facility (or an overlapping page-entry and facility-change request) cannot overwrite the current list
let packedRequestId = 0

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
  packedShipments: {
    list: any[]
    total: number
    hasError: boolean
  }
  returnSegment: string
}

export const useTransferOrderStore = defineStore("transferorder", {
  state: (): TransferOrderState => ({
    transferOrder: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: import.meta.env.VITE_VIEW_SIZE,
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
    rejectReasons: [],
    packedShipments: {
      list: [],
      total: 0,
      hasError: false
    },
    returnSegment: ""
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
    },
    getPackedShipments(state) {
      return state.packedShipments
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
        viewSize: import.meta.env.VITE_VIEW_SIZE,
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
    setPackedShipments(payload: any) {
      this.packedShipments.list = payload.list
      this.packedShipments.total = payload.total
      this.packedShipments.hasError = false
    },
    clearPackedShipments() {
      this.packedShipments.list = []
      this.packedShipments.total = 0
      this.packedShipments.hasError = false
    },
    setReturnSegment(segment: string) {
      this.returnSegment = segment
    },
    // Returns the segment the Transfer Orders page should open on (once) and clears it
    consumeReturnSegment() {
      const segment = this.returnSegment
      this.returnSegment = ""
      return segment
    },
    /**
     * Fetches the transfer order shipments of the current facility that were packed but never shipped.
     * Packing creates the shipment in SHIPMENT_PACKED; the transfer order is not fulfilled (and nothing is
     * sent to the ERP) until the shipment is shipped, so these need to stay visible to the store.
     * The packages endpoint returns one row per shipment package, so rows are grouped by shipment here.
     */
    async findPackedShipments(queryString = "") {
      const requestId = ++packedRequestId
      const limit = 250
      // Guards against an endlessly paging response; 50 pages is 12,500 packages
      const maxPages = 50
      let shipmentPackages: any[] = []
      let pageIndex = 0

      try {
        let previousFirstPackage = ""
        for (; pageIndex < maxPages; pageIndex++) {
          const params: any = {
            originFacilityId: useAppProductStore().getCurrentFacility?.facilityId,
            shipmentStatusId: "SHIPMENT_PACKED",
            limit,
            pageIndex
          }
          if (queryString) {
            params.orderName = queryString
          }

          const resp = await api({
            url: "poorti/transferShipments/packages",
            method: "get",
            params
          })

          if (commonUtil.hasError(resp)) {
            throw resp.data
          }

          const page = resp.data?.shipmentPackages || []
          // Stop if the endpoint returned the same page again, so it can never loop on a response that ignores pageIndex
          const firstPackage = page.length ? JSON.stringify(page[0]) : ""
          if (pageIndex > 0 && firstPackage === previousFirstPackage) break
          previousFirstPackage = firstPackage

          shipmentPackages = shipmentPackages.concat(page)
          if (page.length < limit) break
        }
      } catch (err) {
        logger.error("Failed to fetch packed transfer order shipments", err)
        if (requestId !== packedRequestId) return this.packedShipments.list
        // Clear the shipments list only when the first page fails, as a later page failing still leaves the previously fetched shipments valid
        if (pageIndex === 0) this.clearPackedShipments()
        this.packedShipments.hasError = true
        return this.packedShipments.list
      }

      if (requestId !== packedRequestId) return this.packedShipments.list

      const shipmentsById = shipmentPackages.reduce((shipmentsById: Record<string, any>, shipmentPackage: any) => {
        const shipment = shipmentsById[shipmentPackage.shipmentId]
        if (shipment) {
          shipment.packageCount += 1
          if (shipmentPackage.shipmentPackageCreatedDate && (!shipment.packedDate || shipmentPackage.shipmentPackageCreatedDate < shipment.packedDate)) {
            shipment.packedDate = shipmentPackage.shipmentPackageCreatedDate
          }
        } else {
          shipmentsById[shipmentPackage.shipmentId] = {
            shipmentId: shipmentPackage.shipmentId,
            orderId: shipmentPackage.orderId,
            orderName: shipmentPackage.orderName,
            orderExternalId: shipmentPackage.orderExternalId,
            packedDate: shipmentPackage.shipmentPackageCreatedDate,
            packageCount: 1
          }
        }
        return shipmentsById
      }, {})

      // Oldest packed shipment first, it has been waiting the longest
      const shipments = Object.values(shipmentsById).sort((a: any, b: any) => (a.packedDate || 0) - (b.packedDate || 0))
      this.setPackedShipments({ list: shipments, total: shipments.length })
      return shipments
    },
    async fetchTransferShipmentDetails(params: Record<string, any>) {
      return api({
        url: "poorti/transferShipments",
        method: "get",
        params,
      });
    },
    async cancelTransferOrderShipment(shipmentId: string) {
      return api({
        url: `poorti/shipments/${shipmentId}`,
        method: "put",
        data: {
          "statusId": "SHIPMENT_CANCELLED"
        }
      });
    },
    async shipTransferOrderShipment(payload: any) {
      return await api({
        url: `poorti/transferShipments/${payload.shipmentId}/ship`,
        method: "post",
        data: payload
      });
    },
    async printTransferOrderPicklist(orderId: string) {
      try {
        const resp: any = await api({
          method: "get",
          baseURL: commonUtil.getMaargBaseURL(),
          url: `/fop/apps/pdf/PrintTransferOrderPicklist`,
          params: { orderId },
          responseType: "blob",
        })

        if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
          throw resp.data;
        }

        const pdfUrl = window.URL.createObjectURL(resp.data);
        try {
          (window as any).open(pdfUrl, "_blank").focus();
        } catch {
          commonUtil.showToast(
            translate("Unable to open as browser is blocking pop-ups.", {
              documentName: "picklist",
            }),
            { icon: cogOutline }
          );
        }
      } catch (err) {
        commonUtil.showToast(translate("Failed to print picklist"));
        logger.error("Failed to load picklist", err);
      }
    },
    async printShippingLabel(shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string) {
      try {
        let pdfUrls = shippingLabelPdfUrls?.filter((pdfUrl: any) => pdfUrl);
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

          const resp: any = await api({
            method: "get",
            url: "/fop/apps/pdf/PrintLabel",
            params: {
              shipmentId: shipmentIds[0]
            },
            responseType: "blob",
            baseURL: commonUtil.getMaargBaseURL(),
          });

          if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
            throw resp.data;
          }

          const pdfUrl = window.URL.createObjectURL(resp.data);
          pdfUrls = [pdfUrl];
        }

        pdfUrls.forEach((pdfUrl: string) => {
          try {
            (window as any).open(pdfUrl, "_blank").focus();
          } catch {
            commonUtil.showToast(
              translate("Unable to open as browser is blocking pop-ups.", {
                documentName: "shipping label",
              }),
              { icon: cogOutline }
            );
          }
        });
      } catch (err) {
        commonUtil.showToast(translate("Failed to print shipping label"));
        logger.error("Failed to load shipping label", err);
      }
    },
    async createOutboundTransferShipmentAPI(query: any) {
      return await api({
        method: "post",
        url: "poorti/transferShipments",
        data: query,
      })
    },
    async rejectOrderItems(payload: any) {
      return api({
        url: `poorti/transferOrders/${payload.orderId}/reject`,
        method: "post",
        data: payload
      });
    },
    async closeOrderItems(payload: any) {
      return api({
        url: `poorti/transferOrders/${payload.orderId}/closeFulfillment`,
        method: "post",
        data: payload
      });
    },
    async createTransferOrder(payload: any) {
      return await api({
        url: 'oms/transferOrders',
        method: "post",
        data: { payload: payload}
      });
    },
    async approveTransferOrder(orderId: any) {
      return api({
        url: `oms/transferOrders/${orderId}/approve`,
        method: "post",
      });
    },
    async addOrderItem(payload: any) {
      return api({
        url: 'oms/transferOrders/orderItem',
        method: "POST",
        data: payload
      });
    },
    async updateOrderItem(payload: any) {
      return api({
        url: 'oms/transferOrders/orderItem',
        method: "PUT",
        data: payload
      });
    },
    async deleteOrderItem(payload: any) {
      return api({
        url: 'oms/transferOrders/orderItem',
        method: "DELETE",
        data: payload
      });
    },
    async cancelTransferOrder(orderId: string) {
      return api({
        url: `oms/transferOrders/${orderId}/cancel`,
        method: "post",
      });
    },
    async findTransferOrders() {
      let resp
      const transferOrderQuery = JSON.parse(JSON.stringify(this.transferOrder.query))
      const orderStatusId = transferOrderQuery.orderStatusId ?? "ORDER_APPROVED"

      const params: any = {
        originFacilityId: useAppProductStore().getCurrentFacility?.facilityId,
        limit: transferOrderQuery.viewSize,
        pageIndex: transferOrderQuery.viewIndex,
        fieldsToSelect: "orderId,orderName,orderExternalId,orderStatusId,orderStatusDesc,facilityId,orderFacilityId,orderDate"
      }

      if (transferOrderQuery.queryString) {
        params.orderName = transferOrderQuery.queryString
      }

      let orders: any[] = []
      let total = 0

      try {
        if (transferOrderQuery.shipmentStatusId) {
          params.shipmentStatusId = transferOrderQuery.shipmentStatusId
          resp = await api({
            url: "poorti/transferShipments/orders/",
            method: "get",
            params,
          });
        } else {
          params.orderStatusId = orderStatusId
          params.itemStatusId = "ITEM_PENDING_FULFILL"
          resp = await api({
            url: "oms/transferOrders/",
            method: "get",
            params,
          });
        }

        if (!commonUtil.hasError(resp) && resp.data.ordersCount > 0) {
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
        orderResp = await api({
          url: `/oms/transferOrders/${payload.orderId}`,
          method: "get",
        });

        if (!commonUtil.hasError(orderResp)) {
          orderDetail = orderResp.data.order || {}

          shipmentResp = await api({
            url: "poorti/transferShipments",
            method: "get",
            params: { orderId: payload.orderId, shipmentStatusId: "SHIPMENT_SHIPPED" }
          })

          if (!commonUtil.hasError(shipmentResp)) {
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
            return orderResp;
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
        const resp = await this.createOutboundTransferShipmentAPI(params)
        if (!commonUtil.hasError(resp)) {
          shipmentId = resp.data.shipmentId
        } else {
          throw resp.data
        }
      } catch (error) {
        logger.error(error)
        commonUtil.showToast(translate("Failed to create shipment"))
      }
      return shipmentId
    },
    async updateOrderProductCount(payload: any) {
      const productStore = useProductStore()
      const getProduct = productStore.getProduct
      const barcodeIdentifier = useAppProductStore().getBarcodeIdentifierPref

      const item = this.current.items.find((orderItem: any) => {
        const itemVal = commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(orderItem.productId)) ? commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(orderItem.productId)) : getProduct(orderItem.productId)?.internalName
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

      const isAdminUser =  useUserStore().hasPermission(Actions.APP_STOREFULFILLMENT_ADMIN)

      if (isAdminUser) {
        try {
          const payload = {
            parentTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
            parentTypeId_op: "in",
            pageSize: 20,
            orderByField: "sequenceNum"
          }

          const resp = await api({
            url: `/admin/enums`,
            method: "GET",
            params: payload,
          });

          if (!commonUtil.hasError(resp)) {
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

          const resp = await api({
            url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
            method: "GET",
            params: payload,
          });

          if (!commonUtil.hasError(resp)) {
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
