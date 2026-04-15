import { defineStore } from "pinia"
import { commonUtil, logger, translate, api } from "@common";
import { DateTime } from "luxon";

import { useProductStore as useAppProductStore } from "@/store/productStore";

interface CarrierState {
  carrier: {
    list: any[]
    total: number
  }
  current: any
  shipmentMethodQuery: any
  shipmentMethods: Record<string, any>
  carrierShipmentMethodsByProductStore: Record<string, any>
  facilityCarriers: any[]
  productStoreShipmentMethods: any[]
  shipmentGatewayConfigs: any
}

export const useCarrierStore = defineStore("carrier", {
  state: (): CarrierState => ({
    carrier: {
      list: [],
      total: 0
    },
    current: {},
    shipmentMethodQuery: {},
    shipmentMethods: {},
    carrierShipmentMethodsByProductStore: {},
    facilityCarriers: [],
    productStoreShipmentMethods: [],
    shipmentGatewayConfigs: []
  }),
  getters: {
    getCarriers(state) {
      return state.carrier
    },
    getCurrent(state) {
      return state.current
    },
    getShipmentMethodQuery(state) {
      return state.shipmentMethodQuery
    },
    getShipmentMethods(state) {
      return state.shipmentMethods
    },
    getFilteredShipmentMethods(state) {
      let shipmentMethods = Object.values(JSON.parse(JSON.stringify(state.shipmentMethods)))

      const query = state.shipmentMethodQuery

      if (query.showSelected) {
        shipmentMethods = shipmentMethods.filter((shipmentMethod: any) => shipmentMethod.isChecked)
        commonUtil.sortItems(shipmentMethods, "sequenceNumber")
      }
      return shipmentMethods
    },
    getCarrierShipmentMethodsByProductStore(state) {
      return state.carrierShipmentMethodsByProductStore
    },
    getProductStoreShipmentMethods(state) {
      return state.productStoreShipmentMethods
    },
    getCarrierFacilities(state) {
      return state.current.facilities || {}
    },
    getFacilityCarriers(state) {
      return state.facilityCarriers
    },
    getShipmentGatewayConfigs(state) {
      return state.shipmentGatewayConfigs
    }
  },
  actions: {
    setCurrent(payload: any) {
      this.current = payload
    },
    setCarriers(payload: any) {
      this.carrier.list = payload.list
      this.carrier.total = payload.total
    },
    clearCarriers() {
      this.carrier = {
        list: [],
        total: 0
      }
    },
    clearCurrentCarrier() {
      this.current = {}
    },
    setShipmentMethods(payload: any) {
      this.shipmentMethods = payload
    },
    setShipmentMethodQuery(payload: any) {
      this.shipmentMethodQuery = payload.query
    },
    setCarrierShipmentMethodsByProductStore(payload: any) {
      this.carrierShipmentMethodsByProductStore = payload
    },
    setProductStoreShipmentMethods(payload: any) {
      this.productStoreShipmentMethods = payload
    },
    setFacilityCarriers(payload: any) {
      this.facilityCarriers = payload
    },
    setShipmentGatewayConfigs(payload: any) {
      this.shipmentGatewayConfigs = payload
    },
    async createCarrier(payload: any) {
      try {
        const resp = await api({
          url: "/oms/shippingGateways/carrierParties",
          method: "POST",
          data: payload
        })

        if (!commonUtil.hasError(resp)) {
          return Promise.resolve(resp.data?.partyId)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to create carrier", err)
        return Promise.reject(err)
      }
    },
    async updateCarrier(payload: any) {
      try {
        const resp = await api({
          url: `/ admin / organizations / ${payload.partyId} `,
          method: "POST",
          data: payload
        })

        if (!commonUtil.hasError(resp)) {
          return Promise.resolve(resp.data)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to update carrier", err)
        return Promise.reject(err)
      }
    },
    async fetchCarriers(params?: any) {
      if (params) {
        return api({
          url: `/oms/shippingGateways/carrierParties`,
          method: "GET",
          params,
        });
      }

      let carriers = {} as any
      let resp
      try {
        const params = {
          roleTypeId: "CARRIER",
          partyTypeId: "PARTY_GROUP",
          fieldsToSelect: ["partyId", "groupName"],
          pageIndex: 0,
          pageSize: 250,
          orderByField: "groupName"
        }

        resp = await api({
          url: `/oms/shippingGateways/carrierShipmentMethods/counts`,
          method: "GET",
          params
        });

        if (!commonUtil.hasError(resp)) {
          carriers = { list: resp.data, total: resp.data?.length }
          this.setCarriers(carriers)
        } else {
          throw resp.data
        }
      } catch (err: any) {
        logger.error("error", err)
        return Promise.reject(new Error(err))
      }
    },
    async fetchCarrierDetail(payload: any) {
      let resp
      try {
        const params = {
          roleTypeId: "CARRIER",
          partyId: payload.partyId,
          fieldToSelect: ["partyId", "roleTypeId", "firstName", "lastName", "groupName"],
          pageIndex: 0,
          pageSize: 1
        }

        resp = await api({
          url: `/oms/shippingGateways/carrierShipmentMethods/counts`,
          method: "GET",
          params
        });

        if (!commonUtil.hasError(resp)) {
          this.setCurrent(resp.data[0])
          await this.fetchCarrierShipmentMethods({ partyId: payload.partyId })
        } else {
          throw resp.data
        }
      } catch (err: any) {
        logger.error("error", err)
        return Promise.reject(new Error(err))
      }
    },
    async fetchCarrierShipmentMethods(payload: any) {
      let resp
      let currentCarrier = JSON.parse(JSON.stringify(this.current))

      try {
        const params = {
          roleTypeId: "CARRIER",
          partyId: payload.partyId,
          fieldsToSelect: ["partyId", "roleTypeId", "shipmentMethodTypeId", "carrierServiceCode", "deliveryDays", "sequenceNumber"],
          pageIndex: 0,
          pageSize: 250,
          orderByField: "sequenceNumber"
        }

        resp = await api({
          url: `/oms/shippingGateways/carrierShipmentMethods`,
          method: "GET",
          params
        });

        if (!commonUtil.hasError(resp)) {
          currentCarrier = {
            ...currentCarrier,
            shipmentMethods: resp.data.reduce((shipmentMethodDetail: any, shipmentMethodType: any) => {
              shipmentMethodDetail[shipmentMethodType.shipmentMethodTypeId] = shipmentMethodType
              return shipmentMethodDetail
            }, {})
          }
        } else {
          throw resp.data
        }
      } catch (err: any) {
        logger.error("error", err)
      }
      this.setCurrent(currentCarrier)
    },
    async fetchProductStoreShipmentMethods(payload: any) {
      let currentCarrier = JSON.parse(JSON.stringify(this.current))
      let productStoreShipmentMethods = [] as any
      let viewIndex = 0
      let resp

      try {
        do {
          const params = {
            customParametersMap: {
              roleTypeId: "CARRIER",
              partyId: payload.partyId,
              pageIndex: viewIndex,
              pageSize: 250
            },
            dataDocumentId: "ProductStoreShipmentMethod",
            filterByDate: true
          }

          resp = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: params
          });

          if (!commonUtil.hasError(resp)) {
            productStoreShipmentMethods = [...productStoreShipmentMethods, ...resp.data.entityValueList]
            viewIndex++
          } else {
            throw resp.data
          }
        } while (resp.data?.entityValueList?.length >= 250)

        currentCarrier = {
          ...currentCarrier,
          productStoreShipmentMethods: productStoreShipmentMethods.reduce((updatedMethodDetail: any, productStoreShipmentMethod: any) => {
            const { productStoreId, shipmentMethodTypeId } = productStoreShipmentMethod

            if (!updatedMethodDetail[productStoreId]) {
              updatedMethodDetail[productStoreId] = {}
            }
            productStoreShipmentMethod.isTrackingRequired = productStoreShipmentMethod.isTrackingRequired === "Y" ? true : false
            updatedMethodDetail[productStoreId][shipmentMethodTypeId] = productStoreShipmentMethod
            return updatedMethodDetail
          }, {})
        }
      } catch (error) {
        logger.error(error)
      }
      this.setCurrent(currentCarrier)
    },
    async updateCarrierFacilityAssociation(facility: any, carrierPartyId: any) {
      try {
        const payload = {
          facilityId: facility.facilityId,
          partyId: carrierPartyId,
          roleTypeId: "CARRIER"
        }
        let resp = {} as any;
        if (facility.isChecked) {
          resp = await api({
            url: `/oms/facilities/${payload.facilityId}/parties`,
            method: "PUT",
            data: {
              ...payload,
              fromDate: facility.fromDate,
              thruDate: DateTime.now().toMillis()
            }
          });
          if (commonUtil.hasError(resp)) {
            throw resp.data
          }
          facility.isChecked = false
          facility.fromDate = ""
        } else {
          resp = await api({
            url: `/oms/facilities/${payload.facilityId}/parties`,
            method: "POST",
            data: {
              ...payload,
              fromDate: DateTime.now().toMillis()
            }
          });
          if (commonUtil.hasError(resp)) {
            throw resp.data;
          }
          facility = { ...facility, ...payload, isChecked: true }
        }

        if (!commonUtil.hasError(resp)) {
          commonUtil.showToast(translate("Facility carrier association updated successfully."))
          await this.updateCarrierFacilityState(facility)
        } else {
          throw resp.data;
        }
      } catch (err) {
        commonUtil.showToast(translate("Failed to update facility carrier association."))
        logger.error(err)
      }
    },
    async updateProductStoreShipmentMethod(productStoreId: string, shipmentMethod: any) {
      try {
        const resp = await api({
          url: `/oms/productStores/${productStoreId}/shipmentMethods`,
          method: "PUT",
          data: {
            shipmentGatewayConfigId: shipmentMethod.shipmentGatewayConfigId,
            isTrackingRequired: shipmentMethod.isTrackingRequired,
            productStoreShipMethId: shipmentMethod.productStoreShipMethId,
          }
        })

        if (!commonUtil.hasError(resp)) {
          commonUtil.showToast(translate("Product store shipment method updated successfully"))
          await this.fetchProductStoreShipmentMethods({ partyId: shipmentMethod.partyId })
        } else {
          throw resp.data
        }
      } catch (err) {
        const errorMessage = "Failed to update product store shipment method"
        commonUtil.showToast(translate(errorMessage))
        logger.error(errorMessage, err)
      }
    },
    async updateProductStoreShipmentMethodAssociation(payload: any) {
      const { productStoreId, shipmentMethod, isChecked } = payload

      try {
        let resp;
        if (isChecked) {
          resp = await api({
            url: `/oms/productStores/${productStoreId}/shipmentMethods`,
            method: "POST",
            data: {
              productStoreId,
              shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
              partyId: shipmentMethod.partyId,
              roleTypeId: shipmentMethod.roleTypeId,
              fromDate: DateTime.now().toMillis()
            }
          })
        } else {
          resp = await api({
            url: `/oms/productStores/${productStoreId}/shipmentMethods`,
            method: "PUT",
            data: {
              productStoreShipMethId: shipmentMethod.productStoreShipMethId,
              thruDate: DateTime.now().toMillis()
            }
          })
        }

        if (!commonUtil.hasError(resp)) {
          commonUtil.showToast(translate(isChecked ? "Shipment method associated with product store successfully" : "Shipment method disassociated from product store successfully"))
          await this.fetchProductStoreShipmentMethods({ partyId: shipmentMethod.partyId })
        } else {
          throw resp.data
        }
      } catch (err) {
        const errorMessage = isChecked ? "Failed to associate shipment method with product store" : "Failed to disassociate shipment method from product store"
        commonUtil.showToast(translate(errorMessage))
        logger.error(errorMessage, err)
      }
      this.checkAssociatedProductStoreShipmentMethods()
    },
    async updateCarrierShipmentMethodAssociation(shipmentMethod: any, partyId: string, isChecked: boolean) {
      const payload = {
        shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
        partyId: partyId,
        roleTypeId: "CARRIER"
      }

      try {
        const resp = await api({
          url: "/oms/shippingGateways/carrierShipmentMethods",
          method: isChecked ? "POST" : "DELETE",
          data: isChecked ? payload : { ...payload, thruDate: DateTime.now().toMillis() }
        })

        if (!commonUtil.hasError(resp)) {
          commonUtil.showToast(translate(isChecked ? "Shipment method associated with carrier successfully" : "Shipment method disassociated from carrier successfully"))
          await this.fetchCarrierShipmentMethods({ partyId })
          this.checkAssociatedShipmentMethods()
        } else {
          throw resp.data
        }
      } catch (err) {
        const errorMessage = isChecked ? "Failed to associate shipment method with carrier" : "Failed to disassociate shipment method from carrier"
        commonUtil.showToast(translate(errorMessage))
        logger.error(errorMessage, err)
      }
    },
    async createShipmentMethod(payload: any) {
      try {
        const resp = await api({
          url: "/oms/shippingGateways/shipmentMethodTypes",
          method: "POST",
          data: payload
        })

        if (!commonUtil.hasError(resp)) {
          commonUtil.showToast(translate("Shipment method created successfully"))
          return Promise.resolve(resp.data)
        } else {
          throw resp.data
        }
      } catch (err) {
        commonUtil.showToast(translate("Failed to create shipment method"))
        logger.error("Failed to create shipment method", err)
        return Promise.reject(err)
      }
    },
    async renameShipmentMethod(shipmentMethod: any, description: string) {
      const payload = {
        shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
        description
      }

      try {
        const resp = await api({
          url: `/oms/shippingGateways/shipmentMethodTypes/${payload.shipmentMethodTypeId}`,
          method: "PUT",
          data: payload
        })

        if (!commonUtil.hasError(resp)) {
          commonUtil.showToast(translate("Shipment method renamed successfully"))
          await this.fetchShipmentMethodTypes()
        } else {
          throw resp.data
        }
      } catch (err) {
        commonUtil.showToast(translate("Failed to rename shipment method"))
        logger.error("Failed to rename shipment method", err)
      }
    },
    async removeCarrierShipmentMethod(shipmentMethod: any) {
      try {
        const resp = await api({
          url: "/oms/shippingGateways/carrierShipmentMethods",
          method: "DELETE",
          data: {
            shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
            partyId: shipmentMethod.partyId,
            roleTypeId: shipmentMethod.roleTypeId,
            thruDate: DateTime.now().toMillis()
          }
        })

        if (!commonUtil.hasError(resp)) {
          commonUtil.showToast(translate("Shipment method removed successfully"))
          await this.fetchCarrierShipmentMethods({ partyId: shipmentMethod.partyId })
          this.checkAssociatedShipmentMethods()
        } else {
          throw resp.data
        }
      } catch (err) {
        commonUtil.showToast(translate("Failed to remove shipment method"))
        logger.error("Failed to remove shipment method", err)
      }
    },
    async saveShipmentMethodsOrder(shipmentMethods: any) {
      const partyId = this.getCurrent.partyId
      const roleTypeId = this.getCurrent.roleTypeId

      const responses = await Promise.allSettled(shipmentMethods.map((shipmentMethod: any, index: number) => {
        return api({
          url: "/oms/shippingGateways/carrierShipmentMethods",
          method: "PUT",
          data: {
            shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
            partyId,
            roleTypeId,
            sequenceNumber: index + 1
          }
        })
      }))

      const failed = responses.some((response: any) => response.status === "rejected" || commonUtil.hasError(response.value))

      if (failed) {
        commonUtil.showToast(translate("Failed to update sequence for some shipment methods"))
      } else {
        commonUtil.showToast(translate("Shipment methods sequence updated successfully"))
      }

      await this.fetchCarrierShipmentMethods({ partyId })
      this.checkAssociatedShipmentMethods()
    },
    async fetchCarrierLogos(carrierIds: string[]) {
      const logoUrls = {} as any
      try {
        const resp = await api({
          url: "/admin/systemProperties",
          method: "GET",
          params: {
            systemResourceId: carrierIds,
            systemResourceId_op: "in",
            systemPropertyId: "%logo.url%",
            systemPropertyId_op: "like",
            fieldsToSelect: ["systemResourceId", "systemPropertyValue"]
          }
        })

        if (!commonUtil.hasError(resp)) {
          resp.data.map((doc: any) => {
            logoUrls[doc.systemResourceId] = doc.systemPropertyValue
          })
        }
      } catch (err) {
        logger.error("Failed to fetch carrier logos", err)
      }
      return logoUrls
    },
    async fetchShippingRates(payload: any) {
      try {
        const resp = await api({
          url: "poorti/shippingRate/",
          method: "GET",
          params: payload
        })

        if (!commonUtil.hasError(resp)) {
          return Promise.resolve(resp.data)
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch shipping rates", err)
        return Promise.reject(err)
      }
    },
    async fetchCarrierShipmentBoxTypes(params: any): Promise<any> {
      return api({
        url: "/oms/shippingGateways/carrierShipmentBoxTypes",
        method: "GET",
        params
      });
    },
    async fetchDefaultShipmentBox(query: any): Promise<any> {
      return api({
        url: `/admin/systemProperties`,
        method: "GET",
        params: query,
      });
    },
    async fetchShipmentMethodTypeDesc(payload: any): Promise<any> {
      return api({
        url: `/oms/shippingGateways/shipmentMethodTypes`,
        method: "GET",
        params: payload,
      });
    },
    async fetchShipmentBoxType(query: any): Promise<any> {
      return api({
        url: `/oms/shippingGateways/shipmentBoxTypes`,
        method: "GET",
        params: query,
      });
    },
    async fetchConfiguredCarrierService(payload: any): Promise<any> {
      return api({
        url: `/poorti/shipmentRequests`,
        method: "get",
        params: payload,
      });
    },
    async generateManifest(payload: any): Promise<any> {
      return api({
        url: `/poorti/generateManifest`,
        method: "POST",
        data: payload,
      });
    },
    async downloadCarrierManifest(params: any): Promise<any> {
      return api({
        url: `/poorti/Manifest.pdf`,
        method: "GET",
        params
      });
    },
    async findProductStoreShipmentMethCount(query: any): Promise<any> {
      return api({
        url: `/oms/productStores/shipmentMethods/counts`,
        method: "GET",
        params: query
      });
    },
    async fetchStoreCarrierAndMethods(payload: any): Promise<any> {
      return api({
        url: `/oms/dataDocumentView`,
        method: "POST",
        data: payload,
      });
    },
    async fetchLabelImageType(carrierId: string): Promise<any> {
      return api({
        url: `/admin/systemProperties`,
        method: "GET",
        params: { "systemResourceId": carrierId, "systemPropertyId": "shipment.carrier.labelImageType", "pageSize": 1 }
      });
    },
    async checkAssociatedShipmentMethods() {
      const shipmentMethods = this.shipmentMethods
      const carrierShipmentMethods = this.current.shipmentMethods
      const carrierShipmentMethodFields = ["partyId", "roleTypeId", "deliveryDays", "carrierServiceCode", "fromDate", "sequenceNumber"]

      Object.values(shipmentMethods).map((shipmentMethod: any) => {
        if (carrierShipmentMethods && carrierShipmentMethods[shipmentMethod.shipmentMethodTypeId]) {
          const currentShipmentMethod = carrierShipmentMethods[shipmentMethod.shipmentMethodTypeId]
          shipmentMethod.isChecked = true
          carrierShipmentMethodFields.forEach((field) => {
            shipmentMethod[field] = currentShipmentMethod[field]
          })
        } else {
          shipmentMethod.isChecked = false
          carrierShipmentMethodFields.forEach((field) => {
            shipmentMethod[field] = ""
          })
        }
      })
      this.updateShipmentMethods(shipmentMethods)
    },
    checkAssociatedProductStoreShipmentMethods() {
      const currentCarrier = this.current
      const carrierShipmentMethods = currentCarrier.shipmentMethods
      const carrierProductStoreShipmentMethods = currentCarrier.productStoreShipmentMethods
      const productStores = useAppProductStore().getAllProductStores
      const carrierShipmentMethodsByProductStore = {} as any
      const productStoreShipmentMethodFields = ["description", "productStoreId", "isTrackingRequired", "shipmentGatewayConfigId", "productStoreShipMethId"]

      if (carrierShipmentMethods) {
        productStores.forEach((productStore: any) => {
          JSON.parse(JSON.stringify(Object.values(carrierShipmentMethods))).forEach((shipmentMethod: any) => {
            if (carrierProductStoreShipmentMethods && carrierProductStoreShipmentMethods?.[productStore.productStoreId]?.[shipmentMethod.shipmentMethodTypeId]) {
              const productStoreShipmentMethod = carrierProductStoreShipmentMethods[productStore.productStoreId][shipmentMethod.shipmentMethodTypeId]
              shipmentMethod.isChecked = true
              productStoreShipmentMethodFields.forEach((field) => {
                shipmentMethod[field] = productStoreShipmentMethod[field]
              })
            } else {
              shipmentMethod.isChecked = false
              productStoreShipmentMethodFields.forEach((field) => {
                if (field === "isTrackingRequired") {
                  shipmentMethod[field] = false
                } else {
                  shipmentMethod[field] = ""
                }
              })
            }

            if (carrierShipmentMethodsByProductStore[productStore.productStoreId]) {
              carrierShipmentMethodsByProductStore[productStore.productStoreId].push(shipmentMethod)
            } else {
              carrierShipmentMethodsByProductStore[productStore.productStoreId] = [shipmentMethod]
            }
          })
        })
      }
      this.updateCarrierShipmentMethodsProductSore(carrierShipmentMethodsByProductStore)
    },
    async fetchShipmentMethodTypes() {
      let shipmentMethodTypes = [] as any
      let viewIndex = 0
      let resp

      try {
        do {
          const payload = {
            pageIndex: viewIndex,
            pageSize: 250
          }

          resp = await api({
            url: `/oms/shippingGateways/shipmentMethodTypes`,
            method: "GET",
            params: payload
          });

          if (!commonUtil.hasError(resp)) {
            shipmentMethodTypes = [...shipmentMethodTypes, ...resp.data]
            viewIndex++
          } else {
            throw resp.data
          }
        } while (resp.data.length >= 250)
      } catch (error) {
        logger.error(error)
      }
      const shipmentMethods = shipmentMethodTypes.reduce((updatedShipmentMethod: any, shipmentMethodType: any) => {
        updatedShipmentMethod[shipmentMethodType.shipmentMethodTypeId] = shipmentMethodType
        return updatedShipmentMethod
      }, {})
      this.setShipmentMethods(shipmentMethods)
      return shipmentMethodTypes
    },
    async fetchCarrierFacilities() {
      let currentCarrier = JSON.parse(JSON.stringify(this.current))
      let carrierFacilities = [] as any
      let viewIndex = 0
      let resp
      let docCount = 0

      try {
        do {
          const params = {
            customParametersMap: {
              partyId: currentCarrier.partyId,
              pageIndex: viewIndex,
              pageSize: 250
            },
            dataDocumentId: "FacilityCarrier",
            filterByDate: true
          }

          resp = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: params
          });

          if (!commonUtil.hasError(resp)) {
            carrierFacilities = [...carrierFacilities, ...resp.data.entityValueList]
            docCount = resp.data.entityValueList.length
            viewIndex++
          } else {
            docCount = 0
          }
        } while (docCount >= 250)

        const facilityInfo = carrierFacilities?.reduce((facilityDetail: any, facility: any) => {
          facilityDetail[facility.facilityId] = facility
          return facilityDetail
        }, {})

        let allFacilities = useAppProductStore().getAllFacilities
        allFacilities = allFacilities.map((facility: any) => {
          if (facilityInfo?.[facility.facilityId]) {
            facility.fromDate = facilityInfo?.[facility.facilityId].fromDate
            facility.isChecked = true
          } else {
            facility.isChecked = false
          }
          return facility
        })

        currentCarrier = {
          ...currentCarrier,
          facilities: allFacilities?.reduce((facilityDetail: any, facility: any) => {
            facilityDetail[facility.facilityId] = facility
            return facilityDetail
          }, {})
        }
      } catch (error) {
        logger.error(error)
      }
      this.setCurrent(currentCarrier)
    },
    async updateCarrierShipmentMethod(payload: any) {
      const { shipmentMethod, updatedData, messages } = payload
      const shipmentMethods = this.shipmentMethods
      const carrierShipmentMethods = this.current.shipmentMethods

      try {
        if (updatedData.fieldName === "deliveryDays" && !commonUtil.isValidDeliveryDays(updatedData.fieldValue)) {
          commonUtil.showToast(translate("Only positive numbers are allowed."))
          return
        }
        if (updatedData.fieldName === "carrierServiceCode" && !commonUtil.isValidCarrierCode(updatedData.fieldValue)) {
          commonUtil.showToast(translate("Only alphanumeric characters are allowed."))
          return
        }
        const resp = await api({
          url: `/oms/shippingGateways/carrierShipmentMethods`,
          method: "PUT",
          data: {
            shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
            partyId: shipmentMethod.partyId,
            roleTypeId: shipmentMethod.roleTypeId,
            [updatedData.fieldName]: updatedData.fieldValue
          }
        });

        if (!commonUtil.hasError(resp)) {
          commonUtil.showToast(translate(messages.successMessage))
          const updatedShipmentMethods = JSON.parse(JSON.stringify(shipmentMethods))
          const updatedShipmentMethod = updatedShipmentMethods[shipmentMethod.shipmentMethodTypeId]
          updatedShipmentMethod[updatedData.fieldName] = updatedData.fieldValue
          this.updateShipmentMethods(updatedShipmentMethods)

          const updatedCarrierShipmentMethods = JSON.parse(JSON.stringify(carrierShipmentMethods))
          const updatedCarrierShipmentMethod = updatedCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId]
          updatedCarrierShipmentMethod[updatedData.fieldName] = updatedData.fieldValue
          this.updateCurrentCarrierShipmentMethods(updatedCarrierShipmentMethods)
        } else {
          throw resp.data
        }
      } catch (error) {
        commonUtil.showToast(translate(messages.errorMessage))
        logger.error(messages.errorMessage, error)
      }
    },
    async fetchFacilityCarriers() {
      let facilityCarriers = [] as any
      let viewIndex = 0
      let resp
      let docCount = 0

      try {
        do {
          const params = {
            customParametersMap: {
              facilityId: useAppProductStore().getCurrentFacility?.facilityId,
              pageIndex: viewIndex,
              pageSize: 250
            },
            dataDocumentId: "FacilityCarrier",
            filterByDate: true
          }

          resp = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: params
          });

          if (!commonUtil.hasError(resp)) {
            facilityCarriers = [...facilityCarriers, ...resp.data.entityValueList]
            docCount = resp.data.entityValueList.length
            viewIndex++
          } else {
            docCount = 0
          }
        } while (docCount >= 250)
      } catch (error) {
        logger.error(error)
      }
      if (!facilityCarriers.find((facilityCarrier: any) => facilityCarrier.partyId === "_NA_")) {
        facilityCarriers = [...facilityCarriers, { partyId: "_NA_", groupName: "Default", roleTypeId: "CARRIER" }]
      }

      const carrierIds = facilityCarriers.map((carrier: any) => carrier.partyId)
      const trackingUrls = {} as any
      const logoUrls = {} as any

      try {
        resp = await api({
          url: `/admin/systemProperties`,
          method: "GET",
          params: {
            systemResourceId: carrierIds,
            systemResourceId_op: "in",
            systemPropertyId: "%trackingUrl%",
            systemPropertyId_op: "like",
            fieldsToSelect: ["systemResourceId", "systemPropertyId", "systemPropertyValue"]
          }
        });

        if (!commonUtil.hasError(resp)) {
          resp.data.map((doc: any) => {
            trackingUrls[doc.systemResourceId.toUpperCase()] = doc.systemPropertyValue
          })
        } else {
          throw resp.data
        }
      } catch (error: any) {
        logger.error(error)
      }

      try {
        const resp = await api({
          url: `/admin/systemProperties`,
          method: "GET",
          params: {
            systemResourceId: carrierIds,
            systemResourceId_op: "in",
            systemPropertyId: "%logo.url%",
            systemPropertyId_op: "like",
            fieldsToSelect: ["systemResourceId", "systemPropertyId", "systemPropertyValue"]
          }
        });

        if (!commonUtil.hasError(resp)) {
          resp.data.map((doc: any) => {
            logoUrls[doc.systemResourceId.toUpperCase()] = doc.systemPropertyValue
          })
        } else {
          throw resp.data
        }
      } catch (error) {
        logger.error(error)
      }

      if (Object.keys(trackingUrls).length || Object.keys(logoUrls).length) {
        facilityCarriers.map((carrier: any) => {
          const partyId = carrier.partyId.toUpperCase()
          carrier.trackingUrl = trackingUrls[partyId]
          carrier.logoUrl = logoUrls[partyId]
        })
      }
      this.setFacilityCarriers(facilityCarriers)
    },
    async fetchProductStoreShipmentMeths() {
      let productStoreShipmentMethods = [] as any
      let viewIndex = 0
      let resp

      try {
        do {
          const params = {
            customParametersMap: {
              roleTypeId: "CARRIER",
              productStoreId: useAppProductStore().getCurrentProductStore?.productStoreId,
              shipmentMethodTypeId: "STOREPICKUP",
              shipmentMethodTypeId_op: "equals",
              shipmentMethodTypeId_not: "Y",
              pageIndex: viewIndex,
              pageSize: 250
            },
            dataDocumentId: "ProductStoreShipmentMethod",
            filterByDate: true
          }

          resp = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: params
          });

          if (!commonUtil.hasError(resp)) {
            productStoreShipmentMethods = [...productStoreShipmentMethods, ...resp.data.entityValueList]
            viewIndex++
          } else {
            throw resp.data
          }
        } while (resp.data.entityValueList.length >= 250)
      } catch (error) {
        logger.error(error)
      }
      this.setProductStoreShipmentMethods(productStoreShipmentMethods)
    },
    async fetchShipmentGatewayConfigs() {
      let configs = {}
      try {
        const payload = {
          pageSize: 50
        }

        const resp = await api({
          url: `/oms/shippingGateways/config`,
          method: "GET",
          params: payload
        });

        if (!commonUtil.hasError(resp)) {
          configs = resp.data.reduce((updatedConfigDetail: any, config: any) => {
            updatedConfigDetail[config.shipmentGatewayConfigId] = config
            return updatedConfigDetail
          }, {})
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch shipment gateway config", err)
      }
      this.setShipmentGatewayConfigs(configs)
    },
    async updateShipmentMethods(payload: any) {
      this.setShipmentMethods(payload)
    },
    async updateCarrierShipmentMethodsProductSore(payload: any) {
      this.setCarrierShipmentMethodsByProductStore(payload)
    },
    async updateCurrentCarrier(payload: any) {
      this.setCurrent(payload)
    },
    async updateCurrentCarrierShipmentMethods(payload: any) {
      this.setCurrent({ ...this.current, shipmentMethods: payload })
    },
    async updateCurrentCarrierProductStoreShipmentMethods(payload: any) {
      this.setCurrent({ ...this.current, productStoreShipmentMethods: payload })
    },
    updateShipmentMethodQuery(query: any) {
      this.setShipmentMethodQuery({ query })
    },
    clearShipmentMethodQuery() {
      this.setShipmentMethodQuery({ query: { showSelected: false } })
    },
    async updateCarrierFacilityState(payload: any) {
      const currentCarrier = this.current
      currentCarrier.facilities[payload.facilityId] = payload
      this.setCurrent(currentCarrier)
    }
  },
  persist: false
})
