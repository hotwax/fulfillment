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

          order.doclist.docs[0].shipmentMethodTypeId && !shipmentMethodTypeIds.includes(order.doclist.docs[0].shipmentMethodTypeId) && shipmentMethodTypeIds.push(order.doclist.docs[0].shipmentMethodTypeId)
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
      const resp = await OrderLookupService.fetchCarrierTrackingUrls({
        "systemResourceId": carrierPartyIds,
        "systemResourceId_op": "in",
        "systemResourceId_ic": "Y",
        "systemPropertyId": "%trackingUrl%",
        "systemPropertyId_op": "like",
        "fieldsToSelect": ["systemResourceId", "systemPropertyId", "systemPropertyValue"]
      })

      if (!hasError(resp)) {
        resp.data?.map((doc: any) => {
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
    return carriersTrackingInfo;
  },

  async getOrderDetails({ commit, dispatch }, orderId) {
    let order = {} as any;

    try {
      const [orderResp, orderFacilityChangeResp, shipmentResp, itemResp] = await Promise.allSettled([
        OrderLookupService.fetchOrderDetail(orderId), 
        OrderLookupService.fetchOrderFacilityChange({
          orderId,
          pageSize: 250,
          orderByField: "changeDatetime",
        }),
        OrderLookupService.findShipments(orderId),
        OrderLookupService.fetchOrderItems({
          orderId,
          pageSize: 100 //considering there won't be 100 items in an order
        })
      ])

      if (orderResp.status === "fulfilled" && !hasError(orderResp.value)) {
        order = orderResp.value.data;
        await this.dispatch("util/fetchEnumerations", [order.salesChannelEnumId])
        order.salesChannel = (this.state.util.enumerations as any)[order.salesChannelEnumId] || "-"

        order["billToPartyId"] = order.roles.find((role: any) => role.roleTypeId === "BILL_TO_CUSTOMER")?.partyId

        const partyInfo = await OrderLookupService.fetchPartyInformation({
          partyId: order["billToPartyId"],
          pageSize: 1,
          fieldsToSelect: ["firstName", "lastName", "groupName"]
        })

        if(!hasError(partyInfo)) {
          const party = partyInfo?.data[0]
          order["partyName"] = party.groupName ? party.groupName : `${party.firstName ? party.firstName : ''} ${party.lastName ? party.lastName : ''}`
        }

        order["billingAddress"] = order.contactMechs?.find((contactMech:any) => contactMech.contactMechPurposeTypeId === "BILLING_LOCATION")?.postalAddress,
        order["billingEmail"] = order.contactMechs?.find((contactMech:any) => contactMech.contactMechPurposeTypeId === "BILLING_EMAIL")?.contactMech?.infoString,
        order["billingPhone"] = order.contactMechs?.find((contactMech:any) => contactMech.contactMechPurposeTypeId === "PHONE_BILLING")?.telecomNumber?.contactNumber,
        order["shopifyOrderId"] = order.identifications?.find((identification:any) => identification.orderIdentificationTypeId === "SHOPIFY_ORD_ID")?.idValue

        // Fetching order attributes
        order["orderAttributes"] = {}
        order.attributes?.map((attribute:any) => {
          order["orderAttributes"][attribute.attrName.toLowerCase()] = attribute.attrValue
        })

        // preparing brokering information for order
        if (orderFacilityChangeResp.status === 'fulfilled' && !hasError(orderFacilityChangeResp.value)) {
          order["shipGroupFacilityAllocationTime"] = {}
          order["firstBrokeredDate"] = orderFacilityChangeResp.value.data[0].changeDatetime
          orderFacilityChangeResp.value.data.map((brokeringInfo: any) => {
            order["shipGroupFacilityAllocationTime"][brokeringInfo.shipGroupSeqId] = brokeringInfo.changeDatetime
          })
        }

        // preparing brokering information for order
        order["approvedDate"] = order.statuses.find((status: any) => status.statusId === "ORDER_APPROVED")?.statusDatetime
        order["completedDate"] = order.statuses.find((status: any) => status.statusId === "ORDER_COMPLETED")?.statusDatetime


        // preparing payment preference for order
        const paymentMethodTypeIds: Array<string> = [];
        const statusIds: Array<string> = [];
        order["orderPayments"] = order.paymentPreferences.map((paymentPreference: any) => {
          paymentMethodTypeIds.push(paymentPreference.paymentMethodTypeId)
          statusIds.push(paymentPreference.statusId)
          return {
            amount: paymentPreference["maxAmount"],
            methodTypeId: paymentPreference["paymentMethodTypeId"],
            paymentStatus: paymentPreference["statusId"]
          }
        })
        this.dispatch("util/fetchStatusDesc", statusIds)

        if (paymentMethodTypeIds.length) {
          this.dispatch("util/fetchPaymentMethodTypeDesc", paymentMethodTypeIds)
        }

        //removing trackingIdNumber if label is voided
        let shipments = [] as any
        if (shipmentResp.status === 'fulfilled' && !hasError(shipmentResp.value)) {
          shipments = shipmentResp.value.data.shipments
          shipments.map((shipment: any) => {
            if (shipment.carrierServiceStatusId === "SHRSCS_VOIDED") {
              shipment.trackingIdNumber = '';
            }
          })
        }

        const facilityIds = order.shipGroups.map((shipGroup: any) => shipGroup.facilityId)
        const facilityResp = await OrderLookupService.fetchFacilities({facilityId: facilityIds, pageSize: facilityIds.length})

        if (itemResp.status === 'fulfilled' && !hasError(itemResp.value)) {
          const orderItems = itemResp.value.data;
          const shipGroupsWithItems: any[] = [];

          order.shipGroups.forEach((shipGroup: any) => {
            const shipGroupItems = orderItems?.filter((orderItem: any) => orderItem.shipGroupSeqId === shipGroup.shipGroupSeqId);

            if (shipGroupItems && shipGroupItems.length) {
              const shipGroupFacility = facilityResp?.data?.find((facility: any) => facility.facilityId === shipGroup.facilityId);

              const shipGroupShipment = shipments?.find((shipment: any) => shipment.primaryShipGroupSeqId === shipGroup.shipGroupSeqId);

              const fulfillmentStatus =
                shipGroupShipment?.statusId === "SHIPMENT_APPROVED"
                  ? "Picking"
                  : shipGroupShipment?.statusId === "SHIPMENT_PACKED" ||
                    shipGroupShipment?.statusId === "SHIPMENT_SHIPPED"
                  ? shipGroupShipment.shipmentMethodTypeId === "STOREPICKUP"
                    ? "Ready for pickup"
                    : "Packed"
                  : "";

              shipGroupsWithItems.push({
                ...shipGroup,
                items: shipGroupItems,
                fulfillmentStatus,
                facilityName: shipGroupFacility?.facilityName,
                facilityTypeId: shipGroupFacility?.facilityTypeId,
                shipmentPackageRouteSegDetails: shipGroupShipment?.shipmentPackageRouteSegDetails || [],
                trackingIdNumber: shipGroupShipment?.trackingIdNumber || "",
              });
            }
          });
 
          order.shipGroups = shipGroupsWithItems;  
          const productIds =  orderItems.map((orderItem: any) => orderItem.productId);
          await this.dispatch("product/fetchProducts", { productIds })    
        }
        
        const shipmentMethodTypeIds = [...new Set([
          ...(order.shipGroups?.map((shipGroup:any) => shipGroup.shipmentMethodTypeId) || []),
          ...(shipments?.map((shipment:any) => shipment.shipmentMethodTypeId) || [])
        ])];
        
        this.dispatch("util/fetchShipmentMethodTypeDesc", shipmentMethodTypeIds)

        const carrierPartyIds = shipments?.map((shipment: any) => shipment.carrierPartyId);
        const carrierInfo = await dispatch("fetchCarriersTrackingInfo", Array.from(new Set(carrierPartyIds)));
        
        Object.keys(order["shipGroups"]).map((shipGroupId: any) => {
          const shipGroup = order["shipGroups"][shipGroupId]
          shipGroup.map((item: any) => item["carrierPartyName"] = carrierInfo[item.carrierPartyId]?.carrierName || "")
        })
      }
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