import { defineStore } from "pinia"
import { api, commonUtil, logger } from "@common";

import { useProductStore as useAppProductStore } from "@/store/productStore";
import { useUserStore } from "@/store/user"

interface UtilState {
  rejectReasons: any[]
  partyNames: Record<string, any>
  shipmentMethodTypeDesc: Record<string, any>
  shipmentBoxTypeDesc: Record<string, any>
  facilityTypeDesc: Record<string, any>
  paymentMethodTypeDesc: Record<string, any>
  statusDesc: Record<string, any>
  rejectReasonEnumTypes: any[]
  enumerations: Record<string, any>
  fulfillmentRejectReasons: Record<string, any>
  rejectReasonOptions: any[]
  carrierShipmentBoxTypes: Record<string, any>
  carrierDesc: Record<string, any>
  shipmentMethodsByCarrier: Record<string, any>
  facilityAddresses: Record<string, any>
  facilityShippingLabelImageType: Record<string, any>
}

export const useUtilStore = defineStore("util", {
  state: (): UtilState => ({
    rejectReasons: [],
    partyNames: {},
    shipmentMethodTypeDesc: {},
    shipmentBoxTypeDesc: {},
    facilityTypeDesc: {},
    paymentMethodTypeDesc: {},
    statusDesc: {},
    rejectReasonEnumTypes: [],
    enumerations: {},
    fulfillmentRejectReasons: {},
    rejectReasonOptions: [],
    carrierShipmentBoxTypes: {},
    carrierDesc: {},
    shipmentMethodsByCarrier: {},
    facilityAddresses: {},
    facilityShippingLabelImageType: {}
  }),
  getters: {
    getRejectReasons(state) {
      return state.rejectReasons ? state.rejectReasons : []
    },
    getPartyName: (state) => (partyId: string) => {
      return state.partyNames[partyId] ? state.partyNames[partyId] : partyId
    },
    getShipmentMethodDesc: (state) => (shipmentMethodId: string) => {
      return state.shipmentMethodTypeDesc[shipmentMethodId] ? state.shipmentMethodTypeDesc[shipmentMethodId] : shipmentMethodId
    },
    getShipmentBoxDesc: (state) => (shipmentBoxId: string) => {
      return state.shipmentBoxTypeDesc[shipmentBoxId] ? state.shipmentBoxTypeDesc[shipmentBoxId] : shipmentBoxId
    },
    getFacilityTypeDesc: (state) => (facilityTypeId: string) => {
      return state.facilityTypeDesc[facilityTypeId] ? state.facilityTypeDesc[facilityTypeId] : ""
    },
    getPaymentMethodDesc: (state) => (paymentMethodTypeId: string) => {
      return state.paymentMethodTypeDesc[paymentMethodTypeId] ? state.paymentMethodTypeDesc[paymentMethodTypeId] : paymentMethodTypeId
    },
    getStatusDesc: (state) => (statusId: string) => {
      return state.statusDesc[statusId] ? state.statusDesc[statusId] : statusId
    },
    getRejectReasonEnumTypes(state) {
      return state.rejectReasonEnumTypes
    },
    getEnumerations(state) {
      return state.enumerations
    },
    getEnumerationDesc: (state) => (enumId: string) => {
      return state.enumerations[enumId] ? state.enumerations[enumId] : enumId
    },
    getFulfillmentRejectReasons(state) {
      return state.fulfillmentRejectReasons
    },
    getRejectReasonOptions(state) {
      return state.rejectReasonOptions
    },
    getCarrierShipmentBoxTypes(state) {
      return state.carrierShipmentBoxTypes
    },
    getCarrierDesc: (state) => (partyId: string) => {
      return state.carrierDesc[partyId] ? state.carrierDesc[partyId] : partyId
    },
    getShipmentMethodsByCarrier(state) {
      return state.shipmentMethodsByCarrier
    },
    getFacilityAddress: (state) => (facilityId: string) => {
      return state.facilityAddresses?.[facilityId] || {}
    }
  },
  actions: {
    setRejectReasons(payload: any) {
      this.rejectReasons = payload
    },
    setPartyNames(payload: any) {
      this.partyNames = payload
    },
    setShipmentMethods(payload: any) {
      this.shipmentMethodTypeDesc = payload
    },
    setShipmentBoxes(payload: any) {
      this.shipmentBoxTypeDesc = payload
    },
    setFacilityTypeDesc(payload: any) {
      this.facilityTypeDesc = payload
    },
    setPaymentMethodDesc(payload: any) {
      this.paymentMethodTypeDesc = payload
    },
    setStatusDesc(payload: any) {
      this.statusDesc = payload
    },
    setRejectReasonEnumTypes(payload: any) {
      this.rejectReasonEnumTypes = payload
    },
    setEnumerations(payload: any) {
      this.enumerations = payload
    },
    setFulfillmentRejectReasons(payload: any) {
      this.fulfillmentRejectReasons = payload
    },
    setRejectReasonOptions(payload: any) {
      this.rejectReasonOptions = payload
    },
    setCarrierShipmentBoxTypes(payload: any) {
      this.carrierShipmentBoxTypes = payload
    },
    setCarrierDesc(payload: any) {
      this.carrierDesc = payload
    },
    setShipmentMethodsByCarrier(payload: any) {
      this.shipmentMethodsByCarrier = payload
    },
    setFacilityAddresses(payload: any) {
      this.facilityAddresses = payload
    },
    async createEnumerationGroupMember(payload: any): Promise<any> {
      return api({
        url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
        method: "POST",
        data: payload,
      });
    },
    async updateEnumerationGroupMember(payload: any): Promise<any> {
      return api({
        url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
        method: "POST",
        data: payload,
      });
    },
    async createEnumeration(payload: any): Promise<any> {
      return api({
        url: `/admin/enums`,
        method: "POST",
        data: payload,
      });
    },
    async updateEnumeration(payload: any): Promise<any> {
      return api({
        url: `/admin/enums/${payload.enumId}`,
        method: "PUT",
        data: payload,
      });
    },
    async deleteEnumeration(payload: any): Promise<any> {
      return api({
        url: `/admin/enums/${payload.enumId}`,
        method: "DELETE",
      });
    },
    async isEnumExists(enumId: string): Promise<any> {
      try {
        const resp = await api({
          url: `/admin/enums`,
          method: "GET",
          params: { enumId }
        }) as any

        if (!commonUtil.hasError(resp) && resp.data.length) {
          return true
        }
        return false
      } catch (err) {
        return false
      }
    },
    async fetchAdjustmentTypeDescription(payload: any): Promise<any> {
      return api({
        url: `/oms/orderAdjustmentTypes`,
        method: "GET",
        params: payload,
      });
    },
    async fetchProductStoreDetails(payload: any): Promise<any> {
      return api({
        url: `/oms/productStores/${payload.productStoreId}`,
        method: "GET",
      });
    },
    async updateProductStoreSetting(payload: any): Promise<any> {
      return api({
        url: `/oms/productStores/${payload.productStoreId}/settings`,
        method: "POST",
        data: payload
      });
    },
    async createProductStoreSetting(payload: any): Promise<any> {
      return api({
        url: `/oms/productStores/${payload.productStoreId}/settings`,
        method: "POST",
        data: payload
      });
    },
    async fetchShopifyShopLocation(omsRedirectionUrl: string, token: any, payload: any): Promise<any> {
      const baseURL = omsRedirectionUrl.startsWith("http") ? omsRedirectionUrl.includes("/rest/s1/oms") ? omsRedirectionUrl : `${omsRedirectionUrl}/rest/s1/oms/` : `https://${omsRedirectionUrl}.hotwax.io/rest/s1/oms/`;
      return await api({
        url: "shopifyShops/locations",
        method: "GET",
        baseURL,
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        params: payload
      });
    },
    async getAvailableTimeZones(): Promise<any> {
      return api({
        url: "admin/user/getAvailableTimeZones",
        method: "get",
        cache: true
      });
    },
    clearUtilState() {
      this.carrierDesc = {}
      this.facilityAddresses = {}
      this.facilityShippingLabelImageType = {}
      this.shipmentBoxTypeDesc = {}
      this.carrierShipmentBoxTypes = {}
    },
    updateFacilityShippingLabelImageType(payload: any) {
      if (payload.facilityId) {
        this.facilityShippingLabelImageType[payload.facilityId] = payload.labelImageType
      }
    },
    async fetchRejectReasons() {
      let rejectReasons = []
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

      this.setRejectReasons(rejectReasons)
    },
    async fetchRejectReasonOptions() {
      const isAdminUser = useUserStore().hasPermission("STOREFULFILLMENT_ADMIN")
      const isApiSuccess = isAdminUser ? await this.fetchRejectReasons() : await this.fetchFulfillmentRejectReasons(true)

      this.setRejectReasonOptions(((!isAdminUser && isApiSuccess) ? Object.values(this.fulfillmentRejectReasons) : this.rejectReasons))
    },
    async fetchFulfillmentRejectReasons(fetchRestrictedRejReasons = false) {
      let isApiSuccess = true
      let fulfillmentRejectReasons = {} as any
      try {
        const payload = {
          enumerationGroupId: fetchRestrictedRejReasons ? ["FF_REJ_RSN_GRP", "FF_REJ_RSN_RES_GRP"] : ["FF_REJ_RSN_GRP"],
          enumerationGroupId_op: "in",
          pageSize: 200,
          orderByField: "sequenceNum"
        }

        const resp = await api({
          url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
          method: "GET",
          params: payload,
        });

        if (!commonUtil.hasError(resp)) {
          const rejectionsReasons = resp.data.filter((reason: any) => !reason.thruDate).reduce((rejReasons: any, reason: any) => {
            rejReasons[reason.enumerationGroupId][reason.enumId] = reason
            return rejReasons
          }, {
            FF_REJ_RSN_GRP: {},
            FF_REJ_RSN_RES_GRP: {}
          })

          fulfillmentRejectReasons = (useAppProductStore().getCurrentFacility as any).facilityTypeId === "WAREHOUSE" && Object.keys(rejectionsReasons.FF_REJ_RSN_RES_GRP).length ? rejectionsReasons.FF_REJ_RSN_RES_GRP : rejectionsReasons.FF_REJ_RSN_GRP
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch fulfillment reject reasons", err)
        await this.fetchRejectReasons()
        isApiSuccess = false
      }

      this.setFulfillmentRejectReasons(fulfillmentRejectReasons)
      return isApiSuccess
    },
    async fetchRejectReasonEnumTypes() {
      if (this.rejectReasonEnumTypes.length) {
        return
      }

      let rejectReasonEnumTypes = [] as any

      try {
        const params = {
          parentTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          parentTypeId_op: "in",
          pageIndex: 0,
          pageSize: 10
        }

        const resp = await api({
          url: `/admin/enumTypes`,
          method: "GET",
          params: params
        });

        if (!commonUtil.hasError(resp)) {
          rejectReasonEnumTypes = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error(err)
      }
      this.setRejectReasonEnumTypes(rejectReasonEnumTypes)
    },
    async fetchPartyInformation(partyIds: any[]) {
      let partyInformation = JSON.parse(JSON.stringify(this.partyNames))
      const cachedPartyIds = Object.keys(partyInformation)
      const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

      if (!ids.length) return partyInformation

      try {
        const payload = {
          partyId: ids,
          partyId_op: "in",
          fieldsToSelect: ["firstName", "middleName", "lastName", "groupName", "partyId"],
          pageSize: ids.length
        }

        const resp = await api({
          url: `/oms/parties`,
          method: "GET",
          params: payload,
        });

        if (!commonUtil.hasError(resp)) {
          const partyResp = {} as any
          resp.data.map((partyInformation: any) => {
            let partyName = ""
            if (partyInformation.groupName) {
              partyName = partyInformation.groupName
            } else {
              partyName = [partyInformation.firstName, partyInformation.lastName].join(" ")
            }

            partyResp[partyInformation.partyId] = partyName
          })

          partyInformation = {
            ...partyInformation,
            ...partyResp
          }

          this.setPartyNames(partyInformation)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Error fetching party information", err)
      }

      return partyInformation
    },
    async fetchCarrierShipmentBoxTypes() {
      try {
        const shipmentBoxTypeDesc = {} as any
        const resp = await api({
          url: "/oms/shippingGateways/carrierShipmentBoxTypes",
          method: "GET",
          params: {
            pageIndex: 0,
            pageSize: 100,
            fieldsToSelect: ["shipmentBoxTypeId", "partyId"]
          }
        })

        const shipmentBoxTypeIds = new Set()

        if (!commonUtil.hasError(resp)) {
          const shipmentBoxTypeDetail = resp.data.reduce((shipmentBoxTypes: any, carrierShipmentBoxType: any) => {
            shipmentBoxTypeIds.add(carrierShipmentBoxType.shipmentBoxTypeId)
            if (shipmentBoxTypes[carrierShipmentBoxType.partyId]) {
              shipmentBoxTypeDesc[carrierShipmentBoxType.shipmentBoxTypeId] = carrierShipmentBoxType?.shipmentBoxType?.description
              shipmentBoxTypes[carrierShipmentBoxType.partyId].push({ shipmentBoxTypeId: carrierShipmentBoxType.shipmentBoxTypeId, description: carrierShipmentBoxType?.shipmentBoxType?.description })
            } else {
              shipmentBoxTypeDesc[carrierShipmentBoxType.shipmentBoxTypeId] = carrierShipmentBoxType?.shipmentBoxType?.description
              shipmentBoxTypes[carrierShipmentBoxType.partyId] = [{ shipmentBoxTypeId: carrierShipmentBoxType.shipmentBoxTypeId, description: carrierShipmentBoxType?.shipmentBoxType?.description }]
            }
            return shipmentBoxTypes
          }, {})

          this.setShipmentBoxes(shipmentBoxTypeDesc)
          this.setCarrierShipmentBoxTypes(shipmentBoxTypeDetail)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch carrier shipment box type information", err)
      }
    },
    async fetchShipmentMethodTypeDesc(shipmentMethodTypeIds: string[]) {
      let shipmentMethodTypeDesc = JSON.parse(JSON.stringify(this.shipmentMethodTypeDesc))
      const cachedShipmentMethodTypeIds = Object.keys(shipmentMethodTypeDesc)
      const ids = shipmentMethodTypeIds.filter((shipmentMethodTypeId: string) => !cachedShipmentMethodTypeIds.includes(shipmentMethodTypeId))

      if (!ids.length) return shipmentMethodTypeDesc

      try {
        const payload = {
          shipmentMethodTypeId: ids,
          shipmentMethodTypeId_op: "in",
          fieldsToSelect: ["shipmentMethodTypeId", "description"],
          pageSize: ids.length
        }

        const resp = await api({
          url: `/oms/shippingGateways/shipmentMethodTypes`,
          method: "GET",
          params: payload,
        });

        if (!commonUtil.hasError(resp)) {
          const shipmentMethodResp = {} as any
          resp.data.map((shipmentMethodInformation: any) => {
            shipmentMethodResp[shipmentMethodInformation.shipmentMethodTypeId] = shipmentMethodInformation.description
          })

          shipmentMethodTypeDesc = {
            ...shipmentMethodTypeDesc,
            ...shipmentMethodResp
          }

          this.setShipmentMethods(shipmentMethodTypeDesc)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Error fetching shipment description", err)
      }

      return shipmentMethodTypeDesc
    },
    async fetchFacilityTypeInformation(facilityTypeIds: any[]) {
      const facilityTypeDesc = JSON.parse(JSON.stringify(this.facilityTypeDesc))

      const cachedFacilityTypeIds = Object.keys(facilityTypeDesc)
      const facilityTypeIdFilter = [...new Set(facilityTypeIds.filter((facilityTypeId: any) => !cachedFacilityTypeIds.includes(facilityTypeId)))]

      if (!facilityTypeIdFilter.length) return

      const payload = {
        facilityTypeId: facilityTypeIds,
        facilityTypeId_op: "in",
        pageSize: facilityTypeIds.length,
        fieldsToSelect: ["facilityTypeId", "typeDescription"]
      }

      try {
        const resp = await api({
          url: `/oms/facilities`,
          method: "GET",
          params: payload,
        });

        if (!commonUtil.hasError(resp) && resp.data?.length > 0) {
          resp.data.map((facilityType: any) => {
            facilityTypeDesc[facilityType.facilityTypeId] = facilityType.typeDescription
          })

          this.setFacilityTypeDesc(facilityTypeDesc)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch description for facility types", err)
      }
    },
    async fetchPaymentMethodTypeDesc(paymentMethodTypeIds: string[]) {
      let paymentMethodTypeDesc = JSON.parse(JSON.stringify(this.paymentMethodTypeDesc))
      const cachedPaymentMethodTypeIds = Object.keys(paymentMethodTypeDesc)
      const ids = paymentMethodTypeIds.filter((paymentMethodTypeId: string) => !cachedPaymentMethodTypeIds.includes(paymentMethodTypeId))

      if (!ids.length) return paymentMethodTypeDesc

      try {
        const payload = {
          paymentMethodTypeId: ids,
          paymentMethodTypeId_op: "in",
          fieldsToSelect: ["paymentMethodTypeId", "description"],
          pageSize: ids.length
        }

        const resp = await api({
          url: `/oms/paymentMethodTypes`,
          method: "GET",
          params: payload
        });

        if (!commonUtil.hasError(resp)) {
          const paymentMethodResp = {} as any
          resp.data.map((paymentMethodType: any) => {
            paymentMethodResp[paymentMethodType.paymentMethodTypeId] = paymentMethodType.description
          })

          paymentMethodTypeDesc = {
            ...paymentMethodTypeDesc,
            ...paymentMethodResp
          }

          this.setPaymentMethodDesc(paymentMethodTypeDesc)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Error fetching payment method description", err)
      }

      return paymentMethodTypeDesc
    },
    async fetchStatusDesc(statusIds: string[]) {
      let statusDesc = JSON.parse(JSON.stringify(this.statusDesc))
      const cachedStatusIds = Object.keys(statusDesc)
      const ids = statusIds.filter((statusId: string) => !cachedStatusIds.includes(statusId))

      if (!ids.length) return statusDesc

      try {
        const payload = {
          statusId: ids,
          statusId_op: "in",
          fieldsToSelect: ["statusId", "description"],
          pageSize: ids.length
        }

        const resp = await api({
          url: `/oms/statuses`,
          method: "GET",
          params: payload
        });

        if (!commonUtil.hasError(resp)) {
          const statusResp = {} as any
          resp.data.map((statusItem: any) => {
            statusResp[statusItem.statusId] = statusItem.description
          })

          statusDesc = {
            ...statusDesc,
            ...statusResp
          }

          this.setStatusDesc(statusDesc)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Error fetching status description", err)
      }

      return statusDesc
    },
    async fetchEnumerations(ids: string[]) {
      let enumerations = JSON.parse(JSON.stringify(this.enumerations)) as any

      const enumIds = ids.filter((enumId: string) => !enumerations[enumId])

      if (!enumIds.length) {
        return
      }

      try {
        const payload = {
          enumId: enumIds,
          enumId_op: "in",
          pageSize: enumIds.length,
          fieldsToSelect: ["enumId", "description"]
        }

        const resp = await api({
          url: `/admin/enums`,
          method: "GET",
          params: payload
        });

        if (!commonUtil.hasError(resp)) {
          enumerations = resp.data.reduce((enums: any, enumeration: any) => {
            enums[enumeration.enumId] = enumeration.description
            return enums
          }, enumerations)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error(err)
      }

      this.setEnumerations(enumerations)
    },
    async updateRejectReasons(payload: any) {
      this.setRejectReasons(payload)
    },
    async fetchCarriersDetail() {
      if (Object.keys(this.carrierDesc)?.length) return
      const carrierDesc = {} as any

      try {
        const resp = await api({
          url: `/oms/shippingGateways/carrierParties`,
          method: "GET",
          params: {
            roleTypeId: "CARRIER",
            fieldsToSelect: ["partyId", "partyTypeId", "roleTypeId", "firstName", "lastName", "groupName"],
            distinct: "Y",
            pageSize: 20
          },
        });

        if (!commonUtil.hasError(resp)) {
          resp.data.map((carrier: any) => {
            const personName = [carrier.firstName, carrier.lastName].filter(Boolean).join(" ")
            carrierDesc[carrier.partyId] = (carrier.partyTypeId === "PERSON" && personName) || carrier.groupName || carrier.partyId
          })
        } else {
          throw resp.data
        }
      } catch (err: any) {
        logger.error("error", err)
      }
      this.setCarrierDesc(carrierDesc)
    },
    async fetchStoreCarrierAndMethods() {
      let shipmentMethodsByCarrier = {}

      try {
        const payload = {
          customParametersMap: {
            productStoreId: useAppProductStore().getCurrentEComStore?.productStoreId,
            roleTypeId: "CARRIER",
            shipmentMethodTypeId: "STOREPICKUP",
            shipmentMethodTypeId_op: "equals",
            shipmentMethodTypeId_not: "Y",
            pageIndex: 0,
            pageSize: 100
          },
          dataDocumentId: "ProductStoreShipmentMethod",
          filterByDate: true
        }

        const resp = await api({
          url: `/oms/dataDocumentView`,
          method: "POST",
          data: payload,
        });

        if (!commonUtil.hasError(resp)) {
          const storeCarrierAndMethods = resp.data.entityValueList
          shipmentMethodsByCarrier = storeCarrierAndMethods.reduce((shipmentMethodsByCarrier: any, storeCarrierAndMethod: any) => {
            const { partyId, shipmentMethodTypeId, description } = storeCarrierAndMethod

            if (!shipmentMethodsByCarrier[partyId]) shipmentMethodsByCarrier[partyId] = []
            if (!shipmentMethodsByCarrier[partyId].some((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)) {
              shipmentMethodsByCarrier[partyId].push({ shipmentMethodTypeId, description })
            }
            return shipmentMethodsByCarrier
          }, {})
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Error fetching status description", err)
      }
      this.setShipmentMethodsByCarrier(shipmentMethodsByCarrier)
    },
    async fetchFacilityAddresses(facilityIds: string[]) {
      const facilityAddresses = this.facilityAddresses ? JSON.parse(JSON.stringify(this.facilityAddresses)) : {}
      const addresses = [] as any
      const remainingFacilityIds = [] as any

      facilityIds.map((facilityId: string) => {
        facilityAddresses[facilityId] ? addresses.push(facilityAddresses[facilityId]) : remainingFacilityIds.push(facilityId)
      })

      if (!remainingFacilityIds?.length) return addresses

      try {
        const responses = await Promise.all(
          remainingFacilityIds.map((facilityId: any) =>
            api({
              url: `/oms/facilityContactMechs`,
              method: "GET",
              params: {
                contactMechPurposeTypeId: "PRIMARY_LOCATION",
                contactMechTypeId: "POSTAL_ADDRESS",
                facilityId: useAppProductStore().getCurrentFacility?.facilityId
              },
            })
          )
        )

        const hasFailedResponse = responses.some((response: any) => response.status === "rejected")
        if (hasFailedResponse) {
          throw responses
        }

        responses.map((response: any) => {
          if (response.data?.facilityContactMechs?.length) {
            response.data.facilityContactMechs.map((facilityAddress: any) => {
              facilityAddresses[facilityAddress.facilityId] = facilityAddress
              addresses.push(facilityAddress)
            })
          }
        })
      } catch (error) {
        logger.error(error)
      }
      this.setFacilityAddresses(facilityAddresses)
    },
    async fetchLabelImageType(carrierId: any) {
      const facilityId = (useAppProductStore().getCurrentFacility as any).facilityId
      let labelImageType = "PNG"
      if (this.facilityShippingLabelImageType[facilityId]) {
        return this.facilityShippingLabelImageType[facilityId]
      }

      let isFacilityZPLConfigured = false;
      try {
        const resp = await api({
          url: `/oms/dataDocumentView`,
          method: "POST",
          data: {
            customParametersMap: {
              facilityGroupId: "ZPL_SHIPPING_LABEL",
              facilityGroupTypeId: "SHIPPING_LABEL",
              pageIndex: 0,
              pageSize: 1
            },
            dataDocumentId: "FacilityGroupAndMember",
            filterByDate: true,
          }
        });

        if (!commonUtil.hasError(resp) && resp.data?.entityValueList?.length > 0) {
          isFacilityZPLConfigured = true
        }
      } catch (err) {
        logger.error(err)
      }

      if (isFacilityZPLConfigured) {
        labelImageType = "ZPLII"
        this.updateFacilityShippingLabelImageType({
          labelImageType,
          facilityId
        })
        return labelImageType
      }

      try {
        const resp = await api({
          url: `/admin/systemProperties`,
          method: "GET",
          params: { "systemResourceId": carrierId, "systemPropertyId": "shipment.carrier.labelImageType", "pageSize": 1 }
        });

        if (commonUtil.hasError(resp) || !resp.data.length) {
          throw resp.data
        }

        const labelImageType = resp?.data[0]?.systemPropertyValue
        this.updateFacilityShippingLabelImageType({
          labelImageType,
          facilityId
        })
        return labelImageType
      } catch (err) {
        logger.error("Failed to fetch label image type", err)
      }
    },
    async updateProductStoreSettingConfig(config: any) {
      try {
        const {
          enumId,
          payload,
          createService,
          requireEnum = false,
          enumMeta = { description: enumId, enumName: enumId }
        } = config

        if (requireEnum) {
          let enumExists = false
          try {
            const resp = await api({
              url: `/admin/enums`,
              method: "GET",
              params: { enumId }
            }) as any

            if (!commonUtil.hasError(resp) && resp.data.length) {
              enumExists = true
            }
          } catch (err) {
            enumExists = false
          }

          if (!enumExists) {
            const enumPayload = {
              enumId,
              enumTypeId: "PROD_STR_STNG",
              enumCode: enumId,
              description: enumMeta.description,
              enumName: enumMeta.enumName
            }
            const enumResponse = await api({
              url: `/admin/enums`,
              method: "POST",
              data: enumPayload,
            });

            if (commonUtil.hasError(enumResponse)) {
              throw new Error("Failed to create enumeration")
            }
          }
        }

        let isSettingAlreadyExists = false
        try {
          const fetchSetting = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: {
              dataDocumentId: "ProductStoreSetting",
              customParametersMap: {
                productStoreId: useAppProductStore().getCurrentEComStore?.productStoreId,
                settingTypeEnumId: enumId,
                fieldsToSelect: ["settingTypeEnumId"],
                pageSize: 1
              }
            }
          });
          isSettingAlreadyExists = fetchSetting?.data?.entityValueList?.length > 0
        } catch (err) {
          logger.error(`Unable to check existence for ${enumId}`, err)
        }

        let response
        if (isSettingAlreadyExists) {
          response = await api({
            url: `/oms/productStores/${useAppProductStore().getCurrentEComStore?.productStoreId}/settings`,
            method: "POST",
            data: {
              productStoreId: useAppProductStore().getCurrentEComStore?.productStoreId,
              settingTypeEnumId: enumId,
              ...payload
            }
          });
        } else {
          response = await createService({
            productStoreId: useAppProductStore().getCurrentEComStore?.productStoreId,
            settingTypeEnumId: enumId,
            ...payload
          })
        }

        if (!commonUtil.hasError(response)) {
          commonUtil.showToast("Configuration updated")
        } else {
          commonUtil.showToast("Failed to update configuration")
        }
      } catch (error) {
        commonUtil.showToast("Failed to update configuration")
        logger.error("Error updating product store setting:", error)
      }
    }
  },
  persist: {
    paths: [
      "carrierDesc",
      "facilityAddresses",
      "shipmentBoxTypeDesc",
      "carrierShipmentBoxTypes"
    ]
  }
})
