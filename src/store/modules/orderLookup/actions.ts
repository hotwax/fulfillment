import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import OrderLookupState from "./OrderLookupState"
import { OrderLookupService } from "@/services/OrderLookupService";
import { prepareOrderLookupQuery } from "@/utils/solrHelper";
import { hasError } from "@/adapter";
import * as types from "./mutation-types"
import { showToast } from "@/utils";
import { translate } from "@hotwax/dxp-components";
import logger from "@/logger";
import { OrderService } from "@/services/OrderService";
import { CarrierService } from "@/services/CarrierService";
import store from "@/store";

const actions: ActionTree<OrderLookupState, RootState> = {
  async findOrders({ commit, state }, params) {
    let resp, orderCount, itemCount;
    let stateOrders = JSON.parse(JSON.stringify(state.list.orders))
    const shipmentMethodTypeIds: Array<string> = []

    const query = prepareOrderLookupQuery({ ...(state.query), ...params })
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

          order.doclist.docs[0].shipmentMethodTypeId && shipmentMethodTypeIds.push(order.doclist.docs[0].shipmentMethodTypeId)
          return order
        })

        orderCount = resp.data.grouped.orderId.ngroups;
        itemCount = resp.data.grouped.orderId.matches;

        const status = new Set();
        const orderItems = [] as any;

        orders.map((order: any) => {
          status.add(order.orderStatusId)
          order.doclist.docs.map((item: any) => {
            status.add(item.orderItemStatusId)
            orderItems.push(item)
          })
        })

        // Added check as we are fetching the facets only on first request call and do not fetch facets information on infinite scroll
        if(params?.fetchFacets) {
          const facilities = resp.data.facets?.facilityNameFacet?.buckets.map((bucket: any) => bucket.val)
          const productStores = resp.data.facets?.productStoreIdFacet?.buckets.map((bucket: any) => bucket.val)
          const channels = resp.data.facets?.salesChannelDescFacet?.buckets.map((bucket: any) => bucket.val)
          const statuses = resp.data.facets?.orderStatusDescFacet?.buckets.map((bucket: any) => bucket.val)

          commit(types.ORDERLOOKUP_CHANNEL_OPTIONS_UPDATED, channels);
          commit(types.ORDERLOOKUP_PRODUCT_STORE_OPTIONS_UPDATED, productStores);
          commit(types.ORDERLOOKUP_FACILITY_OPTIONS_UPDATED, facilities);
          commit(types.ORDERLOOKUP_STATUS_OPTIONS_UPDATED, statuses);
        }

        if (query.json.params.start && query.json.params.start > 0) stateOrders = stateOrders.concat(orders)
        else stateOrders = orders
        await this.dispatch("product/getProductInformation", { orders });
        await this.dispatch("util/fetchShipmentMethodTypeDesc", shipmentMethodTypeIds)
      } else {
        showToast(translate("Failed to fetch orders"));
        throw resp.data;
      }
    } catch(error) {
      logger.error(error)
      // If the filters are changed, we are on first index and if we got some error clear the orders
      if(params?.isFilterUpdated && (!params?.viewIndex || params.viewIndex == 0)) {
        stateOrders = []
        orderCount = 0
        itemCount = 0
      }
    }
    commit(types.ORDERLOOKUP_LIST_UPDATED, { orders: stateOrders, orderCount, itemCount });
    return resp;
  },

  async fetchCarriersTrackingInfo({ commit }, carrierPartyIds) {
    const carriersTrackingInfo = {} as any;
    const systemProperties = {} as any;

    await this.dispatch('util/fetchPartyInformation', carrierPartyIds);

    try {
      const resp = await CarrierService.fetchCarrierTrackingUrls({
        "entityName": "SystemProperty",
        "inputFields": {
          "systemResourceId": carrierPartyIds,
          "systemResourceId_op": "in",
          "systemResourceId_ic": "Y",
          "systemPropertyId": "%trackingUrl%",
          "systemPropertyId_op": "like"
        },
        "fieldList": ["systemResourceId", "systemPropertyId", "systemPropertyValue"]
      })

      if(!hasError(resp)) {
        resp.data.docs.map((doc: any) => {
          systemProperties[doc.systemResourceId.toUpperCase()] = doc.systemPropertyValue
        })
      } else {
        throw resp.data;
      }
    } catch(error: any) {
      logger.error(error);
    }

    carrierPartyIds.map((partyId: any) => {
      carriersTrackingInfo[partyId] = {
        carrierName: store.getters["util/getPartyName"](partyId),
        trackingUrl: systemProperties[partyId.toUpperCase()] ? systemProperties[partyId.toUpperCase()] : ""
      }
    })

    commit(types.ORDERLOOKUP_CARRIER_TRACKING_URLS_UPDATED, carriersTrackingInfo);
  },

  async getOrderDetails({ commit, dispatch }, orderId) {
    let order = {} as any;

    try {
      const apiPayload = [{
        inputFields: {
          orderId
        },
        viewSize: 50,
        filterByDate: "Y",
        entityName: "OrderHeaderAndRoles"
      }, {
        inputFields: {
          orderId,
          contactMechPurposeTypeId: ["BILLING_LOCATION", "BILLING_EMAIL", "PHONE_BILLING"],
          contactMechPurposeTypeId_op: "in"
        },
        viewSize: 50,
        fieldList: ["contactMechPurposeTypeId", "contactMechId"],
        entityName: "OrderContactMech"
      }, {
        inputFields: {
          orderId
        },
        viewSize: 50,
        filterByDate: "Y",
        fieldList: ["orderIdentificationTypeId", "orderId", "idValue"],
        entityName: "OrderIdentification"
      }, {
        inputFields: {
          orderId,
          attrName: ["customerId", "municipio"],
          attrName_op: "in",
          attrName_ic: "Y"
        },
        viewSize: 50,
        fieldList: ["attrName", "attrValue"],
        entityName: "OrderAttribute"
      }, {
        inputFields: {
          orderId
        },
        viewSize: 250,
        orderBy: "changeDatetime",
        entityName: "OrderFacilityChange"
      }, {
        inputFields: {
          orderId,
          statusId: ["ORDER_COMPLETED", "ORDER_APPROVED"],
          statusId_op: "in"
        },
        viewSize: 2,
        entityName: "OrderStatus"
      }, {
        inputFields: {
          orderId,
          statusId: "PAYMENT_CANCELLED",
          statusId_op: "notEqual"
        },
        orderBy: "createdDate DESC",
        viewSize: 50,
        fieldList: ["paymentMethodTypeId", "maxAmount", "statusId"],
        entityName: "OrderPaymentPreference"
      }, {
        inputFields: {
          orderId
        },
        viewSize: 50,
        entityName: "OrderItemShipGroupAndFacility"
      }, {
        inputFields: {
          orderId,
          shipmentStatusId: "SHIPMENT_INPUT",
          shipmentStatusId_op: "notEqual"
        },
        fieldList: ["orderId", "shipGroupSeqId", "shipmentId", "trackingIdNumber"],
        viewSize: 50,
        entityName: "OrderShipmentAndRouteSegment"
      }]

      const [orderHeader, orderContactMech, orderIdentifications, orderAttributes, orderBrokeringInfo, orderStatusInfo, orderPaymentPreference, orderShipGroups, orderRouteSegment] = await Promise.allSettled(apiPayload.map((payload: any) => OrderLookupService.performFind(payload)))

      if(orderHeader.status === "fulfilled" && !hasError(orderHeader.value) && orderHeader.value.data.count > 0) {
        order = orderHeader.value.data.docs[0]

        if(!order.orderId) {
          throw "Failed to fetch order information"
        }

        await this.dispatch("util/fetchEnumerations", [order.salesChannelEnumId])
        order.salesChannel = (this.state.util.enumerations as any)[order.salesChannelEnumId] || "-"

        order["billToPartyId"] = orderHeader.value.data.docs.find((info: any) => info.roleTypeId === "BILL_TO_CUSTOMER")?.partyId

        const partyInfo = await OrderLookupService.performFind({
          inputFields: {
            partyId: order["billToPartyId"]
          },
          viewSize: 1,
          fieldList: ["firstName", "lastName", "groupName"],
          entityName: "PartyNameView"
        })

        if(!hasError(partyInfo) && partyInfo.data.count > 0) {
          const party = partyInfo.data.docs[0]
          order["partyName"] = party.groupName ? party.groupName : `${party.firstName ? party.firstName : ''} ${party.lastName ? party.lastName : ''}`
        }
      }
      if(orderContactMech.status === "fulfilled" && !hasError(orderContactMech.value) && orderContactMech.value.data.count > 0) {
        const orderContactMechTypes: any = orderContactMech.value.data.docs.reduce((contactMechTypes: any, contactMech: any) => {
          contactMechTypes[contactMech.contactMechPurposeTypeId] = contactMech.contactMechId

          return contactMechTypes;
        }, {})

        const postalAddress = await OrderLookupService.performFind({
          inputFields: {
            contactMechId: Object.keys(orderContactMechTypes).filter((mechType: string) => mechType === "BILLING_LOCATION").map((mechType: string) => orderContactMechTypes[mechType]),
            contactMechId_op: "in"
          },
          viewSize: 20,
          entityName: "PostalAddressAndGeo"
        })

        if(!hasError(postalAddress) && postalAddress.data.count > 0) {
          postalAddress.data.docs.map((address: any) => {
            if(address.contactMechId === orderContactMechTypes["BILLING_LOCATION"]) {
              order["billingAddress"] = address
            }
          })
        }

        const customerInfo = await OrderLookupService.performFind({
          inputFields: {
            contactMechId: Object.keys(orderContactMechTypes).filter((mechType: string) => mechType === "BILLING_EMAIL" || mechType === "PHONE_BILLING").map((mechType: string) => orderContactMechTypes[mechType]),
            contactMechId_op: "in"
          },
          viewSize: 20,
          fieldList: ["infoString", "contactMechId", "tnContactNumber"],
          entityName: "ContactMechDetail"
        })

        if(!hasError(customerInfo) && customerInfo.data.count > 0) {
          customerInfo.data.docs.map((info: any) => {
            if(info.contactMechId === orderContactMechTypes["BILLING_EMAIL"]) {
              order["billingEmail"] = info.infoString
            }

            if(info.contactMechId === orderContactMechTypes["PHONE_BILLING"]) {
              order["billingPhone"] = info.tnContactNumber
            }
          })
        }
      }

      // Fetching order identifications
      if(orderIdentifications.status === "fulfilled" && !hasError(orderIdentifications.value) && orderIdentifications.value.data.count > 0) {
        order["shopifyOrderId"] = orderIdentifications.value.data.docs.find((identification: any) => identification.orderIdentificationTypeId === "SHOPIFY_ORD_ID")?.idValue
      }

      // Fetching order attributes
      order["orderAttributes"] = {}
      if(orderAttributes.status === "fulfilled" && !hasError(orderAttributes.value) && orderAttributes.value.data.count > 0) {
        orderAttributes.value.data.docs.map((attribute: any) => {
          // For some attbiutes we get casing difference, like customerId, CustomerId, so adding ic in performFind, but to display it correctly on UI, converting it into lowerCase
          order["orderAttributes"][attribute.attrName.toLowerCase()] = attribute.attrValue
        })
      }

      // Fetching brokering information for order
      order["shipGroupFacilityAllocationTime"] = {}
      if(orderBrokeringInfo.status === "fulfilled" && !hasError(orderBrokeringInfo.value) && orderBrokeringInfo.value.data.count > 0) {
        order["firstBrokeredDate"] = orderBrokeringInfo.value.data.docs[0].changeDatetime
        orderBrokeringInfo.value.data.docs.map((brokeringInfo: any) => {
          order["shipGroupFacilityAllocationTime"][brokeringInfo.shipGroupSeqId] = brokeringInfo.changeDatetime
        })
      }

      // Fetching brokering information for order
      if(orderStatusInfo.status === "fulfilled" && !hasError(orderStatusInfo.value) && orderStatusInfo.value.data.count > 0) {
        order["approvedDate"] = orderStatusInfo.value.data.docs.find((info: any) => info.statusId === "ORDER_APPROVED")?.statusDatetime
        order["completedDate"] = orderStatusInfo.value.data.docs.find((info: any) => info.statusId === "ORDER_COMPLETED")?.statusDatetime
      }

      // Fetching payment preference for order
      if(orderPaymentPreference.status === "fulfilled" && !hasError(orderPaymentPreference.value) && orderPaymentPreference.value.data.count > 0) {
        const paymentMethodTypeIds: Array<string> = [];
        const statusIds: Array<string> = [];
        order["orderPayments"] = orderPaymentPreference.value.data.docs.map((paymentPreference: any) => {
          paymentMethodTypeIds.push(paymentPreference.paymentMethodTypeId)
          statusIds.push(paymentPreference.statusId)
          return {
            amount: paymentPreference["maxAmount"],
            methodTypeId: paymentPreference["paymentMethodTypeId"],
            paymentStatus: paymentPreference["statusId"]
          }
        })

        this.dispatch("util/fetchStatusDesc", statusIds)

        if(paymentMethodTypeIds.length) {
          this.dispatch("util/fetchPaymentMethodTypeDesc", paymentMethodTypeIds)
        }
      }

      const shipGroupSeqIds: Array<string> = [];
      let shipGroups = {};
      const productIds: Array<string> = []
      const shipmentMethodIds: Array<string> = []

      const orderRouteSegmentInfo = orderRouteSegment.status === "fulfilled" && orderRouteSegment.value.data.docs.length > 0 ? orderRouteSegment.value.data.docs.reduce((orderSegmentInfo: any, routeSegment: any) => {
        if(orderSegmentInfo[routeSegment.shipGroupSeqId]) orderSegmentInfo[routeSegment.shipGroupSeqId].push(routeSegment)
        else orderSegmentInfo[routeSegment.shipGroupSeqId] = [routeSegment]
        return orderSegmentInfo
      }, {}) : []

      let orderShipmentPackages = [] as any
      const shipmentIds = Object.values(orderRouteSegmentInfo).flatMap((routes: any) => routes.map((route: any) => route.shipmentId));

      try {
        orderShipmentPackages = await OrderService.fetchShipmentPackages(shipmentIds, true);
      } catch(error: any) {
        logger.error(error)
      }

      const shipmentPackages = orderShipmentPackages.reduce((shipment: any, shipmentPackage: any) => {
        const key = shipmentPackage.primaryShipGroupSeqId;
        if (!shipment[key]) {
          shipment[key] = [];
        }
        shipment[key].push(shipmentPackage);
        return shipment;
      }, {});

      Object.values(orderRouteSegmentInfo).map((segments: any) => {
        segments.map((segment: any) => {
          const currentPackage = orderShipmentPackages.find((shipmentPackage: any) => shipmentPackage.shipmentId === segment.shipmentId)
          if(currentPackage && currentPackage.carrierServiceStatusId === "SHRSCS_VOIDED") {
            segment.trackingIdNumber = ""
          }
        })
      })

      order["shipmentPackages"] = shipmentPackages;
      const carrierPartyIds = [] as any;

      if(orderShipGroups.status === "fulfilled" && !hasError(orderShipGroups.value) && orderShipGroups.value.data.count > 0) {
        shipGroups = orderShipGroups.value.data.docs.reduce((shipGroups: any, shipGroup: any) => {
          productIds.push(shipGroup.productId)
          shipGroup.shipmentMethodTypeId && shipmentMethodIds.includes(shipGroup.shipmentMethodTypeId) ? '' : shipmentMethodIds.push(shipGroup.shipmentMethodTypeId)
          shipGroup.shipGroupSeqId && shipGroupSeqIds.includes(shipGroup.shipGroupSeqId) ? '' : shipGroupSeqIds.push(shipGroup.shipGroupSeqId)

          if(shipGroups[shipGroup.shipGroupSeqId]) {
            shipGroups[shipGroup.shipGroupSeqId].push(shipGroup)
          } else {
            shipGroups[shipGroup.shipGroupSeqId] = [{
              ...shipGroup,
              trackingIdNumber: orderRouteSegmentInfo[shipGroup.shipGroupSeqId]?.length ? orderRouteSegmentInfo[shipGroup.shipGroupSeqId][0].trackingIdNumber : ""
            }]
          }

          if(shipGroup.carrierPartyId) carrierPartyIds.push(shipGroup.carrierPartyId);

          return shipGroups;
        }, {})
      }
      order["shipGroups"] = shipGroups
      
      dispatch("fetchCarriersTrackingInfo", Array.from(new Set(carrierPartyIds)));
      this.dispatch("util/fetchShipmentMethodTypeDesc", shipmentMethodIds)

      order["shipGroupFulfillmentStatus"] = {}
      const picklistBinInfo = await OrderLookupService.performFind({
        inputFields: {
          orderId,
          shipGroupSeqId: shipGroupSeqIds,
          shipGroupSeqId_op: "in"
        },
        viewSize: 20,
        fieldList: ["shipGroupSeqId", "itemStatusId"],
        entityName: "PicklistItemAndBin"
      })

      if(!hasError(picklistBinInfo) && picklistBinInfo.data.count > 0) {
        picklistBinInfo.data.docs.map((binInfo: any) => {
          order["shipGroupFulfillmentStatus"][binInfo.shipGroupSeqId] = (binInfo.itemStatusId === "PICKITEM_PENDING" ? "Picking" : binInfo.itemStatusId === "PICKITEM_PICKED" || binInfo.itemStatusId === "PICKITEM_COMPLETED" ? binInfo.shipmentMethodTypeId === "STOREPICKUP" ? "Ready for pickup" : "Packed" : "")
        })
      }

      await this.dispatch("product/fetchProducts", { productIds })
    } catch(err) {
      logger.error(err)
    }

    commit(types.ORDERLOOKUP_CURRENT_UPDATED, order)
  },

  async updateAppliedFilters({ commit, dispatch }, payload) {
    commit(types.ORDERLOOKUP_FILTERS_UPDATED, payload)

    // Clearing the from and to date values when we are selecting a hardcoded date, so to not apply the from-to filter when again selecting the same
    if(payload.filterName === "date") {
      commit(types.ORDERLOOKUP_FILTERS_UPDATED, { filterName: "fromDate", value: "" })
      commit(types.ORDERLOOKUP_FILTERS_UPDATED, { filterName: "toDate", value: "" })
    }

    const resp = await dispatch("findOrders", { isFilterUpdated: true })
    return resp;
  },

  async updateSort({ commit, dispatch }, payload) {
    commit(types.ORDERLOOKUP_SORT_UPDATED, payload)
    await dispatch("findOrders", { isFilterUpdated: true })
    return;
  },

  async clearOrderLookup({ commit }) {
    commit(types.ORDERLOOKUP_CLEARED)
  }
}

export default actions;