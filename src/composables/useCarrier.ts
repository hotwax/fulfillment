import { api, commonUtil, logger, translate } from "@common";
import { useCarrierStore } from "@/store/carrier";
import { DateTime } from "luxon";

export const useCarrier = () => {
  const carrierStore = useCarrierStore()

  const createCarrier = async (payload: any) => {
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
  }

  const updateCarrier = async (payload: any) => {
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
  }

  const updateCarrierFacility = async (facility: any, carrierPartyId: any) => {
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
        await carrierStore.updateCarrierFacility(facility)
      } else {
        throw resp.data;
      }
    } catch (err) {
      commonUtil.showToast(translate("Failed to update facility carrier association."))
      logger.error(err)
    }
  }

  const updateProductStoreShipmentMethod = async (productStoreId: string, shipmentMethod: any) => {
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
        await carrierStore.fetchProductStoreShipmentMethods({ partyId: shipmentMethod.partyId })
      } else {
        throw resp.data
      }
    } catch (err) {
      const errorMessage = "Failed to update product store shipment method"
      commonUtil.showToast(translate(errorMessage))
      logger.error(errorMessage, err)
    }
  }

  const updateProductStoreShipmentMethodAssociation = async (payload: any) => {
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
        await carrierStore.fetchProductStoreShipmentMethods({ partyId: shipmentMethod.partyId })
      } else {
        throw resp.data
      }
    } catch (err) {
      const errorMessage = isChecked ? "Failed to associate shipment method with product store" : "Failed to disassociate shipment method from product store"
      commonUtil.showToast(translate(errorMessage))
      logger.error(errorMessage, err)
    }
    carrierStore.checkAssociatedProductStoreShipmentMethods()
  }

  const updateCarrierShipmentMethodAssociation = async (shipmentMethod: any, partyId: string, isChecked: boolean) => {
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
        await carrierStore.fetchCarrierShipmentMethods({ partyId })
        carrierStore.checkAssociatedShipmentMethods()
      } else {
        throw resp.data
      }
    } catch (err) {
      const errorMessage = isChecked ? "Failed to associate shipment method with carrier" : "Failed to disassociate shipment method from carrier"
      commonUtil.showToast(translate(errorMessage))
      logger.error(errorMessage, err)
    }
  }

  const createShipmentMethod = async (payload: any) => {
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
  }

  const renameShipmentMethod = async (shipmentMethod: any, description: string) => {
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
        await carrierStore.fetchShipmentMethodTypes()
      } else {
        throw resp.data
      }
    } catch (err) {
      commonUtil.showToast(translate("Failed to rename shipment method"))
      logger.error("Failed to rename shipment method", err)
    }
  }

  const removeCarrierShipmentMethod = async (shipmentMethod: any) => {
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
        await carrierStore.fetchCarrierShipmentMethods({ partyId: shipmentMethod.partyId })
        carrierStore.checkAssociatedShipmentMethods()
      } else {
        throw resp.data
      }
    } catch (err) {
      commonUtil.showToast(translate("Failed to remove shipment method"))
      logger.error("Failed to remove shipment method", err)
    }
  }

  const saveShipmentMethodsOrder = async (shipmentMethods: any) => {
    const partyId = carrierStore.getCurrent.partyId
    const roleTypeId = carrierStore.getCurrent.roleTypeId

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

    await carrierStore.fetchCarrierShipmentMethods({ partyId })
    carrierStore.checkAssociatedShipmentMethods()
  }

  const fetchCarrierLogos = async (carrierIds: string[]) => {
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
  }

  const fetchShippingRates = async (payload: any) => {
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
  }

  const fetchShipmentMethods = async (query: any): Promise<any> => {
    return api({
      url: "solr-query",
      method: "post",
      data: query,
      baseURL: commonUtil.getOmsURL()
    });
  }

  const fetchCarrierShipmentBoxTypes = async (params: any): Promise<any> => {
    return api({
      url: "/oms/shippingGateways/carrierShipmentBoxTypes",
      method: "GET",
      params
    });
  }

  const fetchDefaultShipmentBox = async (query: any): Promise<any> => {
    return api({
      url: `/admin/systemProperties`,
      method: "GET",
      params: query,
    });
  }

  const fetchShipmentMethodTypeDesc = async (payload: any): Promise<any> => {
    return api({
      url: `/oms/shippingGateways/shipmentMethodTypes`,
      method: "GET",
      params: payload,
    });
  }

  const fetchShipmentBoxType = async (query: any): Promise<any> => {
    return api({
      url: `/oms/shippingGateways/shipmentBoxTypes`,
      method: "GET",
      params: query,
    });
  }

  const fetchConfiguredCarrierService = async (payload: any): Promise<any> => {
    return api({
      url: `/poorti/shipmentRequests`,
      method: "get",
      params: payload,
    });
  }

  const generateManifest = async (payload: any): Promise<any> => {
    return api({
      url: `/poorti/generateManifest`,
      method: "POST",
      data: payload,
    });
  }

  const downloadCarrierManifest = async (params: any): Promise<any> => {
    return api({
      url: `/poorti/Manifest.pdf`,
      method: "GET",
      params
    });
  }

  const findProductStoreShipmentMethCount = async (query: any): Promise<any> => {
    return api({
      url: `/oms/productStores/shipmentMethods/counts`,
      method: "GET",
      params: query
    });
  }

  const fetchCarriers = async (params: any): Promise<any> => {
    return api({
      url: `/oms/shippingGateways/carrierParties`,
      method: "GET",
      params,
    });
  }

  const fetchStoreCarrierAndMethods = async (payload: any): Promise<any> => {
    return api({
      url: `/oms/dataDocumentView`,
      method: "POST",
      data: payload,
    });
  }

  const fetchLabelImageType = async (carrierId: string): Promise<any> => {
    return api({
      url: `/admin/systemProperties`,
      method: "GET",
      params: { "systemResourceId": carrierId, "systemPropertyId": "shipment.carrier.labelImageType", "pageSize": 1 }
    });
  }

  return {
    createCarrier,
    updateCarrier,
    updateCarrierFacility,
    updateProductStoreShipmentMethod,
    updateProductStoreShipmentMethodAssociation,
    updateCarrierShipmentMethodAssociation,
    createShipmentMethod,
    renameShipmentMethod,
    removeCarrierShipmentMethod,
    saveShipmentMethodsOrder,
    fetchCarrierLogos,
    fetchShippingRates,
    fetchShipmentMethods,
    fetchCarrierShipmentBoxTypes,
    fetchDefaultShipmentBox,
    fetchShipmentMethodTypeDesc,
    fetchShipmentBoxType,
    fetchConfiguredCarrierService,
    generateManifest,
    downloadCarrierManifest,
    findProductStoreShipmentMethCount,
    fetchCarriers,
    fetchStoreCarrierAndMethods,
    fetchLabelImageType
  }
}
