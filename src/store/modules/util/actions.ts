import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import logger from '@/logger'

const actions: ActionTree<UtilState, RootState> = {
  async fetchRejectReasons({ commit }) {
    let rejectReasons  = [];
    try {
      const payload = {
        "inputFields": {
          "parentEnumTypeId": ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          "parentEnumTypeId_op": "in"
        },
        "fieldList": ["description", "enumId", "enumName", "enumTypeId", "sequenceNum"],
        "distinct": "Y",
        "entityName": "EnumTypeChildAndEnum",
        "viewSize": 20, // keeping view size 20 as considering that we will have max 20 reasons
        "orderBy": "sequenceNum"
      }

      const resp = await UtilService.fetchRejectReasons(payload)

      if(!hasError(resp) && resp.data.count > 0) {
        rejectReasons = resp.data.docs
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch reject reasons', err)
    }

    commit(types.UTIL_REJECT_REASONS_UPDATED, rejectReasons)
  },

  async fetchPartyInformation({ commit, state }, partyIds) {
    let partyInformation = JSON.parse(JSON.stringify(state.partyNames))
    const cachedPartyIds = Object.keys(partyInformation);
    const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

    if(!ids.length) return partyInformation;

    try {
      const payload = {
        "inputFields": {
          "partyId": ids,
          "partyId_op": "in"
        },
        "fieldList": ["firstName", "middleName", "lastName", "groupName", "partyId"],
        "entityName": "PartyNameView",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchPartyInformation(payload);

      if(!hasError(resp)) {
        const partyResp = {} as any
        resp.data.docs.map((partyInformation: any) => {

          let partyName = ''
          if(partyInformation.groupName) {
            partyName = partyInformation.groupName
          } else {
            partyName = [partyInformation.firstName, partyInformation.lastName].join(' ')
          }

          partyResp[partyInformation.partyId] = partyName
        })

        partyInformation = {
          ...partyInformation,
          ...partyResp
        }

        commit(types.UTIL_PARTY_NAMES_UPDATED, partyInformation)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching party information', err)
    }

    return partyInformation;
  },

  async fetchShipmentMethodTypeDesc({ commit, state }, shipmentIds) {
    let shipmentMethodTypeDesc = JSON.parse(JSON.stringify(state.shipmentMethodTypeDesc))
    const cachedShipmentMethodIds = Object.keys(shipmentMethodTypeDesc);
    const ids = shipmentIds.filter((shipmentId: string) => !cachedShipmentMethodIds.includes(shipmentId))

    if(!ids.length) return shipmentMethodTypeDesc;

    try {
      const payload = {
        "inputFields": {
          "shipmentMethodTypeId": ids,
          "shipmentMethodTypeId_op": "in"
        },
        "fieldList": ["shipmentMethodTypeId", "description"],
        "entityName": "ShipmentMethodType",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchShipmentMethodTypeDesc(payload);

      if(!hasError(resp)) {
        const shipmentMethodResp = {} as any
        resp.data.docs.map((shipmentMethodInformation: any) => {
          shipmentMethodResp[shipmentMethodInformation.shipmentMethodTypeId] = shipmentMethodInformation.description
        })

        shipmentMethodTypeDesc = {
          ...shipmentMethodTypeDesc,
          ...shipmentMethodResp
        }

        commit(types.UTIL_SHIPMENT_METHODS_UPDATED, shipmentMethodTypeDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching shipment description', err)
    }

    return shipmentMethodTypeDesc;
  },

  async fetchShipmentBoxTypeDesc({ commit, state }, shipmentBoxIds) {
    let shipmentBoxTypeDesc = JSON.parse(JSON.stringify(state.shipmentBoxTypeDesc))
    const cachedShipmentBoxIds = Object.keys(shipmentBoxTypeDesc);
    const ids = shipmentBoxIds.filter((boxId: string) => !cachedShipmentBoxIds.includes(boxId))

    if(!ids.length) return shipmentBoxTypeDesc;

    try {
      const payload = {
        "inputFields": {
          "shipmentBoxTypeId": ids,
          "shipmentBoxTypeId_op": "in"
        },
        "fieldList": ["shipmentBoxTypeId", "description"],
        "entityName": "ShipmentBoxType",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchShipmentBoxTypeDesc(payload);

      if(!hasError(resp)) {
        const shipmentBoxResp = {} as any
        resp.data.docs.map((shipmentBoxInformation: any) => {
          shipmentBoxResp[shipmentBoxInformation.shipmentBoxTypeId] = shipmentBoxInformation.description
        })

        shipmentBoxTypeDesc = {
          ...shipmentBoxTypeDesc,
          ...shipmentBoxResp
        }

        commit(types.UTIL_SHIPMENT_BOXES_UPDATED, shipmentBoxTypeDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching shipment boxes description', err)
    }

    return shipmentBoxTypeDesc;
  },

  async fetchFacilityTypeInformation({ commit, state }, facilityTypeIds) {
    const facilityTypeDesc = JSON.parse(JSON.stringify(state.facilityTypeDesc))

    const cachedFacilityTypeIds = Object.keys(facilityTypeDesc);
    const facilityTypeIdFilter = [...new Set(facilityTypeIds.filter((facilityTypeId: any) => !cachedFacilityTypeIds.includes(facilityTypeId)))]

    // If there are no facility types to fetch skip the API call
    if (!facilityTypeIdFilter.length) return;

    const payload = {
      inputFields: {
        facilityTypeId: facilityTypeIds,
        facilityTypeId_op: 'in'
      },
      viewSize: facilityTypeIds.length,
      entityName: 'FacilityType',
      noConditionFind: 'Y',
      distinct: "Y",
      fieldList: ["facilityTypeId", "description"]
    }

    try {
      const resp = await UtilService.fetchFacilityTypeInformation(payload);

      if(!hasError(resp) && resp.data?.docs.length > 0) {
        resp.data.docs.map((facilityType: any) => { 
          facilityTypeDesc[facilityType.facilityTypeId] = facilityType['description'] 
        })

        commit(types.UTIL_FACILITY_TYPE_UPDATED, facilityTypeDesc)
      } else {
        throw resp.data;
      }
    } catch(err) {
      logger.error('Failed to fetch description for facility types', err)
    }
  },
  async fetchPaymentMethodTypeDesc({ commit, state }, paymentMethodTypeIds) {
    let paymentMethodTypeDesc = JSON.parse(JSON.stringify(state.paymentMethodTypeDesc))
    const cachedPaymentMethodTypeIds = Object.keys(paymentMethodTypeDesc);
    const ids = paymentMethodTypeIds.filter((paymentMethodTypeId: string) => !cachedPaymentMethodTypeIds.includes(paymentMethodTypeId))

    if(!ids.length) return paymentMethodTypeDesc;

    try {
      const payload = {
        "inputFields": {
          "paymentMethodTypeId": ids,
          "paymentMethodTypeId_op": "in"
        },
        "fieldList": ["paymentMethodTypeId", "description"],
        "entityName": "PaymentMethodType",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchPaymentMethodTypeDesc(payload);

      if(!hasError(resp)) {
        const paymentMethodResp = {} as any
        resp.data.docs.map((paymentMethodType: any) => {
          paymentMethodResp[paymentMethodType.paymentMethodTypeId] = paymentMethodType.description
        })

        paymentMethodTypeDesc = {
          ...paymentMethodTypeDesc,
          ...paymentMethodResp
        }

        commit(types.UTIL_PAYMENT_METHODS_UPDATED, paymentMethodTypeDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching payment method description', err)
    }

    return paymentMethodTypeDesc;
  },
  async fetchStatusDesc({ commit, state }, statusIds) {
    let statusDesc = JSON.parse(JSON.stringify(state.statusDesc))
    const cachedStatusIds = Object.keys(statusDesc);
    const ids = statusIds.filter((statusId: string) => !cachedStatusIds.includes(statusId))

    if(!ids.length) return statusDesc;

    try {
      const payload = {
        "inputFields": {
          "statusId": ids,
          "statusId_op": "in"
        },
        "fieldList": ["statusId", "description"],
        "entityName": "StatusItem",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchStatusDesc(payload);

      if(!hasError(resp)) {
        const statusResp = {} as any
        resp.data.docs.map((statusItem: any) => {
          statusResp[statusItem.statusId] = statusItem.description
        })

        statusDesc = {
          ...statusDesc,
          ...statusResp
        }

        commit(types.UTIL_STATUS_UPDATED, statusDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching status description', err)
    }

    return statusDesc;
  },

  async findProductStoreShipmentMethCount({ commit }) {
    let productStoreShipmentMethCount = 0
    const params = {
      "entityName": "ProductStoreShipmentMeth",
      "inputFields": {
        "partyId": "_NA_",
        "partyId_op": "notEqual",
        "roleTypeId": "CARRIER",
        "productStoreId": this.state.user.currentEComStore.productStoreId
      },
      "fieldList": ['roleTypeId', "partyId"],
      "viewSize": 1
    }

    try {
      const resp = await UtilService.findProductStoreShipmentMethCount(params);

      if(resp?.status == 200 && !hasError(resp) && resp.data.count) {
        productStoreShipmentMethCount = resp.data.count
      } else {
        throw resp?.data
      }
    } catch(err) {
      logger.error('Failed to find shipment method count for product store', err)
    }

    commit(types.UTIL_PRODUCT_STORE_SHIPMENT_METH_COUNT_UPDATED, productStoreShipmentMethCount)
  },
  
  async fetchRejectReasonEnumTypes({ commit, state }) {
    if(state.rejectReasonEnumTypes.length) {
      return;
    }

    let rejectReasonEnumTypes = [] as any;

    try {
      const payload = {
        "inputFields": {
          "parentTypeId": ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          "parentTypeId_op": "in"
        },
        "fieldList": ["description", "enumTypeId"],
        "entityName": "EnumerationType",
        "noConditionFind": "Y"
      }

      const resp = await UtilService.fetchRejectReasonEnumTypes(payload)
      if (!hasError(resp) && resp.data.count > 0) {
        rejectReasonEnumTypes = resp.data.docs
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error(err)
    }
    commit(types.UTIL_REJECT_REASON_ENUM_TYPES_UPDATED, rejectReasonEnumTypes)
  },

  async updateRejectReasons({ commit }, payload) {
    commit(types.UTIL_REJECT_REASONS_UPDATED, payload)
  },

  async getSecurityGroups({ commit, state }) {
    // Do not fetch security groups information if already available
    if(state.securityGroups.length) {
      return;
    }

    const payload = {
      entityName: "SecurityGroup",
      viewSize: 200,
      distinct: "Y",
      noConditionFind: "Y",
      fieldList: ["description", "groupId", "groupName"],
      inputFields: {
        groupTypeEnumId: "PRM_CLASS_TYPE",
        groupTypeEnumId_op: "notEqual"
      }
    }
    let securityGroups = []

    try {
      const resp = await UtilService.getSecurityGroups(payload)

      if(!hasError(resp)) {
        securityGroups = resp.data.docs
      } else {
        throw resp.data
      }
    } catch(error) {
      logger.error(error);
    }
    commit(types.UTIL_SECURITY_GROUPS_UPDATED, securityGroups);
  },

  async getPermissionsByGroup({ commit, state }, permissionIds) {
    let securityGroupsByPermission = state.securityGroupsByPermission

    try {
      const resp = await UtilService.getPermissionsByGroup({
        entityName: "SecurityGroupAndPermission",
        distinct: "Y",
        noConditionFind: "Y",
        filterByDate: "Y",
        viewSize: 250,  // TODO: need to check on viewSize as we are fetching groups for multiple permissions at once
        inputFields: {
          permissionId: permissionIds,
          permissionId_op: "in"
        }
      })

      if (!hasError(resp) && resp.data.docs.length) {
        securityGroupsByPermission = resp.data.docs.reduce((groups: any, group: any) => {
          if(group.permissionId) {
            groups[group.permissionId].push(group)
          }
          return groups;
        }, securityGroupsByPermission)
      } else {
        throw resp.data
      }
    } catch(error) {
      logger.error(error);
    }

    commit(types.UTIL_SECURITY_GROUPS_BY_PERMISSION_UPDATED, securityGroupsByPermission)
  },

  async getPermissions({ commit }, reasonIds) {
    const permissions = {} as any;

    try {
      const resp = await UtilService.getPermissions({
        entityName: "SecurityPermission",
        distinct: "Y",
        noConditionFind: "Y",
        fieldList: ["description", "permissionId"],
        viewSize: 250,
        inputFields: {
          permissionId: reasonIds,
          permissionId_op: "in"
        }
      })

      if (!hasError(resp) && resp.data.count) {
        resp.data.docs.map((permission: any) => {
          permissions[permission.permissionId] = []
        })
      } else {
        throw resp.data
      }
    } catch (error) {
      logger.error(error);
    }

    commit(types.UTIL_SECURITY_GROUPS_BY_PERMISSION_UPDATED, permissions)
  },

  async updatePermissionForRejectionReason({ commit, state }, { id, value }) {
    commit(types.UTIL_SECURITY_GROUPS_BY_PERMISSION_UPDATED, {
      ...state.securityGroupsByPermission,
      [id]: value
    })
  }
}

export default actions;