import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import CarrierState from './CarrierState'
import { CarrierService } from '@/services/CarrierService'
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import logger from '@/logger'
import store from '@/store';
import { translate } from '@hotwax/dxp-components';
import { showToast, isValidCarrierCode, isValidDeliveryDays, getCurrentFacilityId, getProductStoreId } from '@/utils';
  

const actions: ActionTree<CarrierState, RootState> = {

  async fetchCarriers ({ commit }) {
    let carriers = {} as any;
    let resp;
    try {
      const params = {
        "roleTypeId": "CARRIER",
        "partyTypeId": "PARTY_GROUP",
        "fieldsToSelect": ["partyId", "groupName"],
        "pageIndex": 0,
        "pageSize": 250,  // maximum records we could have
        "orderByField": "groupName"
      }
    
      resp = await CarrierService.fetchCarriers(params);
      if (!hasError(resp)) {
         carriers = {list: resp.data, total: resp.data?.length};
         commit(types.CARRIER_UPDATED, carriers)
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error("error", err);
      return Promise.reject(new Error(err))
    }
  },
  async fetchCarrierDetail ({ commit, dispatch }, payload) {
    let resp;
    try {
      const params = {
        "roleTypeId": "CARRIER",
        "partyId": payload.partyId,
        "fieldToSelect": ["partyId", "roleTypeId", "firstName", "lastName", "groupName"],
        "pageIndex": 0,
        "pageSize": 1,  // maximum records we could have
      }
    
      resp = await CarrierService.fetchCarriers(params);
      if (!hasError(resp)) {
        commit(types.CARRIER_CURRENT_UPDATED, resp.data[0])
        await dispatch('fetchCarrierShipmentMethods', { partyId: payload.partyId })
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error("error", err);
      return Promise.reject(new Error(err))
    }
  },

  async fetchCarrierShipmentMethods ({ commit, state }, payload) {
    let resp;
    let currentCarrier = JSON.parse(JSON.stringify(state.current))

    try {
      const params = {
        "roleTypeId": "CARRIER",
        "partyId": payload.partyId,
        "fieldsToSelect": ["partyId", "roleTypeId", "shipmentMethodTypeId", "carrierServiceCode", "deliveryDays", "sequenceNumber"],
        "pageIndex": 0,
        "pageSize": 250,  // maximum records we could have
        "orderByField": "sequenceNumber"
      }
    
      resp = await CarrierService.fetchCarrierShipmentMethods(params);
      if (!hasError(resp)) {
        currentCarrier = {
          ...currentCarrier,
          shipmentMethods: resp.data.reduce((shipmentMethodDetail:any, shipmentMethodType:any) => {
            shipmentMethodDetail[shipmentMethodType.shipmentMethodTypeId] = shipmentMethodType;
            return shipmentMethodDetail;
          }, {})
        } 
        
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error("error", err);
    }
    commit(types.CARRIER_CURRENT_UPDATED, currentCarrier)
  },

  async fetchProductStoreShipmentMethods({ state, commit }, payload) {
    let currentCarrier = JSON.parse(JSON.stringify(state.current))
    let productStoreShipmentMethods  = [] as any;
    let viewIndex = 0, resp;
    
    try {
      do {
        const params = {
          customParametersMap: {
            "roleTypeId": "CARRIER",
            "partyId": payload.partyId,
            pageIndex: viewIndex,
            pageSize: 250
          },
          dataDocumentId: "ProductStoreShipmentMethod",
          filterByDate: true
        }
  
        resp = await CarrierService.fetchProductStoreShipmentMethodsByCarrier(params)
        if (!hasError(resp)) {
          productStoreShipmentMethods = [...productStoreShipmentMethods, ...resp.data.entityValueList]
          viewIndex++;
        } else {
          throw resp.data
        }
      } while (resp.data?.entityValueList?.length >= 250);

      currentCarrier = {
        ...currentCarrier,
        productStoreShipmentMethods: productStoreShipmentMethods.reduce((updatedMethodDetail:any, productStoreShipmentMethod:any) => {
          const { productStoreId, shipmentMethodTypeId } = productStoreShipmentMethod;
          
          if (!updatedMethodDetail[productStoreId]) {
            updatedMethodDetail[productStoreId] = {};
          }
          productStoreShipmentMethod.isTrackingRequired = productStoreShipmentMethod.isTrackingRequired === 'Y' ? true : false;
          updatedMethodDetail[productStoreId][shipmentMethodTypeId] = productStoreShipmentMethod;
          return updatedMethodDetail;
        }, {})
      }

    } catch(error) {
      logger.error(error);
    }
    commit(types.CARRIER_CURRENT_UPDATED, currentCarrier)
  },

  async checkAssociatedShipmentMethods({ state, dispatch }) {
    const shipmentMethods = state.shipmentMethods;
    const carrierShipmentMethods = state.current.shipmentMethods;
    const carrierShipmentMethodFields = ["partyId", "roleTypeId", "deliveryDays", "carrierServiceCode", "fromDate", "sequenceNumber"]

    Object.values(shipmentMethods).map((shipmentMethod: any) => {
      if (carrierShipmentMethods && carrierShipmentMethods[shipmentMethod.shipmentMethodTypeId]) {
        const currentShipmentMethod = carrierShipmentMethods[shipmentMethod.shipmentMethodTypeId];
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
    dispatch('updateShipmentMethods', shipmentMethods)
  },
  checkAssociatedProductStoreShipmentMethods({ state, dispatch }) {
    const currentCarrier = state.current;
    const carrierShipmentMethods = currentCarrier.shipmentMethods
    const carrierProductStoreShipmentMethods = currentCarrier.productStoreShipmentMethods
    const productStores = store.getters['util/getProductStores'];
    const carrierShipmentMethodsByProductStore = {} as any;
    const productStoreShipmentMethodFields = ["description", "productStoreId", "isTrackingRequired", "shipmentGatewayConfigId", "productStoreShipMethId"]

    if (carrierShipmentMethods) {
      productStores.forEach((productStore: any) => {
        JSON.parse(JSON.stringify(Object.values(carrierShipmentMethods))).forEach((shipmentMethod: any) => {
          if (carrierProductStoreShipmentMethods && carrierProductStoreShipmentMethods?.[productStore.productStoreId]?.[shipmentMethod.shipmentMethodTypeId]) {
              const productStoreShipmentMethod = carrierProductStoreShipmentMethods[productStore.productStoreId][shipmentMethod.shipmentMethodTypeId];
              shipmentMethod.isChecked = true;
              productStoreShipmentMethodFields.forEach((field) => {
                shipmentMethod[field] = productStoreShipmentMethod[field]
              })
          } else {
              shipmentMethod.isChecked = false;
              productStoreShipmentMethodFields.forEach((field) => {
                if (field === 'isTrackingRequired') {
                  shipmentMethod[field] = false
                } else {
                  shipmentMethod[field] = ""
                }
              })
          }
          
          if (carrierShipmentMethodsByProductStore[productStore.productStoreId]) {
            carrierShipmentMethodsByProductStore[productStore.productStoreId].push(shipmentMethod);
          } else {
            carrierShipmentMethodsByProductStore[productStore.productStoreId] = [shipmentMethod];
          }
        });
      });
    }
    dispatch('updateCarrierShipmentMethodsProductSore', carrierShipmentMethodsByProductStore);
},

  async fetchShipmentMethodTypes({ commit }) {
    let shipmentMethodTypes  = [] as any;
    let viewIndex = 0, resp;
    
    try {
      do {
        const payload = {
          "pageIndex": viewIndex,
          "pageSize": 250
        }
  
        resp = await CarrierService.fetchShipmentMethodTypes(payload)
        if (!hasError(resp)) {
          shipmentMethodTypes = [...shipmentMethodTypes, ...resp.data]
          viewIndex++;
        } else {
          throw resp.data
        }
      } while (resp.data.length >= 250);
    } catch(error) {
      logger.error(error);
    }
    const shipmentMethods = shipmentMethodTypes.reduce((updatedShipmentMethod:any, shipmentMethodType:any) => {
      updatedShipmentMethod[shipmentMethodType.shipmentMethodTypeId] = shipmentMethodType;
      return updatedShipmentMethod;
    }, {})
    commit(types.SHIPMENT_METHODS_UPDATED, shipmentMethods)
    return shipmentMethodTypes;
  },

  async fetchCarrierFacilities({ state, commit }, payload) {
    let currentCarrier = JSON.parse(JSON.stringify(state.current))
    let carrierFacilities  = [] as any;
    let viewIndex = 0, resp, docCount = 0;
    
    try {
      do {
        const params = {
          customParametersMap:{
            "partyId": currentCarrier.partyId,
            pageIndex: viewIndex,
            pageSize: 250,
          },
          dataDocumentId: "FacilityCarrier",
          filterByDate: true
        }
  
        resp = await CarrierService.fetchCarrierFacilities(params)
        if (!hasError(resp)) {
          carrierFacilities = [...carrierFacilities, ...resp.data.entityValueList]
          docCount = resp.data.entityValueList.length;
          viewIndex++;
        } else {
          docCount = 0
        }
      } while (docCount >= 250);

      const facilityInfo = carrierFacilities?.reduce((facilityDetail:any, facility:any) => {
        facilityDetail[facility.facilityId] = facility;
        return facilityDetail;
      }, {})

      let allFacilities = store.getters['util/getFacilities'];
      allFacilities = allFacilities.map((facility: any) => {
        if (facilityInfo?.[facility.facilityId]) {
          facility.fromDate = facilityInfo?.[facility.facilityId].fromDate
          facility.isChecked = true;
        } else {
          facility.isChecked = false;
        }
        return facility; // Return the modified facility object
      });
      
      currentCarrier = {
        ...currentCarrier,
        facilities: allFacilities?.reduce((facilityDetail:any, facility:any) => {
          facilityDetail[facility.facilityId] = facility;
          return facilityDetail;
        }, {})
      }

    } catch(error) {
      logger.error(error);
    }
    commit(types.CARRIER_CURRENT_UPDATED, currentCarrier)
  },

  async updateCarrierShipmentMethod({ state, dispatch }, payload) {
    const {shipmentMethod, updatedData, messages} = payload;
    const shipmentMethods = state.shipmentMethods;
    const carrierShipmentMethods = state.current.shipmentMethods;
    
    try {
      if (updatedData.fieldName === 'deliveryDays' && !isValidDeliveryDays(updatedData.fieldValue)) {
        showToast(translate("Only positive numbers are allowed."));
        return;
      } 
      if (updatedData.fieldName === 'carrierServiceCode' && !isValidCarrierCode(updatedData.fieldValue)) {
        showToast(translate("Only alphanumeric characters are allowed."));
        return;
      }
      const resp = await CarrierService.updateCarrierShipmentMethod({
        shipmentMethodTypeId: shipmentMethod.shipmentMethodTypeId,
        partyId: shipmentMethod.partyId,
        roleTypeId: shipmentMethod.roleTypeId,
        [updatedData["fieldName"]]: updatedData["fieldValue"]
      })

      if (!hasError(resp)) {
        showToast(translate(messages["successMessage"]))
        //updating shipment methods in state
        const updatedShipmentMethods = JSON.parse(JSON.stringify(shipmentMethods));
        const updatedShipmentMethod = updatedShipmentMethods[shipmentMethod.shipmentMethodTypeId];
        updatedShipmentMethod[updatedData.fieldName] = updatedData.fieldValue;
        dispatch('updateShipmentMethods', updatedShipmentMethods)

        //updating current carrier shipment methods in state
        const updatedCarrierShipmentMethods = JSON.parse(JSON.stringify(carrierShipmentMethods))
        const updatedCarrierShipmentMethod = updatedCarrierShipmentMethods[shipmentMethod.shipmentMethodTypeId];
        updatedCarrierShipmentMethod[updatedData.fieldName] = updatedData.fieldValue;
        dispatch('updateCurrentCarrierShipmentMethods', updatedCarrierShipmentMethods)
      } else {
        throw resp.data
      }
    } catch (error) {
      showToast(translate(messages["errorMessage"]))
      logger.error(messages["errorMessage"], error)
    }
  },

  async fetchFacilityCarriers({ state, commit }, payload) {
    let facilityCarriers  = [] as any;
    let viewIndex = 0, resp, docCount = 0;

    try {
      do {
        const params = {
          customParametersMap: {
            "facilityId": getCurrentFacilityId(),
            "pageIndex": viewIndex,
            "pageSize": 250
          },
          dataDocumentId: "FacilityCarrier",
          filterByDate: true
        }
  
        resp = await CarrierService.fetchFacilityCarriers(params)
        if (!hasError(resp)) {
          facilityCarriers = [...facilityCarriers, ...resp.data.entityValueList]
          docCount = resp.data.entityValueList.length;
          viewIndex++;
        } else {
          docCount = 0
        }
      } while (docCount >= 250);
    } catch(error) {
      logger.error(error);
    }
    //appending default carrier (partyId = _NA_) if not associated with facility
    if (!facilityCarriers.find((facilityCarrier:any) => facilityCarrier.partyId === '_NA_')) {
      facilityCarriers = [...facilityCarriers, {"partyId": "_NA_", "groupName": "Default", "roleTypeId": "CARRIER"}]
    }

    const carrierIds = facilityCarriers.map((carrier: any) => carrier.partyId)
    const trackingUrls = {} as any;
    const logoUrls = {} as any;
    
    // fetch tracking URLs
    try {
      resp = await CarrierService.fetchCarrierTrackingUrls({
        "systemResourceId": carrierIds,
        "systemResourceId_op": "in",
        "systemPropertyId": "%trackingUrl%",
        "systemPropertyId_op": "like",
        "fieldsToSelect": ["systemResourceId", "systemPropertyId", "systemPropertyValue"]
      })

      if(!hasError(resp)) {
        resp.data.map((doc: any) => {
          trackingUrls[doc.systemResourceId.toUpperCase()] = doc.systemPropertyValue;
        })
      } else {
        throw resp.data;
      }
    } catch(error: any) {
      logger.error(error);
    }

    // fetch carrier logos
    try {
      const resp = await CarrierService.fetchCarrierTrackingUrls({
        systemResourceId: carrierIds,
        systemResourceId_op: "in",
        systemPropertyId: "%logo.url%",
        systemPropertyId_op: "like",
        fieldsToSelect: ["systemResourceId", "systemPropertyId", "systemPropertyValue"]
      });

      if(!hasError(resp)) {
        resp.data.map((doc: any) => {
          logoUrls[doc.systemResourceId.toUpperCase()] = doc.systemPropertyValue;
        })
      } else {
        throw resp.data;
      }
    } catch (error) {
      logger.error(error);
    }

    if(Object.keys(trackingUrls).length || Object.keys(logoUrls).length) {
      facilityCarriers.map((carrier: any) => {
        const partyId = carrier.partyId.toUpperCase();
        carrier.trackingUrl = trackingUrls[partyId]
        carrier.logoUrl = logoUrls[partyId]
      })
    }
    commit(types.CARRIER_FACILITY_CARRIERS_UPDATED, facilityCarriers)
  },
  async fetchProductStoreShipmentMeths({ commit }, productStoreId?: string) {
    if (!productStoreId) {
      productStoreId = getProductStoreId();
    }
    let productStoreShipmentMethods  = [] as any;
    let viewIndex = 0, resp;
    
    try {
      do {
        const params = {
          customParametersMap:{
            "roleTypeId": "CARRIER",
            "productStoreId": productStoreId,
            "shipmentMethodTypeId": "STOREPICKUP",
            "shipmentMethodTypeId_op": "equals",
            "shipmentMethodTypeId_not": "Y",
            "pageIndex": viewIndex,
            "pageSize": 250
          },
          dataDocumentId: "ProductStoreShipmentMethod",
          filterByDate: true
        }
  
        resp = await CarrierService.fetchProductStoreShipmentMethods(params)
        if (!hasError(resp)) {
          productStoreShipmentMethods = [...productStoreShipmentMethods, ...resp.data.entityValueList]
          viewIndex++;
        } else {
          throw resp.data
        }
      } while (resp.data.entityValueList.length >= 250);

    } catch(error) {
      logger.error(error);
    }
    commit(types.CARRIER_STORE_SHIPMENT_METHODS_UPDATED, productStoreShipmentMethods)
  },

  async fetchShipmentGatewayConfigs({ commit }) {
    let configs  = {};
    try {
      const payload = {
        "pageSize": 50 // keeping view size 50 as considering there will not be more than 50 shipment gateway
      }

      const resp = await CarrierService.fetchShipmentGatewayConfigs(payload)
      if (!hasError(resp)) {
        configs = resp.data.reduce((updatedConfigDetail:any, config:any) => {
          updatedConfigDetail[config.shipmentGatewayConfigId] = config;
          return updatedConfigDetail;
        }, {})
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch shipment gateway config', err)
    }
    commit(types.CARRIER_SHIPMENT_GATEWAY_CONFIGS_UPDATED, configs)
  },
  
  async updateShipmentMethods({ commit }, payload) {
    commit(types.SHIPMENT_METHODS_UPDATED, payload)
  },
  async updateCarrierShipmentMethodsProductSore({ commit }, payload) {
    commit(types.CARRIER_PRODUCT_STORE_SHIPMENT_METHODS_UPDATED, payload)
  },
  async updateCurrentCarrier({ commit }, payload) {
    commit(types.CARRIER_CURRENT_UPDATED, payload)
  },
  async updateCurrentCarrierShipmentMethods({ state, commit }, payload) {
    commit(types.CARRIER_CURRENT_UPDATED, {...state.current, shipmentMethods: payload})
  },
  async updateCurrentCarrierProductStoreShipmentMethods({ state, commit }, payload) {
    commit(types.CARRIER_CURRENT_UPDATED, {...state.current, productStoreShipmentMethods: payload})
  },
  async clearCarriers({ commit }) {
    commit(types.CARRIER_CLEARED)
  },
  async clearCurrentCarrier({ commit }) {
    commit(types.CARRIER_CURRENT_CLEARED)
  },
  updateShipmentMethodQuery({ commit }, query) {
    commit(types.CARRIER_SHIPMENT_METHOD_QUERY_UPDATED, { query })
  },
  clearShipmentMethodQuery({ commit }, query) {
    commit(types.CARRIER_SHIPMENT_METHOD_QUERY_UPDATED, {"query": {"showSelected": false}})
  },
  async updateCarrierFacility({ state, commit }, payload) {
    const currentCarrier = state.current;
    currentCarrier.facilities[payload.facilityId] = payload
    commit(types.CARRIER_CURRENT_UPDATED, currentCarrier)
  }
}

export default actions;