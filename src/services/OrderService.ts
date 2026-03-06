import { api } from '@common';
import { getOmsURL } from '@common/utils/commonUtil';
import { hasError } from "@common/utils/commonUtil";

import { useOrderStore } from "@/store/order";
import { useUtilStore } from "@/store/util";
import { useUserStore as useAppUserStore } from "@/store/user";
import { translate } from "@common";
import logger from '@common/core/logger'
import { cogOutline } from 'ionicons/icons';
import { commonUtil } from '@/utils/commonUtil'
import { orderUtil } from '@/utils/orderUtil';
import { solrUtil } from '@/utils/solrUtil';
import { ZebraPrinterService } from './ZebraPrinterService';
import ShopifyService from './ShopifyService';


const findOpenOrders = async (payload: any): Promise<any> => {
  const openOrderQuery = payload.openOrderQuery
  const shipGroupFilter = openOrderQuery.shipGroupFilter

  const params = {
    docType: 'ORDER',
    queryString: openOrderQuery.queryString,
    queryFields: 'productId productName parentProductName orderId orderName customerEmailId customerPartyId customerPartyName  search_orderIdentifications goodIdentifications',
    viewSize: openOrderQuery.viewSize,
    sort: payload.sort ? payload.sort : "orderDate asc",
    filters: {
      '-shipmentMethodTypeId': { value: ['STOREPICKUP', 'POS_COMPLETED'] },
      orderStatusId: { value: 'ORDER_APPROVED' },
      orderTypeId: { value: 'SALES_ORDER' },
      productStoreId: { value: commonUtil.getProductStoreId() }
    },
    solrFilters: [
      //it should be explicit what is subtracting the first part of your OR statement from
      "((*:* -fulfillmentStatus: [* TO *]) OR fulfillmentStatus:Created)",
      "entryDate:[2025-01-01T00:00:00Z TO *]"
    ]
  } as any
  if (!openOrderQuery.excludeFacilityFilter) {
    params.filters['facilityId'] = { value: solrUtil.escapeSolrSpecialChars(commonUtil.getCurrentFacilityId()) }
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
  if (openOrderQuery.selectedShipmentMethods.length) {
    params.filters['shipmentMethodTypeId'] = { value: openOrderQuery.selectedShipmentMethods, op: 'OR' }
  }

  if (openOrderQuery.selectedCategories.length) {
    params.filters['productCategories'] = { value: openOrderQuery.selectedCategories.map((category: string) => JSON.stringify(category)), op: 'OR' }
  }

  const orderQueryPayload = solrUtil.prepareSolrQuery(params)
  let orders = [], total = 0, resp;

  try {
    resp = await api({
      url: "solr-query",
      method: "post",
      data: orderQueryPayload,
      baseURL: getOmsURL()
    }) as any;
    if (!hasError(resp) && resp.data.grouped[params.groupBy]?.matches > 0) {
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
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error('No outstanding orders found', err)
  }
  return { orders, total }
}

const createPicklist = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/createOrderFulfillmentWave`,
    method: "POST",
    data: payload,
  });
}

const printPicklist = async (picklistId: string): Promise<any> => {

  try {
    const isPicklistDownloadEnabled = useUtilStore().isPicklistDownloadEnabled
    if (isPicklistDownloadEnabled) {
      await downloadPicklist(picklistId)
      return;
    }

    const resp = await api({
      url: "/fop/apps/pdf/PrintPicklist",
      method: "GET",
      baseURL: useAppUserStore().getMaargUrl,
      responseType: "blob",
      params: { picklistId }
    });

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      // If we have an app bridge instance, use it to open the pdf
      if (ShopifyService.getApp()) {
        ShopifyService.redirect(pdfUrl);
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
}

const printPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  try {

    // Get packing slip from the server
    const resp = await api({
      url: "/fop/apps/pdf/PrintPackingSlip",
      method: "GET",
      baseURL: useAppUserStore().getMaargUrl,
      params: {
        shipmentId: shipmentIds
      },
      responseType: "blob"
    });


    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
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
}

const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string): Promise<any> => {
  try {

    let pdfUrls = shippingLabelPdfUrls;
    if (!pdfUrls || pdfUrls.length == 0) {
      let labelImageType = imageType || "PNG";

      if (!imageType && shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
        labelImageType = await useUtilStore().fetchLabelImageType(shipmentPackages[0].carrierPartyId);
      }

      const labelImages = [] as Array<string>
      if (labelImageType === "ZPLII") {
        shipmentPackages?.map((shipmentPackage: any) => {
          shipmentPackage.labelImage && labelImages.push(shipmentPackage.labelImage)
        })
        await ZebraPrinterService.printZplLabels(labelImages);
        return;
      }
      // Get packing slip from the server
      const resp = await api({
        url: "/fop/apps/pdf/PrintLabel",
        method: "GET",
        baseURL: useAppUserStore().getMaargUrl,
        params: {
          shipmentId: shipmentIds
        },
        responseType: "blob"
      });

      if (!resp || resp.status !== 200 || hasError(resp)) {
        throw resp.data;
      }

      // Generate local file URL for the blob received
      const pdfUrl = window.URL.createObjectURL(resp.data);
      pdfUrls = [pdfUrl];
    }
    // Open the file in new tab
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
}

const printCustomDocuments = async (internationalInvoiceUrls: Array<string>): Promise<any> => {
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
}

const printShippingLabelAndPackingSlip = async (shipmentIds: Array<string>, shipmentPackages: any): Promise<any> => {

  let labelImageType = "PNG";
  if (shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
    labelImageType = await useUtilStore().fetchLabelImageType(shipmentPackages[0].carrierPartyId);
  }

  if (labelImageType === "ZPLII") {
    await printShippingLabel(shipmentIds, [], shipmentPackages, labelImageType)
    await printPackingSlip(shipmentIds)
    return;
  }

  try {

    // Get packing slip from the server
    const resp = await api({
      url: "/fop/apps/pdf/PrintPackingSlipAndLabel",
      method: "GET",
      baseURL: useAppUserStore().getMaargUrl,
      params: {
        shipmentId: shipmentIds
      },
      responseType: "blob"
    });

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
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
}

const downloadPicklist = async (picklistId: string): Promise<any> => {

  const resp = await api({
    url: `/poorti/Picklist.csv`,
    method: "GET",
    params: { picklistId },
  });
  const fileName = `Picklist-${picklistId}.csv`
  await commonUtil.downloadCsv(resp.data, fileName);
}

const recycleOutstandingOrders = async (payload: any): Promise<any> => {

  return api({
    url: `/poorti/rejectOutstandingOrders`,
    method: "POST",
    data: payload,
  });
}

const findShipments = async (query: any): Promise<any> => {
  const productStoreShipmentMethCount = useUtilStore().getProductStoreShipmentMethCount;

  let orders = [], total = 0;

  try {
    const params = {
      pageSize: query.viewSize,
      orderBy: 'orderDate',
      shipmentTypeId: 'SALES_SHIPMENT',
      productStoreId: commonUtil.getProductStoreId(),
    } as any

    if (query.queryString) {
      params.keyword = query.queryString
    }
    if (!query.excludeFacilityFilter) {
      params.originFacilityId = commonUtil.getCurrentFacilityId()
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
    if (!hasError(resp)) {
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
    logger.error('No inProgress orders found', err)
  }
  return { orders, total }
}

const fetchShipmentFacets = async (params: any): Promise<any> => {
  return api({
    url: `/poorti/shipmentFacets`,
    method: "GET",
    params
  });
}

const fetchPicklists = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipmentPicklists`,
    method: "GET",
    params: payload
  });
}

const recycleInProgressOrders = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/rejectInProgressOrders`,
    method: "POST",
    data: payload,
  });
}

const packOrder = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipments/${payload.shipmentId}/pack`,
    method: "POST",
    data: payload,
  });
}

const packOrders = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipments/bulkPack`,
    method: "POST",
    data: payload,
  });
}

const resetPicker = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/picklists/${payload.picklistId}`,
    method: "PUT",
    data: payload,
  });
}

const addShipmentBox = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipments/${payload.shipmentId}/shipmentPackages`,
    method: "POST",
    data: payload,
  });
}
const shipOrder = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipments/${payload.shipmentId}/ship`,
    method: "POST",
    data: payload,
  });
}
const bulkShipOrders = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipments/bulkShip`,
    method: "POST",
    data: payload,
  });
}

const unpackOrder = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipments/${payload.shipmentId}/unpack`,
    method: "post",
    data: payload,
  });
}

const retryShippingLabel = async (shipmentId: string): Promise<any> => {

  try {
    const resp = await api({
      url: `/poorti/shipments/retryShippingLabel`,
      method: "post",
      data: { shipmentIds: [shipmentId] }
    }) as any;
    if (hasError(resp)) {
      throw resp?.data;
    }
  } catch (error) {
    logger.error(error)
  }
}

const fetchShipmentLabelError = async (shipmentId: string): Promise<any> => {
  let shipmentLabelError = ""

  try {
    if (!shipmentId) {
      return shipmentLabelError
    }

    const payload = {
      shipmentId,
      pageSize: 10
    }

    const resp = await api({
      url: `/poorti/shipmentPackageRouteSegDetails`,
      method: "GET",
      params: payload
    });

    if (hasError(resp)) {
      throw resp.data;
    }
    const responseData = resp.data?.shipmentPackageRouteSegDetails || resp.data;
    shipmentLabelError = responseData
      .find((shipmentPackageRouteSegDetail: any) => shipmentPackageRouteSegDetail.gatewayMessage)?.gatewayMessage;

  } catch (err) {
    logger.error('Failed to fetch shipment label error', err)
  }
  return shipmentLabelError;
}

const fetchShipmentPackageRouteSegDetails = async (params: any): Promise<any> => {
  return await api({
    url: `/poorti/shipmentPackageRouteSegDetails`,
    method: "GET",
    params,
  });
}

const voidShipmentLabel = async (payload: any): Promise<any> => {
  return await api({
    url: `/poorti/shipments/${payload.shipmentId}/shippingLabels/void`,
    method: "POST",
    data: payload,
  });
}

const updateShipmentCarrierAndMethod = async (payload: any): Promise<any> => {
  return await api({
    url: `/poorti/updateShipmentCarrierAndMethod`, //should handle the update of OISG, SRG, SPRG if needed
    method: "PUT",
    data: payload,
  });
}

const updateRouteShipmentCarrierAndMethod = async (payload: any): Promise<any> => {
  return await api({
    url: `/poorti/updateRouteShipmentCarrierAndMethod`, //should handle the update of OISG, SRG, SPRG if needed
    method: "PUT",
    data: payload,
  });
}

const findOrderInvoicingInfo = async (payload: any): Promise<any> => {
  return api({
    url: "/oms/dataDocumentView",
    method: "post",
    data: payload,
  });
}

const fetchOrderDetail = async (orderId: string): Promise<any> => {
  return await api({
    url: `/poorti/orders/${orderId}`, //should handle the update of OISG, SRG, SPRG if needed
    method: "GET"
  });
}

const addTrackingCode = async (payload: any): Promise<any> => {
  return await api({
    url: `/poorti/updateShipmentTracking`,
    method: "PUT",
    data: payload
  });
}

const fetchGiftCardItemPriceInfo = async (payload: any): Promise<any> => {
  const currentOrder = useOrderStore().getCurrent;

  let resp = {} as any;
  const itemPriceInfo = {} as any;

  try {
    if (currentOrder && Object.keys(currentOrder).length) {
      itemPriceInfo.currencyUom = currentOrder.currencyUom
    } else {
      resp = await fetchOrderDetail(payload.orderId);
      if (!hasError(resp)) {
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
    if (!hasError(resp)) {
      itemPriceInfo.unitPrice = resp.data[0].unitPrice
    } else {
      throw resp.data
    }
  } catch (error: any) {
    logger.error(error);
  }

  return itemPriceInfo;
}

const activateGiftCard = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/giftCardFulfillments`,
    method: "POST",
    data: payload,
  });
}

const fetchOrderItems = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/orders/${payload.orderId}/items`,
    method: "GET",
    params: payload
  });
}

const createCommunicationEvent = async (payload: any): Promise<any> => {
  return api({
    url: "/oms/communicationEvents",
    method: "POST",
    data: payload,
  });
}

const deleteOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/orders/${payload.orderId}/items/${payload.orderItemSeqId}`,
    method: "DELETE",
  });
}

const updateOrderHeader = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/orders/${payload.orderId}`,
    method: "PUT",
    data: payload
  });
}

const updateOrderFacility = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/orders/${payload.orderId}/shipGroups/${payload.shipGroupSeqId}`,
    method: "PUT",
    data: payload
  });
}

export const OrderService = {
  activateGiftCard,
  addShipmentBox,
  addTrackingCode,
  bulkShipOrders,
  createCommunicationEvent,
  createPicklist,
  deleteOrderItem,
  fetchGiftCardItemPriceInfo,
  fetchOrderDetail,
  downloadPicklist,
  fetchOrderItems,
  fetchPicklists,
  fetchShipmentFacets,
  fetchShipmentLabelError,
  fetchShipmentPackageRouteSegDetails,
  findOpenOrders,
  findOrderInvoicingInfo,
  findShipments,
  packOrder,
  packOrders,
  printCustomDocuments,
  printPackingSlip,
  printPicklist,
  printShippingLabel,
  printShippingLabelAndPackingSlip,
  recycleOutstandingOrders,
  recycleInProgressOrders,
  resetPicker,
  retryShippingLabel,
  shipOrder,
  unpackOrder,
  updateOrderHeader,
  updateOrderFacility,
  updateRouteShipmentCarrierAndMethod,
  updateShipmentCarrierAndMethod,
  voidShipmentLabel
}
