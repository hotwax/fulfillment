import { defineStore } from "pinia"
import { UtilService } from "@/services/UtilService"
import { hasError } from "@/adapter"
import logger from "@/logger"
import { showToast, getProductStoreId, getCurrentFacilityId, parseBooleanSetting } from "@/utils"
import { useUserStore as useDxpUserStore } from "@hotwax/dxp-components"
import { useUserStore } from "@/store/user"

interface UtilState {
  rejectReasons: any[]
  partyNames: Record<string, any>
  shipmentMethodTypeDesc: Record<string, any>
  shipmentBoxTypeDesc: Record<string, any>
  facilityTypeDesc: Record<string, any>
  paymentMethodTypeDesc: Record<string, any>
  statusDesc: Record<string, any>
  productStoreShipmentMethCount: number
  rejectReasonEnumTypes: any[]
  enumerations: Record<string, any>
  productStores: any[]
  facilities: any[]
  isForceScanEnabled: boolean
  fulfillmentRejectReasons: Record<string, any>
  rejectReasonOptions: any[]
  barcodeIdentificationPref: string
  carrierShipmentBoxTypes: Record<string, any>
  carrierDesc: Record<string, any>
  shipmentMethodsByCarrier: Record<string, any>
  facilityAddresses: Record<string, any>
  facilityShippingLabelImageType: Record<string, any>
  isPicklistDownloadEnabled: boolean
  excludeOrderBrokerDays: any
  partialOrderRejectionConfig: any
  collateralRejectionConfig: any
  affectQohConfig: any
  isShipNowDisabled: boolean
  isUnpackDisabled: boolean
  isReservationFacilityFieldEnabled: boolean
  productStoreSettings: Record<string, any>
  isAutoShippingLabelEnabled: boolean
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
    productStoreShipmentMethCount: 0,
    rejectReasonEnumTypes: [],
    enumerations: {},
    productStores: [],
    facilities: [],
    isForceScanEnabled: false,
    fulfillmentRejectReasons: {},
    rejectReasonOptions: [],
    barcodeIdentificationPref: "internalName",
    carrierShipmentBoxTypes: {},
    carrierDesc: {},
    shipmentMethodsByCarrier: {},
    facilityAddresses: {},
    facilityShippingLabelImageType: {},
    isPicklistDownloadEnabled: false,
    excludeOrderBrokerDays: undefined,
    partialOrderRejectionConfig: {},
    collateralRejectionConfig: {},
    affectQohConfig: {},
    isShipNowDisabled: false,
    isUnpackDisabled: false,
    isReservationFacilityFieldEnabled: false,
    productStoreSettings: {},
    isAutoShippingLabelEnabled: false
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
    getProductStoreShipmentMethCount(state) {
      return state.productStoreShipmentMethCount
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
    getProductStores(state) {
      return state.productStores
    },
    getFacilities(state) {
      return state.facilities
    },
    isForceScanEnabled(state) {
      return parseBooleanSetting(state.productStoreSettings.FULFILL_FORCE_SCAN)
    },
    getFulfillmentRejectReasons(state) {
      return state.fulfillmentRejectReasons
    },
    getRejectReasonOptions(state) {
      return state.rejectReasonOptions
    },
    getBarcodeIdentificationPref(state) {
      return state.productStoreSettings.BARCODE_IDEN_PREF
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
    isPicklistDownloadEnabled(state) {
      return parseBooleanSetting(state.productStoreSettings.FF_DOWNLOAD_PICKLIST)
    },
    getExcludeOrderBrokerDays(state) {
      return state.productStoreSettings.EXCLUDE_ODR_BKR_DAYS
    },
    getPartialOrderRejectionConfig(state) {
      return state.productStoreSettings.FULFILL_PART_ODR_REJ && JSON.parse(state.productStoreSettings.FULFILL_PART_ODR_REJ)
    },
    getCollateralRejectionConfig(state) {
      return state.productStoreSettings.FF_COLLATERAL_REJ && JSON.parse(state.productStoreSettings.FF_COLLATERAL_REJ)
    },
    getAffectQohConfig(state) {
      return state.productStoreSettings.AFFECT_QOH_ON_REJ && JSON.parse(state.productStoreSettings.AFFECT_QOH_ON_REJ)
    },
    isShipNowDisabled(state) {
      return parseBooleanSetting(state.productStoreSettings.DISABLE_SHIPNOW)
    },
    isUnpackDisabled(state) {
      return parseBooleanSetting(state.productStoreSettings.DISABLE_UNPACK)
    },
    isReservationFacilityFieldEnabled(state) {
      return parseBooleanSetting(state.productStoreSettings.USE_RES_FACILITY_ID)
    },
    getProductStoreSetting(state) {
      return state.productStoreSettings
    },
    isAutoShippingLabelEnabled(state) {
      return state.isAutoShippingLabelEnabled
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
    setProductStoreShipmentMethCount(payload: any) {
      this.productStoreShipmentMethCount = payload
    },
    setRejectReasonEnumTypes(payload: any) {
      this.rejectReasonEnumTypes = payload
    },
    setEnumerations(payload: any) {
      this.enumerations = payload
    },
    setFacilities(payload: any) {
      this.facilities = payload
    },
    setProductStores(payload: any) {
      this.productStores = payload
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
    clearUtilState() {
      this.productStoreShipmentMethCount = 0
      this.isForceScanEnabled = false
      this.barcodeIdentificationPref = "internalName"
      this.carrierDesc = {}
      this.facilityAddresses = {}
      this.facilityShippingLabelImageType = {}
      this.isPicklistDownloadEnabled = false
      this.shipmentBoxTypeDesc = {}
      this.carrierShipmentBoxTypes = {}
      this.excludeOrderBrokerDays = undefined
      this.productStoreSettings = JSON.parse(process.env.VUE_APP_DEFAULT_PRODUCT_STORE_SETTINGS as any)
      this.isAutoShippingLabelEnabled = false
    },
    updateFacilityShippingLabelImageType(payload: any) {
      if (payload.facilityId) {
        this.facilityShippingLabelImageType[payload.facilityId] = payload.labelImageType
      }
    },
    setProductStoreSettings(payload: any) {
      this.productStoreSettings = payload
    },
    updateProductStoreSetting(payload: any) {
      const { key, value } = payload
      this.productStoreSettings = {
        ...this.productStoreSettings,
        [key]: value
      }
    },
    setAutoShippingLabelEnabled(payload: any) {
      this.isAutoShippingLabelEnabled = payload
    },
    async fetchProductStoreSettings(productStoreId: string) {
      const defaultProductStoreSettings = JSON.parse(process.env.VUE_APP_DEFAULT_PRODUCT_STORE_SETTINGS as any)
      const productStoreSettings: any = { ...defaultProductStoreSettings }
      const payload = {
        productStoreId,
        settingTypeEnumId: Object.keys(defaultProductStoreSettings),
        settingTypeEnumId_op: "in",
        pageIndex: 0,
        pageSize: 50
      }
      try {
        const resp = await UtilService.fetchProductStoreSetting(payload) as any

        resp?.data?.entityValueList?.forEach((productSetting: any) => {
          return productStoreSettings[productSetting.settingTypeEnumId] = productSetting.settingValue
        })
      } catch (error) {
        logger.error("Failed to fetch settings", error)
      }
      this.setProductStoreSettings(productStoreSettings)
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

        const resp = await UtilService.fetchRejectReasons(payload)
        if (!hasError(resp)) {
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
      const permissions = useUserStore().getUserPermissions

      const isAdminUser = permissions.some((permission: any) => permission.action === "APP_STOREFULFILLMENT_ADMIN")
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

        const resp = await UtilService.fetchFulfillmentRejectReasons(payload)

        if (!hasError(resp)) {
          const rejectionsReasons = resp.data.filter((reason: any) => !reason.thruDate).reduce((rejReasons: any, reason: any) => {
            rejReasons[reason.enumerationGroupId][reason.enumId] = reason
            return rejReasons
          }, {
            FF_REJ_RSN_GRP: {},
            FF_REJ_RSN_RES_GRP: {}
          })

          fulfillmentRejectReasons = (useDxpUserStore().getCurrentFacility as any).facilityTypeId === "WAREHOUSE" && Object.keys(rejectionsReasons.FF_REJ_RSN_RES_GRP).length ? rejectionsReasons.FF_REJ_RSN_RES_GRP : rejectionsReasons.FF_REJ_RSN_GRP
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

        const resp = await UtilService.fetchRejectReasonEnumTypes(params)
        if (!hasError(resp)) {
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

        const resp = await UtilService.fetchPartyInformation(payload)

        if (!hasError(resp)) {
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
        const resp = await UtilService.fetchCarrierShipmentBoxTypes({
          pageIndex: 0,
          pageSize: 100,
          fieldsToSelect: ["shipmentBoxTypeId", "partyId"]
        })

        const shipmentBoxTypeIds = new Set()

        if (!hasError(resp)) {
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

        const resp = await UtilService.fetchShipmentMethodTypeDesc(payload)

        if (!hasError(resp)) {
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
        const resp = await UtilService.fetchFacilityTypeInformation(payload)

        if (!hasError(resp) && resp.data?.length > 0) {
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

        const resp = await UtilService.fetchPaymentMethodTypeDesc(payload)

        if (!hasError(resp)) {
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

        const resp = await UtilService.fetchStatusDesc(payload)

        if (!hasError(resp)) {
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
    async findProductStoreShipmentMethCount() {
      let productStoreShipmentMethCount = 0
      const params = {
        partyId: "_NA_",
        partyId_op: "equals",
        partyId_not: "Y",
        roleTypeId: "CARRIER",
        productStoreId: getProductStoreId(),
        fieldsToSelect: ["roleTypeId", "partyId"],
        pageSize: 1
      }

      try {
        const resp = await UtilService.findProductStoreShipmentMethCount(params)

        if (!hasError(resp)) {
          productStoreShipmentMethCount = resp.data[0]?.shipmentMethodCount
        } else {
          throw resp?.data
        }
      } catch (err) {
        logger.error("Failed to find shipment method count for product store", err)
      }

      this.setProductStoreShipmentMethCount(productStoreShipmentMethCount)
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

        const resp = await UtilService.fetchEnumeration(payload)
        if (!hasError(resp)) {
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
    async fetchFacilities() {
      let facilities = []
      try {
        const payload = {
          parentTypeId: "VIRTUAL_FACILITY",
          parentTypeId_op: "equals",
          parentTypeId_not: "Y",
          facilityTypeId: "VIRTUAL_FACILITY",
          facilityTypeId_op: "equals",
          facilityTypeId_not: "Y",
          pageSize: 250
        }

        const resp = await UtilService.fetchFacilities(payload)

        if (!hasError(resp)) {
          facilities = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch facilities", err)
      }
      this.setFacilities(facilities)
    },
    async fetchProductStores() {
      let stores = []
      try {
        const payload = {
          fieldsToSelect: ["productStoreId", "storeName"],
          pageSize: 250
        }

        const resp = await UtilService.fetchProductStores(payload)
        if (!hasError(resp)) {
          stores = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch product stores", err)
      }
      this.setProductStores(stores)
    },
    async fetchCarriersDetail() {
      if (Object.keys(this.carrierDesc)?.length) return
      const carrierDesc = {} as any

      try {
        const resp = await UtilService.fetchCarriers({
          roleTypeId: "CARRIER",
          fieldsToSelect: ["partyId", "partyTypeId", "roleTypeId", "firstName", "lastName", "groupName"],
          distinct: "Y",
          pageSize: 20
        })

        if (!hasError(resp)) {
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
            productStoreId: getProductStoreId(),
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

        const resp = await UtilService.fetchStoreCarrierAndMethods(payload)

        if (!hasError(resp)) {
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
            UtilService.fetchFacilityAddresses({
              contactMechPurposeTypeId: "PRIMARY_LOCATION",
              contactMechTypeId: "POSTAL_ADDRESS",
              facilityId
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
      const facilityId = (useDxpUserStore().getCurrentFacility as any).facilityId
      let labelImageType = "PNG"
      if (this.facilityShippingLabelImageType[facilityId]) {
        return this.facilityShippingLabelImageType[facilityId]
      }

      const isFacilityZPLConfigured = await UtilService.fetchFacilityZPLGroupInfo()

      if (isFacilityZPLConfigured) {
        labelImageType = "ZPLII"
        this.updateFacilityShippingLabelImageType({
          labelImageType,
          facilityId
        })
        return labelImageType
      }

      try {
        const resp = await UtilService.fetchLabelImageType(carrierId)

        if (hasError(resp) || !resp.data.length) {
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
          const enumExists = await UtilService.isEnumExists(enumId)
          if (!enumExists) {
            const enumPayload = {
              enumId,
              enumTypeId: "PROD_STR_STNG",
              enumCode: enumId,
              description: enumMeta.description,
              enumName: enumMeta.enumName
            }
            const enumResponse = await UtilService.createEnumeration(enumPayload)
            if (hasError(enumResponse)) {
              throw new Error("Failed to create enumeration")
            }
          }
        }

        let isSettingAlreadyExists = false
        try {
          const fetchSetting = await UtilService.fetchProductStoreSetting({
            productStoreId: getProductStoreId(),
            settingTypeEnumId: enumId,
            fieldsToSelect: ["settingTypeEnumId"],
            pageSize: 1
          })
          isSettingAlreadyExists = fetchSetting?.data?.entityValueList?.length > 0
        } catch (err) {
          logger.error(`Unable to check existence for ${enumId}`, err)
        }

        let response
        if (isSettingAlreadyExists) {
          response = await UtilService.updateProductStoreSetting({
            productStoreId: getProductStoreId(),
            settingTypeEnumId: enumId,
            ...payload
          })
        } else {
          response = await createService({
            productStoreId: getProductStoreId(),
            settingTypeEnumId: enumId,
            ...payload
          })
        }

        if (!hasError(response)) {
          this.updateProductStoreSetting({
            key: enumId,
            value: payload.settingValue
          })
          showToast("Configuration updated")
        } else {
          showToast("Failed to update configuration")
        }
      } catch (error) {
        showToast("Failed to update configuration")
        logger.error("Error updating product store setting:", error)
      }
    },
    async fetchAutoShippingLabelConfig() {
      let resp: any
      try {
        const currentFacility: any = getCurrentFacilityId()
        resp = await UtilService.getFacilityGroupAndMemberDetails({
          customParametersMap: {
            facilityId: currentFacility,
            facilityGroupId: "AUTO_SHIPPING_LABEL",
            pageIndex: 0,
            pageSize: 1
          },
          dataDocumentId: "FacilityGroupAndMember",
          filterByDate: true
        })

        if (!hasError(resp) && resp.data?.entityValueList?.length > 0) {
          this.setAutoShippingLabelEnabled(true)
        } else {
          this.setAutoShippingLabelEnabled(false)
        }
      } catch (err) {
        logger.error("Failed to check auto shipping label group", err)
        this.setAutoShippingLabelEnabled(false)
      }
    }
  },
  persist: {
    paths: [
      "productStoreShipmentMethCount",
      "isForceScanEnabled",
      "isPicklistDownloadEnabled",
      "barcodeIdentificationPref",
      "carrierDesc",
      "facilityAddresses",
      "shipmentBoxTypeDesc",
      "carrierShipmentBoxTypes",
      "excludeOrderBrokerDays",
      "productStoreSettings"
    ]
  }
})
