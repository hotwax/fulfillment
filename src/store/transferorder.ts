import { defineStore } from "pinia"
import { api, commonUtil, logger, translate } from "@common";
import { cogOutline } from "ionicons/icons";

import { useProductStore } from "@/store/product"
import { useProductStore as useAppProductStore } from "@/store/productStore";
import { useUtilStore } from "@/store/util"
import { useUserStore } from "@/store/user";
import { useZebraPrinter } from "@/composables/useZebraPrinter";
import Actions from "@/authorization/actions";

// The label PDF of a shipment as a blob URL, fetched while the shipment detail loads so printing and re-printing is instant.
const shippingLabelPdfUrlCache = new Map<string, string>()
// A slow response of an earlier search or order must not replace the one the user asked for last.
let latestTransferOrdersRequest = 0
let latestTransferOrderDetailRequest = 0

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
    // Changes the box and/or the weight of one package of a transfer shipment. The backend refuses once a label is bought.
    async updateShipmentPackage({ shipmentId, shipmentPackageSeqId, ...changes }: { shipmentId: string, shipmentPackageSeqId: string, shipmentBoxTypeId?: string, weight?: number, weightUomId?: string }) {
      return api({
        url: `poorti/transferShipments/${shipmentId}/packages/${shipmentPackageSeqId}`,
        method: "put",
        data: changes
      })
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
    // Asks the backend to buy the label for the route segment that was just updated. Unlike orderStore.retryShippingLabel, a failure
    // is thrown so the caller can tell a failed label from a slow one.
    async generateShippingLabel(shipmentId: string) {
      this.clearShippingLabelPdf(shipmentId)
      const resp = await api({
        url: "/poorti/shipments/retryShippingLabel",
        method: "post",
        data: { shipmentIds: [shipmentId] }
      }) as any
      if(commonUtil.hasError(resp)) {throw resp?.data}

      return resp.data
    },
    async fetchShippingLabelPdfUrl(shipmentId: string) {
      const cachedUrl = shippingLabelPdfUrlCache.get(shipmentId)
      if(cachedUrl) {return cachedUrl}

      const resp: any = await api({
        method: "get",
        url: "/fop/apps/pdf/PrintLabel",
        params: { shipmentId },
        responseType: "blob",
        baseURL: commonUtil.getMaargBaseURL(),
      })

      if(!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
        throw resp?.data
      }

      const pdfUrl = window.URL.createObjectURL(resp.data)
      shippingLabelPdfUrlCache.set(shipmentId, pdfUrl)

      return pdfUrl
    },
    clearShippingLabelPdf(shipmentId: string) {
      const cachedUrl = shippingLabelPdfUrlCache.get(shipmentId)
      if(cachedUrl) {window.URL.revokeObjectURL(cachedUrl)}
      shippingLabelPdfUrlCache.delete(shipmentId)
    },
    // Resolves true when the label was handed to a new window or the printer, false when the browser blocked the window.
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

            return true;
          }

          pdfUrls = [await this.fetchShippingLabelPdfUrl(shipmentIds[0])];
        }

        let isOpened = true;
        pdfUrls.forEach((pdfUrl: string) => {
          try {
            (window as any).open(pdfUrl, "_blank").focus();
          } catch {
            isOpened = false;
            commonUtil.showToast(
              translate("Unable to open as browser is blocking pop-ups.", {
                documentName: "shipping label",
              }),
              { icon: cogOutline }
            );
          }
        });

        return isOpened;
      } catch (err) {
        commonUtil.showToast(translate("Failed to print shipping label"));
        logger.error("Failed to load shipping label", err);

        return false;
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
      const requestId = ++latestTransferOrdersRequest
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

      // The user has already changed the segment or the search: this response is not what the page shows anymore.
      if(requestId !== latestTransferOrdersRequest) {return resp}

      this.setTransferOrderQuery({ ...transferOrderQuery })
      this.setTransferOrders({ list: orders, total })

      return resp
    },
    // The order and its shipped shipments only need the order id, so they are asked together. The products and the status
    // description need the order, and are asked together once it is there.
    async fetchTransferOrderDetail(payload: any) {
      let orderDetail = {} as any
      const requestId = ++latestTransferOrderDetailRequest
      const isLatestRequest = () => requestId === latestTransferOrderDetailRequest

      try {
        const [orderResp, shipmentResp] = await Promise.all([
          api({
            url: `/oms/transferOrders/${payload.orderId}`,
            method: "get",
          }),
          api({
            url: "poorti/transferShipments",
            method: "get",
            params: { orderId: payload.orderId, shipmentStatusId: "SHIPMENT_SHIPPED" }
          }).catch((err: any) => {
            logger.error("Failed to fetch shipped shipments of the transfer order", err)

            return null
          })
        ])

        if(commonUtil.hasError(orderResp)) {throw orderResp.data}

        orderDetail = orderResp.data.order || {}

        if(shipmentResp && !commonUtil.hasError(shipmentResp)) {
          const shipments = shipmentResp.data?.shipments || []

          const updatedShipments = shipments.map((shipment: any) => {
            const packages = shipment.packages || []
            const items = packages.flatMap((pkg: any) => pkg.items || [])
            const labelImageUrls = packages
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
        if(orderDetail.items && Array.isArray(orderDetail.items)) {
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

        while(productIds.length) {
          productIdBatches.push(productIds.splice(0, batchSize))
        }

        try {
          await Promise.all([
            ...productIdBatches.map((batch) => useProductStore().fetchProducts({ productIds: batch })),
            useUtilStore().fetchStatusDesc([orderDetail.statusId])
          ])
          if(isLatestRequest()) {this.setCurrent(orderDetail)}

          return orderResp;
        } catch (err: any) {
          logger.error("Error fetching product details or status description", err)

          return Promise.reject(new Error(err))
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
