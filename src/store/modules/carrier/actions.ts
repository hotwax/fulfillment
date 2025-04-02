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
import { log } from '@module-federation/runtime/dist/src/utils'
  

const actions: ActionTree<CarrierState, RootState> = {

  async fetchCarriers ({ commit }, payload) {
    let carriers = {} as any;
    let resp;
    try {
      const params = {
        ...payload,
        "entityName": "CarrierShipmentMethodCount",
        "inputFields": {
          "roleTypeId": "CARRIER",
          "partyTypeId": "PARTY_GROUP"
        },
        "fieldList": ["partyId", "roleTypeId", "groupName", "shipmentMethodCount"],
        "viewIndex": 0,
        "viewSize": 250,  // maximum records we could have
        "distinct": "Y",
        "noConditionFind": "Y",
        "orderBy": "groupName"
      }
    
      resp = await CarrierService.fetchCarriers(params);
      if (!hasError(resp)) {
         carriers = {list: resp.data.docs, total: resp.data.count};
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
        "entityName": "PartyRoleAndPartyDetail",
        "inputFields": {
          "roleTypeId": "CARRIER",
          "partyId": payload.partyId
        },
        "fieldList": ["partyId", "roleTypeId", "firstName", "lastName", "groupName"],
        "viewIndex": 0,
        "viewSize": 1,  // maximum records we could have
        "distinct": "Y",
        "noConditionFind": "Y"
      }
    
      resp = await CarrierService.fetchCarriers(params);
      if (!hasError(resp)) {
        commit(types.CARRIER_CURRENT_UPDATED, resp.data.docs[0])
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
        "entityName": "CarrierShipmentMethod",
        "inputFields": {
          "roleTypeId": "CARRIER",
          "partyId": payload.partyId
        },
        "fieldList": ["partyId", "roleTypeId", "shipmentMethodTypeId", "carrierServiceCode", "deliveryDays", "sequenceNumber"],
        "viewIndex": 0,
        "viewSize": 250,  // maximum records we could have
        "distinct": "Y",
        "noConditionFind": "Y",
        "orderBy": "sequenceNumber"
      }
    
      resp = await CarrierService.fetchCarrierShipmentMethods(params);
      if (!hasError(resp)) {
        currentCarrier = {
          ...currentCarrier,
          shipmentMethods: resp.data.docs.reduce((shipmentMethodDetail:any, shipmentMethodType:any) => {
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
          "entityName": "ProductStoreShipmentMethView",
          "inputFields": {
            "roleTypeId": "CARRIER",
            "partyId": payload.partyId
          },
          "fieldList": ["productStoreShipMethId", "productStoreId", "partyId", "roleTypeId", "shipmentMethodTypeId", "shipmentGatewayConfigId", "isTrackingRequired", "sequenceNumber", "description", "fromDate"],
          "noConditionFind": "Y",
          "viewIndex": viewIndex,
          "viewSize": 250,
          "filterByDate": "Y"
        }
  
        resp = await CarrierService.fetchProductStoreShipmentMethods(params)
        if (!hasError(resp) && resp.data.count) {
          productStoreShipmentMethods = [...productStoreShipmentMethods, ...resp.data.docs]
          viewIndex++;
        } else {
          throw resp.data
        }
      } while (resp.data.docs.length >= 250);

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
          "entityName": "ShipmentMethodType",
          "noConditionFind": "Y",
          "viewIndex": viewIndex,
          "viewSize": 250
        }
  
        resp = await CarrierService.fetchShipmentMethodTypes(payload)
        if (!hasError(resp) && resp.data.count) {
          shipmentMethodTypes = [...shipmentMethodTypes, ...resp.data.docs]
          viewIndex++;
        } else {
          throw resp.data
        }
      } while (resp.data.docs.length >= 250);
    } catch(error) {
      logger.error(error);
    }
    const shipmentMethods = shipmentMethodTypes.reduce((updatedShipmentMethod:any, shipmentMethodType:any) => {
      updatedShipmentMethod[shipmentMethodType.shipmentMethodTypeId] = shipmentMethodType;
      return updatedShipmentMethod;
    }, {})
    commit(types.SHIPMENT_METHODS_UPDATED, shipmentMethods)
  },

  async fetchShipmentBoxTypes({ commit }) {
    let shipmentBoxes  = [] as any;

    try {
      const payload = {
        "entityName": "ShipmentBoxType",
        "noConditionFind": "Y",
        "fieldList": ["boxHeight", "boxLength", "boxWidth", "boxWeight", "description", "dimensionUomId", "shipmentBoxTypeId", "weightUomId"],
        "viewSize": 250
      }

      const resp = await CarrierService.fetchShipmentMethodTypes(payload)
      if (!hasError(resp) && resp.data.docs?.length) {
        shipmentBoxes = resp.data.docs
      } else {
        throw resp.data
      }
    } catch(error) {
      logger.error(error);
    }
    commit(types.CARRIER_SHIPMENT_BOXES_LIST_UPDATED, shipmentBoxes)
  },


  async fetchCarrierShipmentBoxTypes ({ commit, state }, payload) {
    try {
      const resp = await CarrierService.fetchCarrierShipmentBoxTypes({
        "entityName": "CarrierShipmentBoxType",
        "inputFields": {
          "partyId": payload.partyId
        },
        "fieldList": ["partyId" ,"shipmentBoxTypeId"],
        "viewSize": 250,  // maximum records we could have
        "distinct": "Y",
        "noConditionFind": "Y"
      });

      if (!hasError(resp) && resp.data.docs?.length) {
        const associatedBoxTypeIds = resp.data.docs.map((doc: any) => doc.shipmentBoxTypeId);

        const shipmentBoxes = JSON.parse(JSON.stringify(state.shipmentBoxes))
        shipmentBoxes.map((box: any) => {
          box.isChecked = associatedBoxTypeIds.includes(box.shipmentBoxTypeId)
        })

        commit(types.CARRIER_SHIPMENT_BOXES_LIST_UPDATED, shipmentBoxes)
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error(err);
    }
  },

  updateShipmentBoxTypes({ commit }, payload) {
    commit(types.CARRIER_SHIPMENT_BOXES_LIST_UPDATED, payload)
  },

  async fetchCarrierFacilities({ state, commit }, payload) {
    let currentCarrier = JSON.parse(JSON.stringify(state.current))
    let carrierFacilities  = [] as any;
    let viewIndex = 0, resp, docCount = 0;
    
    try {
      do {
        const params = {
          "entityName": "FacilityAndParty",
          "inputFields": {
            "roleTypeId": "CARRIER",
            "partyId": currentCarrier.partyId
          },
          "fieldList": ["facilityId", "partyId", "roleTypeId", "fromDate"],
          "noConditionFind": "Y",
          "viewIndex": viewIndex,
          "viewSize": 250,
          "filterByDate": "Y"
        }
  
        resp = await CarrierService.fetchCarrierFacilities(params)
        if (!hasError(resp) && resp.data.count) {
          carrierFacilities = [...carrierFacilities, ...resp.data.docs]
          docCount = resp.data.docs.length;
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
          "entityName": "FacilityAndParty",
          "inputFields": {
            "roleTypeId": "CARRIER",
            "facilityId": getCurrentFacilityId()
          },
          "fieldList": ["facilityId", "partyId", "firstName", "lastName", "groupName", "roleTypeId"],
          "noConditionFind": "Y",
          "viewIndex": viewIndex,
          "viewSize": 250,
          "filterByDate": "Y",
          "distinct": "Y"
        }
  
        resp = await CarrierService.fetchCarrierFacilities(params)
        if (!hasError(resp) && resp.data.count) {
          facilityCarriers = [...facilityCarriers, ...resp.data.docs]
          docCount = resp.data.docs.length;
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
    const systemProperties = {} as any;

    try {
      resp = await CarrierService.fetchCarrierTrackingUrls({
        "entityName": "SystemProperty",
        "inputFields": {
          "systemResourceId": carrierIds,
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

    if(Object.keys(systemProperties).length) {
      facilityCarriers.map((carrier: any) => {
        carrier.trackingUrl = systemProperties[carrier.partyId.toUpperCase()]
      })
    }

    commit(types.CARRIER_FACILITY_CARRIERS_UPDATED, facilityCarriers)
  },
  async fetchProductStoreShipmentMeths({ state, commit }) {
    let productStoreShipmentMethods  = [] as any;
    let viewIndex = 0, resp;
    
    try {
      do {
        const params = {
          "entityName": "ProductStoreShipmentMethView",
          "inputFields": {
            "roleTypeId": "CARRIER",
            "productStoreId": getProductStoreId(),
            "shipmentMethodTypeId": "STOREPICKUP",
            "shipmentMethodTypeId_op": "notEqual"
          },
          "fieldList": ["productStoreId", "partyId", "roleTypeId", "shipmentMethodTypeId", "description"],
          "noConditionFind": "Y",
          "viewIndex": viewIndex,
          "viewSize": 250,
          "filterByDate": "Y",
          "distinct": "Y"
        }
  
        resp = await CarrierService.fetchProductStoreShipmentMethods(params)
        if (!hasError(resp) && resp.data.count) {
          productStoreShipmentMethods = [...productStoreShipmentMethods, ...resp.data.docs]
          viewIndex++;
        } else {
          throw resp.data
        }
      } while (resp.data.docs.length >= 250);

    } catch(error) {
      logger.error(error);
    }
    commit(types.CARRIER_STORE_SHIPMENT_METHODS_UPDATED, productStoreShipmentMethods)
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